/**
 * YXWT.rangeData —— 面板与悬浮统计共用的“精确日期区间”加载和本地快照。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});
  const U = NS.util;
  const CONCURRENCY = 3;
  const FINISH_PAD_DAYS = 90;
  const dailyInFlight = Object.create(null);

  function fieldError(message) {
    const e = new Error(message);
    e.__yxwtField = true;
    return e;
  }

  function errText(e) {
    const raw = e && e.message ? String(e.message) : String(e || '未知错误');
    return raw === 'YXWT_NOT_LOGGED_IN' ? '未登录云效或登录已过期' : raw;
  }

  function rangeFromPrefs(prefs) {
    const key = (prefs && prefs.defaultRange) || 'thisWeek';
    const presets = U.rangePresets();
    let picked = presets.filter(function (p) { return p.key === key; })[0];
    if (!picked) picked = presets[2];
    return { key: picked.key, label: picked.label, start: picked.start, end: picked.end };
  }

  function currentMonthRange() {
    const presets = U.rangePresets();
    const picked = presets.filter(function (p) { return p.key === 'thisMonth'; })[0];
    return { key: picked.key, label: picked.label, start: picked.start, end: picked.end };
  }

  function localDayKey(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (!d || !isFinite(d.getTime())) return '';
    const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }

  function isSameLocalDay(a, b) {
    const ak = localDayKey(a);
    return !!ak && ak === localDayKey(b);
  }

  /**
   * @param prefs 当前偏好
   * @param override 调用方手上的实时选择 {includeSelf, memberIds}。
   *
   * 为什么要有 override：面板里改成员是「先改 state -> 异步落盘 -> 立刻 load」，
   * 这里若一律回读存储，就会读到还没写完的旧值，再把用户刚点的选择覆盖回去
   * （表现为：取消自己之后界面纹丝不动，非得手点一次「加载此区间」）。
   * 用户在界面上的选择才是权威，存储只是它的持久化副本。
   */
  async function resolve(prefs, override) {
    const ov = override || {};
    const ctx = await NS.detect.context();
    const orgId = String((ctx && ctx.orgId) || '');
    const memberIds = Array.isArray(ov.memberIds)
      ? ov.memberIds.slice()
      : (orgId ? await NS.store.getMembers(orgId) : []);
    const contacts = orgId ? await NS.store.getContacts(orgId) : {};
    const fieldMap = await NS.detect.fieldMap();
    if (!fieldMap) {
      throw fieldError('没探测到工时字段：云效里至少要有一个工作项，也可以到设置页手动指定字段 identifier。');
    }

    const missing = [];
    if (!fieldMap.estimated || !fieldMap.estimated.id) missing.push('预计工时');
    if (!fieldMap.actual || !fieldMap.actual.id) missing.push('实际工时');
    const fieldWarn = missing.length
      ? '未识别到「' + missing.join('」「') + '」字段，相关数字按 0 计算。可到设置页手动指定字段 identifier。'
      : '';

    const meId = String((ctx && ctx.userId) || '');
    if (!meId) throw new Error('未取到当前用户');
    let includeSelf = ov.includeSelf === undefined
      ? (!prefs || prefs.includeSelf !== false)
      : !!ov.includeSelf;
    const members = [];
    if (includeSelf) members.push({ id: meId, name: (ctx && ctx.name) || '我', self: true });
    (memberIds || []).forEach(function (id) {
      const uid = String(id || '');
      if (!uid || uid === meId) return;
      const c = contacts[uid] || {};
      members.push({ id: uid, name: c.name || uid });
    });
    // 本地状态如果意外变成“不含自己 + 没有同事”，兜回只看自己，避免发出空成员查询。
    if (!members.length) {
      includeSelf = true;
      members.push({ id: meId, name: (ctx && ctx.name) || '我', self: true });
    }

    return {
      ctx: ctx,
      prefs: prefs || {},
      includeSelf: includeSelf,
      memberIds: (memberIds || []).map(String),
      contacts: contacts || {},
      fieldMap: fieldMap,
      fieldWarn: fieldWarn,
      members: members
    };
  }

  function dateField(scope, dateBasis) {
    const basisKey = dateBasis === 'planStart' ? 'planStart' : 'planEnd';
    const field = scope && scope.fieldMap && scope.fieldMap[basisKey];
    if (!field || !field.id) {
      throw fieldError('没识别到「' + (basisKey === 'planStart' ? '计划开始时间' : '计划完成时间') + '」字段，请到设置页手动指定后重试。');
    }
    return field;
  }

  function cacheKey(scope, opts) {
    const o = opts || {};
    const fm = (scope && scope.fieldMap) || {};
    const fieldSig = ['estimated', 'actual', 'planStart', 'planEnd'].map(function (k) {
      return String((fm[k] && fm[k].id) || '');
    }).join(',');
    const members = ((scope && scope.members) || []).map(function (m) { return String(m.id); }).sort();
    return [
      'v1',
      String(scope && scope.ctx && scope.ctx.orgId || ''),
      members.join(','),
      String(o.dateBasis || 'planEnd'),
      String(o.start || ''),
      String(o.end || ''),
      o.excludeCancelled === false ? '0' : '1',
      fieldSig
    ].join('|');
  }

  async function readSnapshot(scope, opts) {
    dateField(scope, opts && opts.dateBasis);
    const key = cacheKey(scope, opts);
    const hit = await NS.store.getRangeSnapshot(key);
    if (!hit || !Array.isArray(hit.rows)) return null;
    hit.cacheKey = key;
    return hit;
  }

  async function fetchSnapshot(scope, opts) {
    const o = opts || {};
    const start = String(o.start || '');
    const end = String(o.end || '');
    const dateBasis = o.dateBasis || 'planEnd';
    if (!start || !end || start > end) throw new Error('统计日期范围无效');
    const field = dateField(scope, dateBasis);

    let qStart = start;
    let qEnd = end;
    if (dateBasis === 'finishTime') {
      qStart = U.toYMD(U.addDays(U.parseYMD(start), -FINISH_PAD_DAYS)) || start;
      qEnd = U.toYMD(U.addDays(U.parseYMD(end), FINISH_PAD_DAYS)) || end;
    }

    const members = scope.members || [];
    const loadedBy = {};
    const progress = function (done) {
      if (typeof o.onProgress !== 'function') return;
      let loaded = 0;
      Object.keys(loadedBy).forEach(function (id) { loaded += loadedBy[id] || 0; });
      o.onProgress({ done: done, total: members.length, loaded: loaded });
    };
    let done = 0;
    progress(done);

    const results = await U.pmap(members, function (m) {
      return NS.api.listWorkitems({
        spaceType: 'User',
        spaceIdentifier: m.id,
        scope: 'personal',
        category: '',
        conditionGroups: [[
          NS.api.cond.user('assignedTo', [m.id]),
          NS.api.cond.dateBetween(field.id, qStart, qEnd)
        ]],
        orderBy: { fieldIdentifier: field.id, order: 'desc', className: 'date', format: 'input' },
        pageSize: 200,
        maxPages: 20,
        onProgress: function (loaded) {
          loadedBy[m.id] = loaded || 0;
          progress(done);
        }
      }).then(function (res) {
        done++;
        progress(done);
        return res;
      });
    }, CONCURRENCY);

    const items = [];
    const seen = {};
    const memberErrors = [];
    let truncated = false;
    results.forEach(function (r, i) {
      if (!r || r.__error) {
        memberErrors.push({ name: members[i].name, error: errText(r && r.__error ? { message: r.__error } : null) });
        return;
      }
      if (r.truncated) truncated = true;
      (r.items || []).forEach(function (it) {
        const id = it && it.identifier;
        if (!id || seen[id]) return;
        seen[id] = true;
        items.push(it);
      });
    });
    if (memberErrors.length && memberErrors.length === members.length) {
      throw new Error(memberErrors[0].error);
    }

    let rows = NS.stats.normalize(items, scope.fieldMap, {
      dateBasis: dateBasis,
      excludeCancelled: o.excludeCancelled !== false
    }) || [];
    if (dateBasis === 'finishTime') {
      rows = rows.filter(function (r) { return r.date && r.date >= start && r.date <= end; });
    }

    const snapshot = {
      savedAt: isFinite(Number(o.now)) ? Number(o.now) : Date.now(),
      start: start,
      end: end,
      dateBasis: dateBasis,
      rows: rows,
      truncated: truncated,
      memberErrors: memberErrors
    };
    const key = cacheKey(scope, o);
    await NS.store.setRangeSnapshot(key, snapshot);
    snapshot.cacheKey = key;
    return snapshot;
  }

  /**
   * 每个“组织 + 成员 + 口径”的本月快照每天最多自动全量刷新一次。
   * 失败时保留旧快照，让调用方决定是继续显示旧数据还是报错；同页并发调用共用同一个 Promise。
   */
  function refreshThisMonthIfNeeded(scope, prefs, options) {
    const o = options || {};
    const range = currentMonthRange();
    const query = {
      start: range.start,
      end: range.end,
      dateBasis: (prefs && prefs.dateBasis) || 'planEnd',
      excludeCancelled: !prefs || prefs.excludeCancelled !== false
    };
    const key = cacheKey(scope, query);
    if (dailyInFlight[key]) return dailyInFlight[key];

    const now = isFinite(Number(o.now)) ? Number(o.now) : Date.now();
    const task = readSnapshot(scope, query).then(function (hit) {
      if (hit && isSameLocalDay(hit.savedAt, now)) {
        return { range: range, query: query, snapshot: hit, refreshed: false, error: null };
      }
      return fetchSnapshot(scope, Object.assign({}, query, {
        now: now,
        onProgress: o.onProgress
      })).then(function (snapshot) {
        return { range: range, query: query, snapshot: snapshot, refreshed: true, error: null };
      }, function (error) {
        return { range: range, query: query, snapshot: hit || null, refreshed: false, error: error };
      });
    });

    dailyInFlight[key] = task;
    task.then(function () { delete dailyInFlight[key]; }, function () { delete dailyInFlight[key]; });
    return task;
  }

  NS.rangeData = {
    FINISH_PAD_DAYS: FINISH_PAD_DAYS,
    rangeFromPrefs: rangeFromPrefs,
    currentMonthRange: currentMonthRange,
    isSameLocalDay: isSameLocalDay,
    resolve: resolve,
    cacheKey: cacheKey,
    readSnapshot: readSnapshot,
    fetchSnapshot: fetchSnapshot,
    refreshThisMonthIfNeeded: refreshThisMonthIfNeeded
  };
})();
