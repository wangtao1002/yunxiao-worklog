(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  // stats.js 是纯计算模块：不碰 DOM、不发请求、不用 chrome API。
  // util.js 在加载顺序上排在前面，但为了能脱离宿主环境单测，这里对用到的
  // 几个小工具都保留了本地实现，优先复用 util 的版本。
  const U = NS.util || {};

  const MAX_DAYS = 400;
  const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const BASE_URL = 'https://devops.aliyun.com/projex/project/';
  const CSV_HEADER = [
    '编号', '标题', '项目', '类别', '状态', '负责人',
    '预计工时', '实际工时', '计划开始', '计划完成', '实际完成', '链接'
  ];
  const GROUP_LABELS = {
    project: '项目',
    category: '类别',
    status: '状态',
    stage: '阶段',
    assignee: '成员'
  };

  function pad2(n) {
    if (typeof U.pad2 === 'function') return U.pad2(n);
    return (n < 10 ? '0' : '') + n;
  }

  function toYMD(d) {
    if (typeof U.toYMD === 'function') return U.toYMD(d);
    const date = d instanceof Date ? d : new Date(d);
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function parseYMD(ymd) {
    if (typeof U.parseYMD === 'function') return U.parseYMD(ymd);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function isWeekendYMD(ymd) {
    if (typeof U.isWeekend === 'function') return !!U.isWeekend(ymd);
    const d = parseYMD(ymd);
    if (!d) return false;
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  }

  function daysBetween(startYMD, endYMD) {
    if (typeof U.daysBetween === 'function') return U.daysBetween(startYMD, endYMD) || [];
    const s = parseYMD(startYMD);
    const e = parseYMD(endYMD);
    if (!s || !e || s.getTime() > e.getTime()) return [];
    const out = [];
    const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    while (cur.getTime() <= e.getTime() && out.length < MAX_DAYS) {
      out.push(toYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  function fmtHours(n) {
    if (typeof U.fmtHours === 'function') return U.fmtHours(n);
    const v = round1(toNum(n));
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  // 浮点求和会积出 0.30000000000000004 这类噪声，统计口径统一收到 2 位小数
  function round2(n) {
    const v = Number(n);
    if (!isFinite(v)) return 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  function round1(n) {
    const v = Number(n);
    if (!isFinite(v)) return 0;
    return Math.round((v + Number.EPSILON) * 10) / 10;
  }

  // 工时字段的 value 是字符串（'2'、'2.5'），空字符串 / 非数字一律按 0
  function toNum(v) {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  function str(v) {
    return v === null || v === undefined ? '' : String(v);
  }

  // customFields 里没值的字段是整条缺失，不是 value:null，取值必须做存在性判断
  function indexCustomFields(item) {
    const map = Object.create(null);
    const list = item && Array.isArray(item.customFields) ? item.customFields : [];
    for (let i = 0; i < list.length; i++) {
      const cf = list[i];
      if (!cf || cf.fieldIdentifier === null || cf.fieldIdentifier === undefined) continue;
      map[String(cf.fieldIdentifier)] = cf;
    }
    return map;
  }

  function cfValue(cfMap, fieldId) {
    if (!fieldId) return undefined;
    const cf = cfMap[String(fieldId)];
    if (!cf) return undefined;
    return cf.value;
  }

  function fieldId(fieldMap, key) {
    const f = fieldMap && fieldMap[key];
    if (!f || f.id === null || f.id === undefined || f.id === '') return null;
    return String(f.id);
  }

  // 日期自定义字段形如 '2026-08-28 00:00:00'，也兼容纯日期串和毫秒时间戳
  function toYMDFromFieldValue(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return tsToYMD(v);
    const s = String(v).trim();
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return m[1] + '-' + pad2(Number(m[2])) + '-' + pad2(Number(m[3]));
    if (/^\d{10,13}$/.test(s)) return tsToYMD(Number(s));
    return null;
  }

  function tsToYMD(ts) {
    const n = Number(ts);
    if (!isFinite(n) || n <= 0) return null;
    const d = new Date(n);
    if (isNaN(d.getTime())) return null;
    return toYMD(d);
  }

  // 当天 23:59:59.999 的本地时间戳（跨夏令时也不会偏，靠 Date 构造而非加 86400000）
  function endOfDayTs(ymd) {
    const d = parseYMD(ymd);
    if (!d) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  }

  function urlSegment(categoryIdentifier) {
    const c = str(categoryIdentifier).toLowerCase();
    if (c === 'req') return 'req';
    if (c === 'bug') return 'bug';
    return 'task';
  }

  function normalize(items, fieldMap, opts) {
    const list = Array.isArray(items) ? items : [];
    const o = opts || {};
    const basis = o.dateBasis === 'finishTime' || o.dateBasis === 'planStart' ? o.dateBasis : 'planEnd';
    const excludeCancelled = !!o.excludeCancelled;

    const estId = fieldId(fieldMap, 'estimated');
    const actId = fieldId(fieldMap, 'actual');
    const startId = fieldId(fieldMap, 'planStart');
    const endId = fieldId(fieldMap, 'planEnd');

    const rows = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') continue;

      const cfMap = indexCustomFields(item);
      const space = item.space || null;
      const projectId = (space && space.identifier) || item.spaceIdentifier || null;
      const status = item.status || null;
      const statusStage = item.statusStage || null;
      const workflowStage = (status && status.workflowStage) || null;
      const assignedTo = item.assignedTo || null;

      const statusName = str(status && status.name);
      const stageName = str((statusStage && statusStage.name) || (workflowStage && workflowStage.name));
      const rawStageId = statusStage && statusStage.id !== undefined && statusStage.id !== null
        ? statusStage.id
        : (status ? status.stageId : null);
      const stageId = rawStageId === null || rawStageId === undefined || rawStageId === ''
        ? null
        : Number(rawStageId);

      const id = str(item.identifier);
      // 云效对没填的自定义字段是整条不返回（不是 value:null），所以「字段缺失」和
      // 「填了 0」在数值上都会落成 0，只有这里能把两者分开，供提示文案用。
      const estRaw = cfValue(cfMap, estId);
      const estBlank = estRaw === undefined || estRaw === null || String(estRaw).trim() === '';
      const planStart = toYMDFromFieldValue(cfValue(cfMap, startId));
      const planEnd = toYMDFromFieldValue(cfValue(cfMap, endId));
      const finishTime = tsToYMD(item.finishTime);

      const isCancelled = statusName.indexOf('取消') >= 0;
      if (excludeCancelled && isCancelled) continue;

      let date = null;
      if (basis === 'finishTime') date = finishTime;
      else if (basis === 'planStart') date = planStart;
      else date = planEnd;

      rows.push({
        id: id,
        sn: str(item.serialNumber),
        subject: str(item.subject),
        projectId: projectId ? String(projectId) : null,
        project: str(space && space.name) || '(无项目)',
        category: str(item.category && item.category.name) || str(item.categoryIdentifier),
        status: statusName,
        stage: stageName,
        stageId: stageId !== null && isFinite(stageId) ? stageId : null,
        assigneeId: assignedTo && assignedTo.identifier ? String(assignedTo.identifier) : null,
        assignee: str(
          (assignedTo && (assignedTo.displayName || assignedTo.realName || assignedTo.nickName)) || ''
        ),
        avatar: str(assignedTo && assignedTo.avatar),
        est: round2(toNum(cfValue(cfMap, estId))),
        act: round2(toNum(cfValue(cfMap, actId))),
        // 预计工时字段识别出来了、但这个工作项上没有这个字段的值
        estMissing: !!estId && estBlank,
        planStart: planStart,
        planEnd: planEnd,
        finishTime: finishTime,
        date: date,
        isCancelled: isCancelled,
        // 真正完成只认云效原生的 finishTime：状态名各企业叫法不同，
        // 像「开发完成」只是开发阶段的一个状态，任务并没结束（云效自己仍标它逾期）。
        isDone: !!finishTime,
        // 状态名看起来像完成，仅供展示用，不参与逾期判定
        looksDone: statusName.indexOf('完成') >= 0 || stageName.indexOf('完成') >= 0,
        url: projectId && id ? BASE_URL + projectId + '/' + urlSegment(item.categoryIdentifier) + '/' + id : null
      });
    }
    return rows;
  }

  function summarize(rows) {
    const list = Array.isArray(rows) ? rows : [];
    let est = 0;
    let act = 0;
    const dateSet = Object.create(null);
    let days = 0;
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      est += toNum(r.est);
      act += toNum(r.act);
      if (r.date && !dateSet[r.date]) {
        dateSet[r.date] = true;
        days += 1;
      }
    }
    est = round2(est);
    act = round2(act);
    return {
      count: list.length,
      est: est,
      act: act,
      diff: round2(act - est),
      days: days,
      // avgPerDay 历史上一直是「预计」口径，保持不变；实际口径另给一个，
      // 免得调用方自己算一遍还算错除零
      avgPerDay: days > 0 ? round2(est / days) : 0,
      avgPerDayAct: days > 0 ? round2(act / days) : 0
    };
  }

  /**
   * 设置里的任务状态范围只影响本地统计，不参与接口查询和快照键。
   * “已完成”严格沿用 normalize 产出的 isDone（云效原生 finishTime）。
   */
  function filterByTaskScope(rows, scope) {
    const list = Array.isArray(rows) ? rows : [];
    if (scope !== 'completed') return list.slice();
    return list.filter(function (row) { return !!(row && row.isDone); });
  }

  /** 工作日目标偏差使用的有效工时合计。max 是逐任务取较大值，不是对两个总数取较大值。 */
  function workHoursTotal(rows, basis) {
    const list = Array.isArray(rows) ? rows : [];
    const mode = basis === 'estimated' || basis === 'actual' ? basis : 'max';
    let total = 0;
    for (let i = 0; i < list.length; i++) {
      const row = list[i] || {};
      const est = toNum(row.est);
      const act = toNum(row.act);
      total += mode === 'estimated' ? est : (mode === 'actual' ? act : Math.max(est, act));
    }
    return round2(total);
  }

  function groupKeyOf(row, key) {
    if (key === 'project') {
      return { key: row.projectId || row.project || '(无项目)', label: row.project || '(无项目)' };
    }
    if (key === 'assignee') {
      return { key: row.assigneeId || row.assignee || '(未指派)', label: row.assignee || '(未指派)' };
    }
    if (key === 'category') return { key: row.category || '(未分类)', label: row.category || '(未分类)' };
    if (key === 'status') return { key: row.status || '(无状态)', label: row.status || '(无状态)' };
    if (key === 'stage') return { key: row.stage || '(无阶段)', label: row.stage || '(无阶段)' };
    return { key: '(全部)', label: '(全部)' };
  }

  function groupBy(rows, key, basis) {
    const list = Array.isArray(rows) ? rows : [];
    const map = Object.create(null);
    const order = [];
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      const k = groupKeyOf(r, key);
      const id = String(k.key);
      if (!map[id]) {
        map[id] = { key: id, label: k.label, count: 0, est: 0, act: 0 };
        order.push(id);
      }
      const g = map[id];
      g.count += 1;
      g.est += toNum(r.est);
      g.act += toNum(r.act);
    }
    const out = order.map(function (id) {
      const g = map[id];
      g.est = round2(g.est);
      g.act = round2(g.act);
      return g;
    });
    // 主工时降序 → count 降序 → label 升序（最后一档只为结果稳定，避免同分时顺序随机）。
    // basis='act' 时按实际排，其余按预计排：用实际工时统计的团队，按预计排出来的顺序没意义。
    const useAct = basis === 'act';
    out.sort(function (a, b) {
      const av = useAct ? a.act : a.est;
      const bv = useAct ? b.act : b.est;
      if (bv !== av) return bv - av;
      if (b.count !== a.count) return b.count - a.count;
      return String(a.label).localeCompare(String(b.label), 'zh-Hans-CN');
    });
    return out;
  }

  function byDay(rows, startYMD, endYMD, opts) {
    const list = Array.isArray(rows) ? rows : [];
    const o = opts || {};
    const target = o.dailyTargetHours === null || o.dailyTargetHours === undefined
      ? 8
      : toNum(o.dailyTargetHours);

    const bucket = Object.create(null);
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      if (!r.date) continue;
      if (!bucket[r.date]) bucket[r.date] = { count: 0, est: 0, act: 0 };
      const b = bucket[r.date];
      b.count += 1;
      b.est += toNum(r.est);
      b.act += toNum(r.act);
    }

    const days = daysBetween(startYMD, endYMD);
    return days.map(function (ymd) {
      const b = bucket[ymd] || { count: 0, est: 0, act: 0 };
      const d = parseYMD(ymd);
      const dow = d ? d.getDay() : 0;
      const weekend = isWeekendYMD(ymd);
      const workday = typeof o.isWorkday === 'function' ? o.isWorkday(ymd) !== false : !weekend;
      const dayTarget = workday ? target : 0;
      const est = round2(b.est);
      return {
        ymd: ymd,
        dow: dow,
        weekday: WEEKDAY_LABELS[dow],
        isWeekend: weekend,
        isWorkday: workday,
        count: b.count,
        est: est,
        act: round2(b.act),
        target: dayTarget,
        deficit: round2(Math.max(0, dayTarget - est))
      };
    });
  }

  function byMember(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const map = Object.create(null);
    const order = [];
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      const id = String(r.assigneeId || r.assignee || '(未指派)');
      if (!map[id]) {
        map[id] = {
          id: r.assigneeId || null,
          key: id,
          label: r.assignee || '(未指派)',
          name: r.assignee || '(未指派)',
          avatar: r.avatar || '',
          count: 0,
          est: 0,
          act: 0,
          diff: 0,
          days: 0,
          _dates: Object.create(null)
        };
        order.push(id);
      }
      const m = map[id];
      m.count += 1;
      m.est += toNum(r.est);
      m.act += toNum(r.act);
      if (r.date && !m._dates[r.date]) {
        m._dates[r.date] = true;
        m.days += 1;
      }
      if (!m.avatar && r.avatar) m.avatar = r.avatar;
    }
    const out = order.map(function (id) {
      const m = map[id];
      delete m._dates;
      m.est = round2(m.est);
      m.act = round2(m.act);
      m.diff = round2(m.act - m.est);
      return m;
    });
    out.sort(function (a, b) {
      if (b.est !== a.est) return b.est - a.est;
      if (b.count !== a.count) return b.count - a.count;
      return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
    });
    return out;
  }

  function overdue(rows, nowTs) {
    const list = Array.isArray(rows) ? rows : [];
    const now = nowTs === null || nowTs === undefined ? Date.now() : Number(nowTs);
    const result = { total: 0, overdue: 0, rate: 0, list: [] };
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      // 没有计划完成时间的、已取消的，都不算逾期也不计入分母
      if (!r.planEnd || r.isCancelled) continue;
      result.total += 1;
      let late = false;
      if (r.finishTime) {
        // 真正完成（云效给了 finishTime）：看实际完成日是否晚于计划完成日
        // 都是 YYYY-MM-DD，可直接字符串比较
        late = r.finishTime > r.planEnd;
      } else {
        // 没有 finishTime 就是没结束 —— 哪怕状态叫「开发完成」也一样，
        const deadline = endOfDayTs(r.planEnd);
        late = deadline !== null && isFinite(now) && now > deadline;
      }
      if (late) {
        result.overdue += 1;
        result.list.push(r);
      }
    }
    result.rate = result.total > 0 ? round1((result.overdue / result.total) * 100) : 0;
    return result;
  }

  // 「没标记工时」= 该口径下的工时 <= 0：字段整条没值和明确填了 0 都算，
  // 两者都得补一个真实数字，统计上没有区别。已取消的任务不提示——跟逾期口径一致，
  // 取消掉的任务再去补工时没有意义。
  //
  // basis: 'est'（默认）/ 'act' / 'both'。'both' 表示两个字段都要用，
  // 所以任一为空就算没填全 —— 缺哪个都会让那一套统计失真。
  function isMissingHours(row, basis) {
    if (!row || row.isCancelled) return false;
    const b = basis === 'act' || basis === 'both' ? basis : 'est';
    if (b === 'est') return toNum(row.est) <= 0;
    if (b === 'act') return toNum(row.act) <= 0;
    return toNum(row.est) <= 0 || toNum(row.act) <= 0;
  }

  // 调用方必须先确认对应字段已识别：字段没识别出来时那一列全是 0，
  // 这里会把整张表判成未填，那是字段映射问题，不是漏填。
  function missingHours(rows, basis) {
    const list = Array.isArray(rows) ? rows : [];
    const out = { count: 0, total: 0, rate: 0, list: [], est: 0, act: 0 };
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      if (r.isCancelled) continue;
      out.total += 1;
      // 分别记一份，供 'both' 模式在提示里说清「预计缺几条、实际缺几条」
      if (toNum(r.est) <= 0) out.est += 1;
      if (toNum(r.act) <= 0) out.act += 1;
      if (isMissingHours(r, basis)) {
        out.count += 1;
        out.list.push(r);
      }
    }
    out.rate = out.total > 0 ? round1((out.count / out.total) * 100) : 0;
    return out;
  }

  // 旧名保留：0.1.x 起就在用，改名会把已有调用和断言全打断
  function isMissingEst(row) { return isMissingHours(row, 'est'); }
  function missingEst(rows) { return missingHours(rows, 'est'); }

  function mdCell(s) {
    // 表格单元格里的竖线和换行会撑破 markdown 表格
    return str(s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  }

  function toMarkdown(rows, opts) {
    const list = Array.isArray(rows) ? rows : [];
    const o = opts || {};
    const gk = GROUP_LABELS[o.groupKey] ? o.groupKey : 'project';
    const sum = summarize(list);

    const parts = [];
    if (o.start && o.end) {
      parts.push(str(o.start) + ' ~ ' + str(o.end));
    } else if (o.start || o.end) {
      parts.push(str(o.start || o.end));
    }
    // 统计口径决定日报里出不出现某一列：只用预计的团队，日报里摆一列全 0 的实际工时纯属噪音
    const basis = o.basis === 'actual' || o.basis === 'both' ? o.basis : 'estimated';
    const showEst = basis === 'estimated' || basis === 'both';
    const showAct = basis === 'actual' || basis === 'both';
    const estName = str(o.estLabel) || '预计';
    const actName = str(o.actLabel) || '实际';

    parts.push(sum.count + ' 个任务');
    if (showEst) parts.push(estName + ' ' + fmtHours(sum.est) + 'h');
    if (showAct) parts.push(actName + ' ' + fmtHours(sum.act) + 'h');

    const cols = [];
    if (showEst) cols.push({ name: estName + '(h)', pick: function (x) { return x.est; } });
    if (showAct) cols.push({ name: actName + '(h)', pick: function (x) { return x.act; } });

    const lines = [];
    if (o.title) lines.push('### ' + mdCell(o.title));
    lines.push('> ' + parts.join(' · '));
    lines.push('');
    lines.push('| ' + GROUP_LABELS[gk] + ' | 任务数 | ' +
      cols.map(function (c) { return c.name; }).join(' | ') + ' |');
    lines.push('| --- | ---: |' + cols.map(function () { return ' ---: |'; }).join(''));

    const groups = groupBy(list, gk, basis === 'actual' ? 'act' : 'est');
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      lines.push('| ' + mdCell(g.label) + ' | ' + g.count + ' | ' +
        cols.map(function (c) { return fmtHours(c.pick(g)); }).join(' | ') + ' |');
    }
    lines.push('| **合计** | **' + sum.count + '** | ' +
      cols.map(function (c) { return '**' + fmtHours(c.pick(sum)) + '**'; }).join(' | ') + ' |');

    // 汇总表只回答「花在哪个项目」，日报周报和绩效自评要回答「具体做了什么」，
    // 所以默认再带一份按同一维度分组的任务清单。detail:false 可关掉。
    if (o.detail !== false && list.length) {
      const cap = o.detailLimit === undefined ? 200 : Number(o.detailLimit);
      const byKey = Object.create(null);
      for (let i = 0; i < list.length; i++) {
        const r = list[i] || {};
        const k = String(groupKeyOf(r, gk).key);
        if (!byKey[k]) byKey[k] = [];
        byKey[k].push(r);
      }
      lines.push('');
      lines.push('#### 明细');
      let printed = 0;
      let omitted = 0;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const bucket = byKey[g.key] || [];
        lines.push('');
        lines.push('**' + mdCell(g.label) + '**（' + g.count + ' 个 · ' +
          (basis === 'actual' ? actName + ' ' + fmtHours(g.act) : estName + ' ' + fmtHours(g.est)) + 'h）');
        for (let j = 0; j < bucket.length; j++) {
          if (printed >= cap) { omitted += 1; continue; }
          const r = bucket[j];
          const bits = [];
          if (r.status) bits.push(str(r.status));
          if (showEst) bits.push(estName + ' ' + fmtHours(r.est) + 'h');
          if (showAct && (r.act || !showEst)) bits.push(actName + ' ' + fmtHours(r.act) + 'h');
          const sn = r.sn ? mdCell(r.sn) + ' ' : '';
          lines.push('- ' + sn + mdCell(r.subject) + ' — ' + bits.join(' · '));
          printed += 1;
        }
      }
      if (omitted) {
        lines.push('');
        lines.push('> 明细只列出前 ' + cap + ' 条，另有 ' + omitted + ' 条未展开。');
      }
    }
    return lines.join('\n');
  }

  function csvNum(n) {
    return String(round2(toNum(n)));
  }

  // 以 = + - @ 开头的文本在 Excel / WPS 里会被当公式执行（OWASP 列的危险前导字符），导出前打断。
  // 只作用于文本列；数值列走 csvNum，不经过这里，所以负数显示不受影响。
  function csvSafeText(v) {
    const s = str(v);
    if (/^[=+\-@\t\r]/.test(s)) return '\'' + s;
    return s;
  }

  function csvCell(v) {
    const s = str(v);
    if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function toCsv(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const lines = [CSV_HEADER.map(csvCell).join(',')];
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      lines.push([
        csvCell(csvSafeText(r.sn)),
        csvCell(csvSafeText(r.subject)),
        csvCell(csvSafeText(r.project)),
        csvCell(csvSafeText(r.category)),
        csvCell(csvSafeText(r.status)),
        csvCell(csvSafeText(r.assignee)),
        csvCell(csvNum(r.est)),
        csvCell(csvNum(r.act)),
        csvCell(str(r.planStart)),
        csvCell(str(r.planEnd)),
        csvCell(str(r.finishTime)),
        csvCell(str(r.url))
      ].join(','));
    }
    // UTF-8 BOM，Excel 直接双击打开不乱码
    return '\ufeff' + lines.join('\r\n') + '\r\n';
  }

  NS.stats = {
    normalize: normalize,
    summarize: summarize,
    filterByTaskScope: filterByTaskScope,
    workHoursTotal: workHoursTotal,
    groupBy: groupBy,
    byDay: byDay,
    byMember: byMember,
    overdue: overdue,
    isMissingEst: isMissingEst,
    missingEst: missingEst,
    isMissingHours: isMissingHours,
    missingHours: missingHours,
    toMarkdown: toMarkdown,
    toCsv: toCsv
  };
})();

/*
 * 单测契约（输入 → 输出），全部为纯函数，无 DOM / 网络 / chrome API：
 *
 * normalize(items, fieldMap, opts) -> Row[]
 *   items:    云效 /workitem/list 返回的 result 数组；非数组一律按 [] 处理，脏元素跳过。
 *   fieldMap: {estimated|actual|planStart|planEnd: {id, name} | null}；整体可为 null（此时工时按 0、
 *             计划日期按 null）。字段 id 全部来自运行时探测，模块内不含任何硬编码 id。
 *   opts:     {dateBasis:'planEnd'|'finishTime'|'planStart'（其它值退回 'planEnd'）,
 *              excludeCancelled:boolean（为真时剔除 isCancelled 行；未传视为 false）}
 *   Row:      {id, sn, subject, projectId, project, category, status, stage, stageId,
 *              assigneeId, assignee, avatar, est, act, estMissing, planStart, planEnd,
 *              finishTime, date, isCancelled, isDone, url}
 *   取值要点：customFields 无值时整条缺失（不是 value:null），故按 fieldIdentifier 建索引后判存在；
 *             value 是字符串，parseFloat 失败按 0；日期字段 '2026-08-28 00:00:00' 截成 'YYYY-MM-DD'；
 *             finishTime 是毫秒时间戳或 null，按本地时区转 'YYYY-MM-DD'；
 *             url = https://devops.aliyun.com/projex/project/{projectId}/{req|bug|task}/{id}，
 *             projectId 缺失时 url 为 null。
 *
 * summarize(rows) -> {count, est, act, diff, days, avgPerDay}
 *   diff = act - est；days = 有 date 的不同日期数；avgPerDay = days ? est/days : 0；
 *   金额型数值统一保留 2 位小数。
 *
 * groupBy(rows, key) -> [{key, label, count, est, act}]
 *   key ∈ 'project'|'category'|'status'|'stage'|'assignee'（其它值归为单组 '(全部)'）。
 *   排序：est 降序 → count 降序 → label 升序（末位比较仅为结果稳定）。
 *   分组键：project 用 projectId、assignee 用 assigneeId，label 用名称；名称为空时给占位文案。
 *
 * byDay(rows, startYMD, endYMD, opts) -> [{ymd, dow, weekday, isWeekend, count, est, act, target, deficit}]
 *   覆盖区间内每一天（无数据补 0），上限 400 天；start > end 或日期非法时返回 []。
 *   target = isWeekend ? 0 : opts.dailyTargetHours（默认 8）；deficit = max(0, target - est)。
 *   dow(0=周日) 与 weekday('周一' 文案) 为 SPEC 之外的附加字段，供日历渲染直接用。
 *
 * byMember(rows) -> [{id, key, label, name, avatar, count, est, act, diff, days}]
 *   按负责人聚合（assigneeId 缺失时用姓名，再缺退 '(未指派)'），排序同 groupBy。
 *
 * overdue(rows, nowTs) -> {total, overdue, rate, list}
 *   分母：有 planEnd 且未取消的行；已取消的既不逾期也不计入分母。
 *   有 finishTime（真正结束）：finishTime > planEnd 才算逾期；
 *   无 finishTime：now > planEnd 当天 23:59:59 算逾期（状态名叫「开发完成」也一样）。
 *   未完成：nowTs > planEnd 当天 23:59:59.999（本地时区）算逾期。
 *   rate：百分数 number，保留 1 位小数；total 为 0 时为 0。list 为原始 Row 引用（不复制、不修改）。
 *
 * isMissingEst(row) -> boolean
 *   未取消 且 est <= 0（字段整条没值或明确填 0 都算）。取消的行恒为 false。
 *
 * missingEst(rows) -> {count, total, rate, list}
 *   total：未取消的行数（分母）；count：其中未填预计工时的行数；rate：百分数，1 位小数。
 *   调用前须确认「预计工时」字段已识别，否则整表都会被判成未填。
 *
 * toMarkdown(rows, opts) -> string
 *   opts:{groupKey（默认 'project'）, start, end, title}；首行 '> {start} ~ {end} · N 个任务 · 预计 Xh · 实际 Yh'，
 *   随后按 groupKey 分组的四列表格，末行为合计。label 里的 '|' 与换行会被转义。
 *
 * toCsv(rows) -> string
 *   带 UTF-8 BOM，CRLF 换行；列：编号,标题,项目,类别,状态,负责人,预计工时,实际工时,计划开始,计划完成,实际完成,链接。
 *   含逗号/引号/换行/首尾空白的字段用双引号包裹且内部引号翻倍；以 = + - @ 开头的文本前置单引号，
 *   防 Excel 公式注入（数值列不做此处理，避免负数被改写）。
 */
