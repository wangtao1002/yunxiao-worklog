(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  // ---------------------------------------------------------------------------
  // 匹配规则常量
  // ---------------------------------------------------------------------------

  // 工时一定是数值型字段，先把候选池收窄到这三类 className
  // 面向所有企业发布，字段名的写法各家不同：简体、繁体（工時/實際）、英文都要认。
  // 繁体不是可选项——台港团队和云效繁体界面下字段名就是「預計工時」，漏了插件对他们直接失效。
  const NUMERIC_CLASSES = { float: true, number: true, integer: true };

  const RE_EST = /(预计|預計|预估|預估|计划|計劃|计畫|計畫|估算|estimated?|planned?)/i;
  const RE_ACT = /(实际|實際|登记|登記|真实|真實|已用|actual|spent|logged)/i;
  const RE_UNIT = /(工[时時]|小[时時]|hours?)/i;
  const RE_LABOR = /工[时時]/;
  const RE_HOUR = /(小[时時]|hours?)/i;
  const RE_PLAN_START = /(计划开始|計劃開始|开始时间|開始時間|start)/i;
  const RE_PLAN_END = /(计划完成|計劃完成|计划结束|計劃結束|截止|due|end)/i;

  // sumPlanedLaborHour / sumActualLaborHour 这类是只读汇总（rollup），写不进也统计不准
  const RE_SUMMARY_ID = /^sum/i;

  // 第一条工作项所属类型里可能压根没配工时字段，最多再往后试几条。
  // 取样时按 workitemTypeIdentifier 去重（需求/任务/缺陷各配的字段不一样），
  // 避免最近 N 条恰好全是同一种类型、而那种类型没有工时字段。
  const SAMPLE_LIMIT = 6;
  const SAMPLE_POOL = 50;              // 从最近这么多条里挑样本
  const PARTIAL_TTL_MS = 24 * 60 * 60 * 1000;   // 只探到一半的映射最多复用 1 天
  const RETRY_MIN_MS = 5 * 60 * 1000;           // 重探失败后的最短再试间隔（本进程内）

  // ---------------------------------------------------------------------------
  // 小工具
  // ---------------------------------------------------------------------------

  function api() {
    return NS.api;
  }

  function store() {
    return NS.store;
  }

  function str(v) {
    return v === null || v === undefined ? '' : String(v);
  }

  // 云效里先建的字段 identifier 数值更小，同分时优先取它；非数值 id 排到最后
  function idOrder(id) {
    return /^\d+$/.test(id) ? Number(id) : Number.MAX_SAFE_INTEGER;
  }

  // getFieldMeta 已做过一层归一，这里再兜一次别的形状，并按 id 去重
  function normalizeMeta(metaList) {
    const out = [];
    const seen = Object.create(null);
    if (!Array.isArray(metaList)) return out;
    for (let i = 0; i < metaList.length; i++) {
      const raw = metaList[i];
      if (!raw || typeof raw !== 'object') continue;
      const id = str(raw.id || raw.identifier || raw.fieldIdentifier).trim();
      const name = str(raw.name || raw.displayName || raw.label).trim();
      if (!id || !name) continue;
      if (seen[id]) continue;
      if (RE_SUMMARY_ID.test(id)) continue; // 排除 sum* 汇总字段
      seen[id] = true;
      out.push({
        id: id,
        name: name,
        className: str(raw.className || raw.fieldClassName).toLowerCase(),
        format: str(raw.format || raw.fieldFormat),
        type: str(raw.type || raw.fieldType),
        index: out.length
      });
    }
    return out;
  }

  function pick(field) {
    return field ? { id: field.id, name: field.name } : null;
  }

  // 分数高者胜；同分取 identifier 数值更小的；再同则取出现更早的
  function better(a, b) {
    if (!b) return true;
    if (a.score !== b.score) return a.score > b.score;
    const ao = idOrder(a.field.id);
    const bo = idOrder(b.field.id);
    if (ao !== bo) return ao < bo;
    return a.field.index < b.field.index;
  }

  function bestOf(fields, scoreFn) {
    let win = null;
    for (let i = 0; i < fields.length; i++) {
      const score = scoreFn(fields[i]);
      if (score < 0) continue;
      const cur = { field: fields[i], score: score };
      if (better(cur, win)) win = cur;
    }
    return win ? win.field : null;
  }

  // 工时字段打分：前缀词 +2，'工时/工時' +2，'小时/小時/hours' +1，SystemCustomField +1
  function scoreHour(field, roleRe) {
    if (!NUMERIC_CLASSES[field.className]) return -1;
    if (!roleRe.test(field.name)) return -1;
    if (!RE_UNIT.test(field.name)) return -1;
    let score = 2;
    if (RE_LABOR.test(field.name)) score += 2;
    if (RE_HOUR.test(field.name)) score += 1;
    if (field.type === 'SystemCustomField') score += 1;
    return score;
  }

  // 日期字段没有单位词可打分，用「精确短语 > 泛词」+ SystemCustomField 兜同分
  function scoreDate(field, strongRe, looseRe) {
    if (field.className !== 'date') return -1;
    if (!looseRe.test(field.name)) return -1;
    let score = strongRe.test(field.name) ? 2 : 1;
    if (field.type === 'SystemCustomField') score += 1;
    return score;
  }

  // ---------------------------------------------------------------------------
  // 纯函数：字段匹配
  // ---------------------------------------------------------------------------

  function matchFields(metaList) {
    const fields = normalizeMeta(metaList);

    let est = bestOf(fields, function (f) {
      return scoreHour(f, RE_EST);
    });
    let act = bestOf(fields, function (f) {
      return scoreHour(f, RE_ACT);
    });

    // 极端情况下同一个字段名同时命中两组词，保证预计/实际不指向同一字段
    if (est && act && est.id === act.id) {
      const estScore = scoreHour(est, RE_EST);
      const actScore = scoreHour(act, RE_ACT);
      const dup = est;
      if (estScore >= actScore) {
        act = bestOf(fields.filter(function (f) { return f.id !== dup.id; }), function (f) {
          return scoreHour(f, RE_ACT);
        });
      } else {
        est = bestOf(fields.filter(function (f) { return f.id !== dup.id; }), function (f) {
          return scoreHour(f, RE_EST);
        });
      }
    }

    // 退化：任一没命中，就拿所有名字含「工时」的 float 字段按 identifier 升序顶上
    let lowConfidence = false;
    if (!est || !act) {
      const pool = fields
        .filter(function (f) {
          return NUMERIC_CLASSES[f.className] && RE_LABOR.test(f.name);
        })
        .sort(function (a, b) {
          const d = idOrder(a.id) - idOrder(b.id);
          return d !== 0 ? d : a.index - b.index;
        });
      if (pool.length) {
        if (!est) {
          est = pool.filter(function (f) { return !act || f.id !== act.id; })[0] || null;
          if (est) lowConfidence = true;
        }
        if (!act) {
          act = pool.filter(function (f) { return !est || f.id !== est.id; })[0] || null;
          if (act) lowConfidence = true;
        }
      }
    }

    const planStart = bestOf(fields, function (f) {
      return scoreDate(f, /(计划开始)/, RE_PLAN_START);
    });
    const planEnd = bestOf(fields, function (f) {
      // 开始时间字段可能同时含 start/end 之外的词，先占走 planStart 的不再参选
      if (planStart && f.id === planStart.id) return -1;
      return scoreDate(f, /(计划完成|计划结束|截止)/, RE_PLAN_END);
    });

    return {
      estimated: pick(est),
      actual: pick(act),
      planStart: pick(planStart),
      planEnd: pick(planEnd),
      lowConfidence: lowConfidence
    };
  }

  function isUsable(map) {
    return !!(map && (map.estimated || map.actual || map.planStart || map.planEnd));
  }

  // 「完整」= 预计 + 实际都探到了。只探到日期字段的半成品映射也满足 isUsable，
  // 但不能当成最终答案永久缓存，否则首次刚好抽到没配工时字段的工作项就被钉死在 0h。
  function isComplete(map) {
    return !!(map && map.estimated && map.estimated.id && map.actual && map.actual.id);
  }

  function isFresh(map, ttl) {
    const t = Number(map && map.detectedAt) || 0;
    return t > 0 && (Date.now() - t) < ttl;
  }

  // ---------------------------------------------------------------------------
  // context()：身份与组织，内存缓存 + store 兜底
  // ---------------------------------------------------------------------------

  let ctxCache = null;
  let ctxPending = null;
  let ctxStaleAt = 0;                     // 降级身份是什么时候顶上来的
  const STALE_RETRY_MS = 60 * 1000;       // 降级身份最多复用这么久，之后重试真实身份

  // 从当前页面便宜地推断组织 id（location.href 优先，再扫 DOM），推不出返回 ''
  function pageOrgIdHint() {
    try {
      const fn = api() && api().orgIdFromDom;
      return typeof fn === 'function' ? str(fn()) : '';
    } catch (e) {
      return '';
    }
  }

  /**
   * 读降级用的身份缓存。缓存按组织分桶，能推断出当前组织时只认那一桶；
   * 推不出组织时才退回「最后一次成功的身份」，并统一打上 stale 标记——
   * 拿着 A 组织的身份去读写 B 组织的工作项会用错工时字段 id，写入路径必须能识别出来。
   */
  async function readCachedContext() {
    const hint = pageOrgIdHint();
    try {
      const c = await store().getContext(hint);
      if (!c || !c.userId) return null;
      // 明确推断出了当前组织，缓存却是别的组织的 —— 宁可报错让用户重新登录，也不能顶上来
      if (hint && str(c.orgId) !== hint) return null;
      c.stale = true;
      return c;
    } catch (e) {
      return null;
    }
  }

  async function fetchContext() {
    const me = await api().me();
    const ctx = {
      userId: str(me && me.userId),
      name: str(me && me.name),
      avatar: str(me && me.avatar),
      orgId: str(me && me.orgId),
      orgName: ''
    };
    if (ctx.orgId) {
      try {
        const org = await api().getOrg(ctx.orgId);
        ctx.orgName = str(org && org.name);
      } catch (e) {
        // 组织名只影响标题展示，取不到不算失败
      }
    }
    if (!ctx.orgName && ctx.orgId) {
      try {
        const cached = await store().getContext(ctx.orgId);
        if (cached && cached.orgName) ctx.orgName = cached.orgName;
      } catch (e) {
        // 组织名只影响标题展示
      }
    }
    try {
      await store().setContext(ctx);
    } catch (e) {
      // 写缓存失败不影响本次使用
    }
    return ctx;
  }

  function context(force) {
    // 降级身份（stale）只短暂复用：它会强制面板进入只读预演，网络恢复后必须能自己走出来，
    // 不能因为内存里缓存了一份就一直卡在降级态。
    const staleExpired = ctxCache && ctxCache.stale &&
      (Date.now() - ctxStaleAt) >= STALE_RETRY_MS;
    if (!force && ctxCache && !staleExpired) return Promise.resolve(ctxCache);
    if (ctxPending) return ctxPending;
    ctxPending = fetchContext().then(
      function (ctx) {
        ctxPending = null;
        ctxCache = ctx;
        ctxStaleAt = 0;
        return ctx;
      },
      async function (err) {
        ctxPending = null;
        // 断网/接口抖动时退回上次成功的身份，彻底没有才把错误抛给 UI 提示
        const cached = await readCachedContext();
        if (cached) {
          ctxCache = cached;
          ctxStaleAt = Date.now();
          return cached;
        }
        // 连缓存都不敢用（组织对不上）时，让错误浮到 UI，提示重新登录
        ctxCache = null;
        throw err;
      }
    );
    return ctxPending;
  }

  // ---------------------------------------------------------------------------
  // fieldMap()：探测 + 缓存
  // ---------------------------------------------------------------------------

  // 取自己名下最近的工作项当探测样本：先按工作项类型各取一条，再用剩下的补齐，
  // 这样「最近 3 条恰好都是需求（没配工时字段）」不会把探测结果打成半成品
  async function sampleWorkitemIds(userId) {
    const res = await api().listWorkitems({
      spaceType: 'User',
      spaceIdentifier: userId,
      scope: 'personal',
      category: '',
      conditionGroups: [[]],
      pageSize: SAMPLE_POOL,
      maxPages: 1
    });
    const items = (res && res.items) || [];
    const firstOfType = [];
    const rest = [];
    const seenType = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const id = str(it && it.identifier);
      if (!id) continue;
      const type = str(it && (it.workitemTypeIdentifier ||
        (it.workitemType && it.workitemType.identifier) || it.categoryIdentifier));
      const key = type || '__unknown__';
      if (!Object.prototype.hasOwnProperty.call(seenType, key)) {
        seenType[key] = 1;
        firstOfType.push(id);
      } else {
        rest.push(id);
      }
    }
    return firstOfType.concat(rest).slice(0, SAMPLE_LIMIT);
  }

  // 返回 FieldMap 或 null（一条工作项都没有 / 样本里没有可用字段）
  async function detectFieldMap(ctx) {
    const ids = await sampleWorkitemIds(ctx.userId);
    if (!ids.length) return null;

    let fallback = null;
    for (let i = 0; i < ids.length; i++) {
      let meta;
      try {
        meta = await api().getFieldMeta(ids[i]);
      } catch (e) {
        continue;
      }
      const map = matchFields(meta);
      // 不同工作项类型配的字段不一样，第一条没配工时就再看下一条
      if (map.estimated && map.actual) return map;
      if (!fallback && isUsable(map)) fallback = map;
    }
    return fallback;
  }

  let fmPending = null;
  let fmPendingKey = '';
  let lastDetectAt = 0;

  async function loadFieldMap(force) {
    const ctx = await context();
    const orgId = ctx.orgId;
    let cached = null;
    try {
      cached = await store().getFieldMap(orgId);
    } catch (e) {
      cached = null;
    }

    // 手动指定过的映射永不被探测覆盖，force 也不行
    if (cached && cached.manual) return cached;
    // 完整映射直接命中缓存；只探到一半的「部分映射」最多复用 PARTIAL_TTL_MS，
    // 之后自动重探一次，免得用户永远卡在「预计/实际 0h」还得自己去设置页点重新探测
    if (!force && isUsable(cached) && (isComplete(cached) || isFresh(cached, PARTIAL_TTL_MS))) {
      return cached;
    }
    // 重探失败（比如名下暂时一条工作项都没有）时不要每次调用都打接口，本进程内节流
    if (!force && isUsable(cached) && (Date.now() - lastDetectAt) < RETRY_MIN_MS) {
      return cached;
    }

    let detected = null;
    lastDetectAt = Date.now();
    try {
      detected = await detectFieldMap(ctx);
    } catch (e) {
      if (isUsable(cached)) return cached;
      throw e;
    }
    if (!detected) return isUsable(cached) ? cached : null;

    // 自动重探时只补不减：这次没探到的字段沿用上次探到的，避免样本抽样波动把已有映射抹掉。
    // force（用户在设置页点「重新探测」）是要一份干净结果，不做合并。
    const keep = (!force && isUsable(cached)) ? cached : null;
    const pickField = function (k) {
      return detected[k] || (keep ? keep[k] : null) || null;
    };
    const map = {
      estimated: pickField('estimated'),
      actual: pickField('actual'),
      planStart: pickField('planStart'),
      planEnd: pickField('planEnd'),
      lowConfidence: !!detected.lowConfidence,
      detectedAt: Date.now(),
      manual: false
    };
    try {
      await store().setFieldMap(orgId, map);
    } catch (e) {
      // 存不下也先把探测结果给出去
    }
    return map;
  }

  function fieldMap(force) {
    const key = force ? 'force' : 'normal';
    if (fmPending && fmPendingKey === key) return fmPending;
    fmPendingKey = key;
    fmPending = loadFieldMap(force).then(
      function (map) {
        fmPending = null;
        return map;
      },
      function (err) {
        fmPending = null;
        throw err;
      }
    );
    return fmPending;
  }

  // ---------------------------------------------------------------------------
  // describe()：给设置页/面板展示的中文说明
  // ---------------------------------------------------------------------------

  function fieldText(field) {
    return field ? '「' + field.name + '」#' + field.id : '未识别';
  }

  function whenText(ts) {
    if (!ts) return '';
    try {
      if (NS.util && typeof NS.util.toYMD === 'function') return NS.util.toYMD(ts);
      return new Date(ts).toLocaleDateString('zh-CN');
    } catch (e) {
      return '';
    }
  }

  function describe(map) {
    if (!map) return '未探测到字段映射，请确认云效里至少有一个工作项，或到设置页手动指定字段 identifier。';

    const head = map.manual ? '字段映射（手动指定）' : '字段映射（自动探测' + (whenText(map.detectedAt) ? '于 ' + whenText(map.detectedAt) : '') + '）';
    const parts = [
      '预计工时 = ' + fieldText(map.estimated),
      '实际工时 = ' + fieldText(map.actual),
      '计划开始 = ' + fieldText(map.planStart),
      '计划完成 = ' + fieldText(map.planEnd)
    ];

    let tail = '';
    if (!map.manual && map.lowConfidence) {
      tail = ' 注意：本次为退化匹配，置信度较低，建议到设置页核对后手动指定。';
    } else if (!map.estimated || !map.actual) {
      tail = ' 注意：工时字段未完全识别，相关统计会按 0 计算，建议到设置页手动指定。';
    }

    return head + '：' + parts.join('；') + '。' + tail;
  }

  // 设置页「重新探测」时清掉内存缓存，避免拿到旧身份
  function clearCache() {
    ctxCache = null;
    ctxPending = null;
    ctxStaleAt = 0;
    fmPending = null;
    fmPendingKey = '';
    lastDetectAt = 0;
  }

  NS.detect = {
    context: context,
    fieldMap: fieldMap,
    matchFields: matchFields,
    describe: describe,
    clearCache: clearCache
  };
})();
