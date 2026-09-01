/**
 * 纯逻辑冒烟测试：在 node 里 mock 出最小的 window / chrome / document，
 * 直接 eval src/util.js、src/stats.js、src/store.js，用 docs/API-RESEARCH.md 里
 * 记录的真实工作项 JSON 结构造假数据，跑通并断言核心统计口径。
 *
 * 用法：node tools/smoke-test.mjs
 *
 * 注意：这里故意用 900123 / 900124 / 71 / 72 这类「非本组织」的字段 id，
 * 以此证明 stats 完全按传入的 fieldMap 取值，代码里没有任何硬编码字段 id。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ *
 * 最小宿主环境
 * ------------------------------------------------------------------ */

function makeChromeMock() {
  const store = {};
  const listeners = [];
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  return {
    runtime: { lastError: null },
    storage: {
      local: {
        get(keys, cb) {
          const out = keys === null || keys === undefined ? clone(store) : {};
          if (keys && typeof keys === 'string') out[keys] = clone(store[keys]);
          cb(out);
        },
        set(payload, cb) {
          Object.keys(payload).forEach((k) => { store[k] = clone(payload[k]); });
          const changes = {};
          Object.keys(payload).forEach((k) => { changes[k] = { newValue: clone(payload[k]) }; });
          listeners.forEach((fn) => fn(changes, 'local'));
          cb();
        },
        clear(cb) {
          Object.keys(store).forEach((k) => { delete store[k]; });
          cb();
        }
      },
      onChanged: {
        addListener(fn) { listeners.push(fn); },
        removeListener(fn) {
          const i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        }
      }
    },
    __dump: () => clone(store)
  };
}

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  chrome: makeChromeMock(),
  navigator: { clipboard: null },
  location: { href: 'https://devops.aliyun.com/projex/workitem', hostname: 'devops.aliyun.com' },
  document: {
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, click() {} }),
    body: { appendChild() {}, removeChild() {} },
    addEventListener() {}
  }
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const file = path.join(ROOT, rel);
  vm.runInContext(readFileSync(file, 'utf8'), sandbox, { filename: file });
}

load('src/util.js');
load('src/summary-items.js');
load('src/workcalendar.js');
load('src/stats.js');
load('src/store.js');
// api.js 里有两个纯函数（viewFilterToGroups / normalizeViewSpace）必须被测到：
// 视图筛选转换错了不会报错，只会静默返回 0 条，是最危险的一段。
sandbox.fetch = () => Promise.reject(new Error('smoke-test 不联网'));
load('src/api.js');
// detect.matchFields 是决定插件在「别家企业」能不能用的唯一函数，必须重点测
load('src/detect.js');
load('src/range-data.js');

const YXWT = sandbox.window.YXWT;
const util = YXWT.util;
const stats = YXWT.stats;
const store = YXWT.store;
const api = YXWT.api;
const detect = YXWT.detect;
const workcalendar = YXWT.workcalendar;
const rangeData = YXWT.rangeData;
const summaryItems = YXWT.summaryItems;

/* ------------------------------------------------------------------ *
 * 断言器
 * ------------------------------------------------------------------ */

let pass = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) { pass++; return; }
  failures.push(name + (extra === undefined ? '' : '  →  ' + JSON.stringify(extra)));
}

function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) { pass++; return; }
  failures.push(name + '  →  实际 ' + a + '，期望 ' + b);
}

/* ------------------------------------------------------------------ *
 * 假数据：结构照抄 docs/API-RESEARCH.md 2.1
 * ------------------------------------------------------------------ */

// 运行时探测出来的字段映射（id 是假的，正是为了证明不依赖任何固定 id）
const FIELD_MAP = {
  estimated: { id: '900123', name: '预计工时' },
  actual: { id: '900124', name: '实际工时' },
  planStart: { id: '71', name: '计划开始时间' },
  planEnd: { id: '72', name: '计划完成时间' },
  detectedAt: 1787309149000,
  manual: false
};

const ts = (y, m, d, hh) => new Date(y, m - 1, d, hh === undefined ? 10 : hh, 0, 0, 0).getTime();

const P1 = { identifier: 'p1', name: '示例省机关', type: 'Project' };
const P2 = { identifier: 'p2', name: '云食堂标准版', type: 'Project' };
const ME = { identifier: 'u-me', realName: '陈默', displayName: '陈默', avatar: 'https://a/1.png' };
const OTHER = { identifier: 'u-2', realName: '李维', displayName: '李维', avatar: '' };

// A：未完成、计划完成 08-20、预计 2h / 实际 1.5h
const itemA = {
  identifier: 'ida', serialNumber: 'HZFS-14', subject: '对接支付回调',
  gmtCreate: ts(2026, 8, 17), finishTime: null,
  categoryIdentifier: 'Task', category: { identifier: 'Task', name: '任务' },
  status: { identifier: '100005', name: '待处理', stageId: 1 },
  statusStage: { id: 1, name: '确认阶段' },
  spaceIdentifier: 'p1', space: P1, assignedTo: ME,
  customFields: [
    { fieldIdentifier: '72', fieldFormat: 'input', fieldClassName: 'date', value: '2026-08-20 00:00:00' },
    { fieldIdentifier: '71', fieldFormat: 'input', fieldClassName: 'date', value: '2026-08-17 00:00:00' },
    { fieldIdentifier: '900123', fieldFormat: 'input', fieldClassName: 'float', value: '2' },
    { fieldIdentifier: '900124', fieldFormat: 'input', fieldClassName: 'float', value: '1.5' },
    { fieldIdentifier: 'workitem.tracker', fieldClassName: 'user', objectValue: [ME] }
  ]
};

// B：已完成但晚于计划完成日（08-21 计划，08-22 完成）→ 逾期；实际工时字段整条缺失 → 按 0
const itemB = {
  identifier: 'idb', serialNumber: 'HZFS-15', subject: '需求：报表导出, 含"引号"',
  gmtCreate: ts(2026, 8, 18), finishTime: ts(2026, 8, 22),
  categoryIdentifier: 'Req', category: { identifier: 'Req', name: '需求' },
  status: { identifier: '100010', name: '已完成', stageId: 4 },
  statusStage: { id: 4, name: '完成阶段' },
  spaceIdentifier: 'p2', space: P2, assignedTo: OTHER,
  customFields: [
    { fieldIdentifier: '72', fieldFormat: 'input', fieldClassName: 'date', value: '2026-08-21 00:00:00' },
    { fieldIdentifier: '900123', fieldFormat: 'input', fieldClassName: 'float', value: '3.5' }
  ]
};

// C：完全没有 customFields（云效无值时整条缺失）→ est/act/planEnd 全空
const itemC = {
  identifier: 'idc', serialNumber: 'HZFS-16', subject: '线上缺陷',
  gmtCreate: ts(2026, 8, 19), finishTime: null,
  categoryIdentifier: 'Bug', category: { identifier: 'Bug', name: '缺陷' },
  status: { identifier: '100006', name: '处理中', stageId: 2 },
  statusStage: { id: 2, name: '处理阶段' },
  spaceIdentifier: 'p1', space: P1, assignedTo: ME
};

// D：已取消，excludeCancelled 时必须被剔除
const itemD = {
  identifier: 'idd', serialNumber: 'HZFS-17', subject: '作废的任务',
  finishTime: null, categoryIdentifier: 'Task', category: { identifier: 'Task', name: '任务' },
  status: { identifier: '100099', name: '已取消', stageId: 4 },
  statusStage: { id: 4, name: '完成阶段' },
  spaceIdentifier: 'p1', space: P1, assignedTo: ME,
  customFields: [
    { fieldIdentifier: '72', fieldFormat: 'input', fieldClassName: 'date', value: '2026-08-19 00:00:00' },
    { fieldIdentifier: '900123', fieldFormat: 'input', fieldClassName: 'float', value: '99' }
  ]
};

// E：已完成且按时（计划 08-21，实际 08-21）→ 不逾期
const itemE = {
  identifier: 'ide', serialNumber: 'HZFS-18', subject: '按时完成的任务',
  finishTime: ts(2026, 8, 21), categoryIdentifier: 'Task', category: { identifier: 'Task', name: '任务' },
  status: { identifier: '100010', name: '已完成', stageId: 4 },
  statusStage: { id: 4, name: '完成阶段' },
  spaceIdentifier: 'p2', space: P2, assignedTo: OTHER,
  customFields: [
    { fieldIdentifier: '72', fieldFormat: 'input', fieldClassName: 'date', value: '2026-08-21 00:00:00' },
    { fieldIdentifier: '900123', fieldFormat: 'input', fieldClassName: 'float', value: '' },
    { fieldIdentifier: '900124', fieldFormat: 'input', fieldClassName: 'float', value: 'abc' }
  ]
};

const ITEMS = [itemA, itemB, itemC, itemD, itemE];

/* ------------------------------------------------------------------ *
 * 1. util
 * ------------------------------------------------------------------ */

eq('util.pad2(7)', util.pad2(7), '07');
eq('util.toYMD(Date)', util.toYMD(new Date(2026, 7, 21, 13, 5)), '2026-08-21');
eq('util.toYMD(毫秒时间戳)', util.toYMD(ts(2026, 8, 21)), '2026-08-21');
eq('util.toYMD("2026-08-21 00:00:00")', util.toYMD('2026-08-21 00:00:00'), '2026-08-21');
eq('util.toYMD(null)', util.toYMD(null), null);
eq('util.parseYMD 本地零点', util.parseYMD('2026-08-21').getHours(), 0);
eq('util.fmtHours(25)', util.fmtHours(25), '25');
eq('util.fmtHours(25.5)', util.fmtHours(25.5), '25.5');
eq('util.fmtHours(0)', util.fmtHours(0), '0');
eq('util.fmtDateTimeForApi 起', util.fmtDateTimeForApi('2026-08-21'), '2026-08-21 00:00:00');
eq('util.fmtDateTimeForApi 止', util.fmtDateTimeForApi('2026-08-21', true), '2026-08-21 23:59:59');
eq('util.weekStart 周一为始（输入周五）', util.toYMD(util.weekStart(util.parseYMD('2026-08-21'))), '2026-08-17');
eq('util.weekStart 周一为始（输入周日）', util.toYMD(util.weekStart(util.parseYMD('2026-08-23'))), '2026-08-17');
eq('util.daysBetween 含首尾', util.daysBetween('2026-08-17', '2026-08-23').length, 7);
eq('workcalendar 识别 2026 中秋调休补班周日', workcalendar.classify('2026-09-20').workday, true);
eq('workcalendar 识别 2026 中秋放假周五', workcalendar.classify('2026-09-25').workday, false);
eq('workcalendar 2026-09 工作日工时（22 天 × 8h × 2 人）',
  workcalendar.summarize('2026-09-01', '2026-09-30', 8, 2).hours, 352);
eq('workcalendar 截止 2026-09-01 工时（1 个工作日 × 8h）',
  workcalendar.summarize('2026-09-01', '2026-09-01', 8, 1).hours, 8);
eq('workcalendar 未内置 2027 时按周一至周五并提示年份',
  workcalendar.summarize('2027-01-01', '2027-01-03', 8, 1).unsupportedYears, ['2027']);
eq('summaryItems 空选择保持旧版默认模式', summaryItems.normalize([], 'thisMonth'), []);
eq('summaryItems 自定义项自动补上必显范围',
  summaryItems.normalize(['actual', 'workdayDiff'], 'thisMonth'), ['range', 'actual', 'workdayDiff']);
eq('summaryItems 本周提供截止今日两项',
  summaryItems.available('thisWeek').slice(-2).map((x) => x.key), ['throughToday', 'throughTodayDiff']);
eq('summaryItems 切到上月会过滤截止今日项并保留其它选择',
  summaryItems.normalize(['range', 'workdayTotal', 'throughToday', 'throughTodayDiff'], 'lastMonth'),
  ['range', 'workdayTotal']);
const panelSource = readFileSync(path.join(ROOT, 'src/panel.js'), 'utf8');
const overviewCardOrder = [
  "card('实际工时',",
  "card('偏差',",
  "card('工作日总工时',",
  // 两张「跟工作日目标比」的偏差卡改由 addWorkDiffCard 统一渲染（要按统计口径切换预计/实际）
  "addWorkDiffCard(workCards, '工时偏差'",
  "card('截止今日工时',",
  "addWorkDiffCard(workCards, '截止今日工时偏差'"
].map((needle) => panelSource.indexOf(needle));
ok('panel 概览卡顺序：实际 → 偏差 → 工作日总工时 → 工时偏差 → 截止今日 → 截止今日偏差',
  overviewCardOrder.every((pos, i) => pos >= 0 && (i === 0 || pos > overviewCardOrder[i - 1])), overviewCardOrder);
ok('panel 工时目标卡使用独立第二行网格',
  panelSource.includes("const workCards = el('div', 'yxp-cards yxp-workcards');") &&
  panelSource.indexOf('add(sec, cards);') < panelSource.indexOf("const workCards = el('div', 'yxp-cards yxp-workcards');"));
ok('panel 工时偏差在本周本月条件之外，所有时间范围都有',
  panelSource.indexOf("card('工时偏差',") <
  panelSource.indexOf("state.rangeKey === 'thisMonth' || state.rangeKey === 'thisWeek'"));
ok('panel 工时偏差正数红色、负数绿色（两张卡共用 addWorkDiffCard 的 tone）',
  panelSource.includes("const tone = diff > 0 ? 'yxp-bad' : (diff < 0 ? 'yxp-good' : '');"));
ok('panel 两张工作日偏差卡统一使用独立达标工时口径',
  panelSource.includes('NS.stats.workHoursTotal(rows, workDiffBasis())') &&
  (panelSource.match(/addWorkDiffCard\(workCards, /g) || []).length === 2);
ok('panel 任务状态范围统一作用于概览、日历、分组和明细',
  panelSource.includes('function taskScopeRows()') &&
  panelSource.includes('NS.stats.byDay(taskScopeRows(), state.start, state.end') &&
  panelSource.includes('return taskScopeRows().filter(function (r)'));
ok('panel 任务状态范围不改变已编辑任务的待提交写回清单',
  /function changedList\(\) \{[\s\S]{0,160}state\.rows\.forEach/.test(panelSource));
ok('panel 截止今日两卡只对本周、本月显示',
  panelSource.includes("state.rangeKey === 'thisMonth' || state.rangeKey === 'thisWeek'"));
ok('panel 截止今日偏差与工时偏差走同一套渲染，颜色规则一致',
  (panelSource.match(/addWorkDiffCard\(workCards, /g) || []).length === 2);
eq('rangeData 默认区间跟随 prefs', rangeData.rangeFromPrefs({ defaultRange: 'thisMonth' }).key, 'thisMonth');
eq('rangeData 本月固定取 thisMonth 预设', rangeData.currentMonthRange().key, 'thisMonth');
eq('rangeData 同一自然日不刷新', rangeData.isSameLocalDay(new Date(2026, 8, 1, 1), new Date(2026, 8, 1, 23)), true);
eq('rangeData 跨自然日需要刷新', rangeData.isSameLocalDay(new Date(2026, 8, 1, 23), new Date(2026, 8, 2, 0)), false);
eq('util.daysBetween 上限 400', util.daysBetween('2020-01-01', '2026-01-01').length, 400);
eq('util.isWeekend(周六)', util.isWeekend('2026-08-22'), true);
eq('util.isWeekend(周五)', util.isWeekend('2026-08-21'), false);

// 注意：这里必须传字符串。smoke-test 在 vm 沙箱里跑，沙箱外造的 Date 对沙箱内的
// `x instanceof Date` 是 false，rangePresets 会当没传参、退回「今天」，断言就随跑测的日子飘。
const presets = util.rangePresets('2026-08-21');
eq('util.rangePresets 共 8 个',
  presets.map((p) => p.key),
  ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'last7', 'last30']);
eq('util.rangePresets 本周 = 周一~周日',
  [presets[2].start, presets[2].end], ['2026-08-17', '2026-08-23']);
eq('util.rangePresets 本月', [presets[4].start, presets[4].end], ['2026-08-01', '2026-08-31']);
ok('util.rangePresets 全是 YMD 字符串',
  presets.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.start) && /^\d{4}-\d{2}-\d{2}$/.test(p.end)));
eq('util.escapeHtml', util.escapeHtml('<a href="x">&\'</a>'),
  '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');

const pm = await util.pmap([1, 2, 3, 4, 5], async (n) => {
  if (n === 3) throw new Error('boom');
  return n * 2;
}, 2);
eq('util.pmap 保持顺序 + 单项失败不中断',
  pm, [2, 4, { __error: 'boom' }, 8, 10]);

/* ------------------------------------------------------------------ *
 * 2. stats.normalize
 * ------------------------------------------------------------------ */

const rowsAll = stats.normalize(ITEMS, FIELD_MAP, { dateBasis: 'planEnd', excludeCancelled: false });
eq('normalize 不排除取消时 5 行', rowsAll.length, 5);

const rows = stats.normalize(ITEMS, FIELD_MAP, { dateBasis: 'planEnd', excludeCancelled: true });
eq('normalize 排除已取消后 4 行', rows.length, 4);
eq('normalize 剔除的正是已取消那条', rows.map((r) => r.id), ['ida', 'idb', 'idc', 'ide']);

const rA = rows[0], rB = rows[1], rC = rows[2], rE = rows[3];

eq('A.sn', rA.sn, 'HZFS-14');
eq('A.project', rA.project, '示例省机关');
eq('A.projectId', rA.projectId, 'p1');
eq('A.category', rA.category, '任务');
eq('A.status/stage', [rA.status, rA.stage, rA.stageId], ['待处理', '确认阶段', 1]);
eq('A.assignee', [rA.assigneeId, rA.assignee], ['u-me', '陈默']);
eq('A.est/act', [rA.est, rA.act], [2, 1.5]);
eq('A.planStart/planEnd', [rA.planStart, rA.planEnd], ['2026-08-17', '2026-08-20']);
eq('A.finishTime 为 null', rA.finishTime, null);
eq('A.date 取 planEnd', rA.date, '2026-08-20');
eq('A.isDone/isCancelled', [rA.isDone, rA.isCancelled], [false, false]);
eq('A.url 用 /task/', rA.url, 'https://devops.aliyun.com/projex/project/p1/task/ida');
eq('B.url 用 /req/', rB.url, 'https://devops.aliyun.com/projex/project/p2/req/idb');
eq('C.url 用 /bug/', rC.url, 'https://devops.aliyun.com/projex/project/p1/bug/idc');

eq('B 缺失「实际工时」customField → act 按 0', rB.act, 0);
eq('B.est', rB.est, 3.5);
eq('B.finishTime 由毫秒时间戳转 YMD', rB.finishTime, '2026-08-22');
eq('B.isDone', rB.isDone, true);

eq('C 整条没有 customFields → est/act 都 0', [rC.est, rC.act], [0, 0]);
eq('C 没有计划完成时间 → planEnd/date 为 null', [rC.planEnd, rC.date], [null, null]);

eq('E 空字符串/非数字工时按 0', [rE.est, rE.act], [0, 0]);

const rowsNoMap = stats.normalize(ITEMS, null, { excludeCancelled: true });
eq('fieldMap 为 null 时工时全 0', rowsNoMap.map((r) => r.est + r.act), [0, 0, 0, 0]);
eq('normalize 脏输入不炸', stats.normalize(null, FIELD_MAP, {}).length, 0);
eq('normalize 跳过脏元素', stats.normalize([null, 1, itemA], FIELD_MAP, {}).length, 1);
eq('任务状态范围：全部任务保持原数据', stats.filterByTaskScope(rows, 'all').map((r) => r.id),
  ['ida', 'idb', 'idc', 'ide']);
eq('任务状态范围：仅已完成只认云效 finishTime', stats.filterByTaskScope(rows, 'completed').map((r) => r.id),
  ['idb', 'ide']);
eq('达标工时口径：逐任务取预计/实际较大值后合计',
  stats.workHoursTotal([{ est: 6, act: 2 }, { est: 1, act: 5 }], 'max'), 11);
eq('达标工时口径：可固定使用预计或实际', [
  stats.workHoursTotal([{ est: 6, act: 2 }, { est: 1, act: 5 }], 'estimated'),
  stats.workHoursTotal([{ est: 6, act: 2 }, { est: 1, act: 5 }], 'actual')
], [7, 7]);

const rowsByStart = stats.normalize([itemA], FIELD_MAP, { dateBasis: 'planStart' });
eq('dateBasis=planStart 时 date 取计划开始', rowsByStart[0].date, '2026-08-17');
const rowsByFinish = stats.normalize([itemB], FIELD_MAP, { dateBasis: 'finishTime' });
eq('dateBasis=finishTime 时 date 取实际完成', rowsByFinish[0].date, '2026-08-22');
const rowsBadBasis = stats.normalize([itemA], FIELD_MAP, { dateBasis: '瞎写的' });
eq('dateBasis 非法退回 planEnd', rowsBadBasis[0].date, '2026-08-20');

/* ------------------------------------------------------------------ *
 * 3. summarize —— 3 条数据 est 合计
 * ------------------------------------------------------------------ */

const three = [rA, rB, rC];              // 2 + 3.5 + 0
const sum3 = stats.summarize(three);
eq('summarize 3 条：count', sum3.count, 3);
eq('summarize 3 条：est 合计 = 5.5', sum3.est, 5.5);
eq('summarize 3 条：act 合计 = 1.5', sum3.act, 1.5);
eq('summarize 3 条：diff = act - est', sum3.diff, -4);
eq('summarize 3 条：days（有 date 的不同日期数）', sum3.days, 2);
eq('summarize 3 条：avgPerDay = est/days', sum3.avgPerDay, 2.75);
eq('summarize 空数组', stats.summarize([]), { count: 0, est: 0, act: 0, diff: 0, days: 0, avgPerDay: 0, avgPerDayAct: 0 });

// 浮点噪声：0.1 + 0.2 不能变成 0.30000000000000004
const fl = stats.summarize([{ est: 0.1, act: 0 }, { est: 0.2, act: 0 }]);
eq('summarize 浮点求和收敛到 2 位小数', fl.est, 0.3);

/* ------------------------------------------------------------------ *
 * 4. groupBy
 * ------------------------------------------------------------------ */

const gp = stats.groupBy(rows, 'project');
eq('groupBy(project) 组数', gp.length, 2);
eq('groupBy(project) 按 est 降序', gp.map((g) => g.label), ['云食堂标准版', '示例省机关']);
eq('groupBy(project) p2 汇总', [gp[0].count, gp[0].est, gp[0].act], [2, 3.5, 0]);
eq('groupBy(project) p1 汇总', [gp[1].count, gp[1].est, gp[1].act], [2, 2, 1.5]);
eq('groupBy(project) key 用 projectId', gp.map((g) => g.key), ['p2', 'p1']);

const ga = stats.groupBy(rows, 'assignee');
eq('groupBy(assignee) 分人', ga.map((g) => [g.label, g.count, g.est]),
  [['李维', 2, 3.5], ['陈默', 2, 2]]);
eq('groupBy(status) 组数', stats.groupBy(rows, 'status').length, 3);
eq('groupBy(category) 组数', stats.groupBy(rows, 'category').length, 3);
eq('groupBy 非法 key 归一组', stats.groupBy(rows, '瞎写').map((g) => g.key), ['(全部)']);

const gm = stats.byMember(rows);
eq('byMember 分人出数', gm.map((m) => [m.name, m.count, m.est, m.act, m.diff]),
  [['李维', 2, 3.5, 0, -3.5], ['陈默', 2, 2, 1.5, -0.5]]);

/* ------------------------------------------------------------------ *
 * 5. byDay
 * ------------------------------------------------------------------ */

const days = stats.byDay(rows, '2026-08-17', '2026-08-23', { dailyTargetHours: 8 });
eq('byDay 覆盖区间每一天', days.length, 7);
eq('byDay 第一天是周一', [days[0].ymd, days[0].weekday], ['2026-08-17', '周一']);
eq('byDay 无数据的日子补 0', [days[0].count, days[0].est, days[0].act], [0, 0, 0]);
eq('byDay 无数据日 deficit = target', days[0].deficit, 8);

const d20 = days.find((d) => d.ymd === '2026-08-20');
eq('byDay 08-20 命中 A', [d20.count, d20.est, d20.act], [1, 2, 1.5]);
eq('byDay 08-20 deficit = 8-2', d20.deficit, 6);

const d21 = days.find((d) => d.ymd === '2026-08-21');
eq('byDay 08-21 命中 B + E 两条', [d21.count, d21.est], [2, 3.5]);

const d22 = days.find((d) => d.ymd === '2026-08-22');
eq('byDay 周六 target = 0', [d22.isWeekend, d22.target, d22.deficit], [true, 0, 0]);
const adjustedDays = stats.byDay([], '2026-09-20', '2026-09-25', {
  dailyTargetHours: 8,
  isWorkday: (ymd) => workcalendar.classify(ymd).workday
});
eq('byDay 调休周日按工作日、法定假日周五按休息日',
  [[adjustedDays[0].isWorkday, adjustedDays[0].target], [adjustedDays[5].isWorkday, adjustedDays[5].target]],
  [[true, 8], [false, 0]]);

const daysDefault = stats.byDay(rows, '2026-08-20', '2026-08-20', {});
eq('byDay 未给 dailyTargetHours 时默认 8', daysDefault[0].target, 8);
eq('byDay 区间反了返回空', stats.byDay(rows, '2026-08-23', '2026-08-17', {}).length, 0);

/* ------------------------------------------------------------------ *
 * 6. overdue —— 已完成 / 未完成两种判定
 * ------------------------------------------------------------------ */

const NOW = ts(2026, 8, 25, 12);         // 08-25 12:00，A 的 08-20 早就过了
const od = stats.overdue(rows, NOW);
eq('overdue 分母只算「有 planEnd 且未取消」', od.total, 3);
eq('overdue 逾期条数', od.overdue, 2);
eq('overdue 命中的是 A（未完成超期）和 B（完成晚于计划）',
  od.list.map((r) => r.id).sort(), ['ida', 'idb']);
eq('overdue rate 保留 1 位小数', od.rate, 66.7);
ok('overdue 已完成且按时的 E 不算逾期', od.list.every((r) => r.id !== 'ide'));

// 未完成：now 还没过 planEnd 当天 23:59:59 → 不算逾期
const notYet = stats.overdue([rA], ts(2026, 8, 20, 23));
eq('未完成 + 当天 23:00 未到截止 → 不逾期', [notYet.total, notYet.overdue, notYet.rate], [1, 0, 0]);
const justPast = stats.overdue([rA], ts(2026, 8, 21, 0));
eq('未完成 + 次日 00:00 已过截止 → 逾期', [justPast.total, justPast.overdue, justPast.rate], [1, 1, 100]);

// 已完成：只看 finishTime 与 planEnd 的先后，与 now 无关
const doneLate = stats.overdue([rB], ts(2030, 1, 1));
eq('已完成 + 晚于计划 → 逾期（与 now 无关）', doneLate.overdue, 1);
const doneOnTime = stats.overdue([rE], ts(2030, 1, 1));
eq('已完成 + 按时 → 不逾期（哪怕 now 已经很晚）', doneOnTime.overdue, 0);
// 状态名叫「XX完成」但没有 finishTime → 任务其实没结束，按未完成口径判逾期。
// 依据：真实数据里「开发完成」的任务 finishTime 为 null，云效自己也标它「逾期N天」。
const doneNoFinish = stats.overdue(
  [Object.assign({}, rB, { finishTime: null, status: '开发完成', isDone: false })], ts(2030, 1, 1));
eq('状态像完成但无 finishTime + 已过截止 → 算逾期', doneNoFinish.overdue, 1);
const doneNoFinishNotDue = stats.overdue(
  [Object.assign({}, rB, { finishTime: null, status: '开发完成', isDone: false })], ts(2026, 1, 1));
eq('状态像完成但无 finishTime + 未到截止 → 不逾期', doneNoFinishNotDue.overdue, 0);

const cancelled = stats.normalize([itemD], FIELD_MAP, { excludeCancelled: false });
eq('已取消的行既不逾期也不计入分母', stats.overdue(cancelled, ts(2030, 1, 1)),
  { total: 0, overdue: 0, rate: 0, list: [] });
eq('overdue 空数组 rate = 0', stats.overdue([], NOW).rate, 0);

/* ------------------------------------------------------------------ *
 * 6.5 missingEst —— 没标记预计工时的告警口径
 * ------------------------------------------------------------------ */

// A=2h、B=3.5h 有值；C 整条没有 customFields、E 的预计工时是空字符串 → 都算没填
eq('normalize 标出「预计工时字段整条没值」',
  [rA.estMissing, rB.estMissing, rC.estMissing, rE.estMissing], [false, false, true, true]);
eq('fieldMap 为 null 时不判缺失（那是字段没识别，不是漏填）',
  rowsNoMap.every((r) => r.estMissing === false), true);

eq('isMissingEst：有值的不算', stats.isMissingEst(rA), false);
eq('isMissingEst：字段没值的算', stats.isMissingEst(rC), true);
eq('isMissingEst：明确填 0 的也算', stats.isMissingEst({ est: 0 }), true);
eq('isMissingEst：已取消的不提示', stats.isMissingEst({ est: 0, isCancelled: true }), false);
eq('isMissingEst：脏输入不炸', stats.isMissingEst(null), false);

const miss = stats.missingEst(rows);
eq('missingEst 命中 C 和 E', miss.list.map((r) => r.id).sort(), ['idc', 'ide']);
eq('missingEst count/total/rate', [miss.count, miss.total, miss.rate], [2, 4, 50]);

// 已取消的（D，预计 99h）既不进分子也不进分母，否则关掉「排除已取消」后分母会跳
const missAll = stats.missingEst(rowsAll);
eq('missingEst 分母不含已取消', [missAll.count, missAll.total], [2, 4]);
eq('missingEst 空数组不炸', stats.missingEst([]),
  { count: 0, total: 0, rate: 0, list: [], est: 0, act: 0 });
eq('missingEst 脏输入不炸', stats.missingEst(null).count, 0);

// 口径参数：预计 / 实际 / 两者都要
// rows 里 A(2/1.5) B(3.5/0) C(0/0) E(0/0)
eq('missingHours(est) 只看预计', stats.missingHours(rows, 'est').list.map((r) => r.id).sort(), ['idc', 'ide']);
eq('missingHours(act) 只看实际', stats.missingHours(rows, 'act').list.map((r) => r.id).sort(), ['idb', 'idc', 'ide']);
eq('missingHours(both) 任一为空就算没填全',
  stats.missingHours(rows, 'both').list.map((r) => r.id).sort(), ['idb', 'idc', 'ide']);
eq('missingHours 分别记两个口径的条数',
  [stats.missingHours(rows, 'est').est, stats.missingHours(rows, 'est').act], [2, 3]);
eq('missingHours 非法 basis 退回预计', stats.missingHours(rows, '瞎写的').count, 2);
eq('isMissingHours(act)：预计有值但实际为 0 也算', stats.isMissingHours({ est: 8, act: 0 }, 'act'), true);
eq('isMissingHours(both)：两个都有值才算填全', stats.isMissingHours({ est: 8, act: 8 }, 'both'), false);
eq('isMissingHours：已取消的任何口径都不提示', stats.isMissingHours({ est: 0, act: 0, isCancelled: true }, 'both'), false);

eq('summarize 同时给出实际口径的日均', stats.summarize(three).avgPerDayAct,
  Math.round((1.5 / 2) * 100) / 100);

const gpAct = stats.groupBy(rows, 'project', 'act');
eq('groupBy(basis=act) 按实际工时排序', gpAct.map((g) => g.act), [1.5, 0]);

/* ------------------------------------------------------------------ *
 * 7. toCsv
 * ------------------------------------------------------------------ */

const csv = stats.toCsv(rows);
ok('toCsv 带 UTF-8 BOM', csv.charCodeAt(0) === 0xfeff, csv.charCodeAt(0));
const csvLines = csv.replace(/^﻿/, '').replace(/\r\n$/, '').split('\r\n');
eq('toCsv 表头',
  csvLines[0],
  '编号,标题,项目,类别,状态,负责人,预计工时,实际工时,计划开始,计划完成,实际完成,链接');
eq('toCsv 行数 = 表头 + 数据', csvLines.length, rows.length + 1);
ok('toCsv 含逗号/引号的标题被正确转义',
  csvLines[2].indexOf('"需求：报表导出, 含""引号"""') >= 0, csvLines[2]);
ok('toCsv 数值列不带引号', /,2,1\.5,/.test(csvLines[1]), csvLines[1]);
ok('toCsv 空日期输出空串', csvLines[3].indexOf(',,,') >= 0, csvLines[3]);
ok('toCsv 用 CRLF 换行', csv.indexOf('\r\n') > 0);
ok('toCsv 空数据也有表头', stats.toCsv([]).replace(/^﻿/, '').indexOf('编号,标题') === 0);

/* ------------------------------------------------------------------ *
 * 8. toMarkdown
 * ------------------------------------------------------------------ */

const md = stats.toMarkdown(rows, {
  groupKey: 'project', start: '2026-08-17', end: '2026-08-23', title: '本周工时'
});
const mdLines = md.split('\n');
eq('toMarkdown 标题行', mdLines[0], '### 本周工时');
ok('toMarkdown 概要行含区间与合计',
  mdLines[1] === '> 2026-08-17 ~ 2026-08-23 · 4 个任务 · 预计 5.5h · 实际 1.5h', mdLines[1]);
ok('toMarkdown 表头按分组维度', mdLines[3].indexOf('| 项目 | 任务数 | 预计(h) | 实际(h) |') === 0, mdLines[3]);
ok('toMarkdown 有合计行', md.indexOf('| **合计** | **4** | **5.5** | **1.5** |') > 0);
// 默认带明细清单（日报/周报要看到具体做了什么，不能只有项目汇总）
ok('toMarkdown 默认带明细段', md.indexOf('#### 明细') > 0);
ok('toMarkdown 明细列出任务标题', md.indexOf('- HZFS-14 ') > 0, md.slice(-200));
ok('toMarkdown 明细带状态与工时', /- HZFS-14 .+ — .+预计 /.test(md), 'no detail bits');
const mdNoDetail = stats.toMarkdown(rows, {
  groupKey: 'project', start: '2026-08-17', end: '2026-08-23', title: '本周工时', detail: false
});
ok('toMarkdown detail:false 行数 = 标题+概要+空行+表头+分隔+2 组+合计 = 8',
  mdNoDetail.split('\n').length === 8, mdNoDetail.split('\n').length);
ok('toMarkdown detail:false 不含明细段', mdNoDetail.indexOf('#### 明细') < 0);
// detailLimit 截断时必须说一声，不能静默少列
const many = [];
for (let i = 0; i < 5; i++) many.push({ sn: 'X-' + i, subject: 't' + i, project: 'P', est: 1, act: 0, status: '待处理' });
const mdCap = stats.toMarkdown(many, { detailLimit: 2 });
ok('toMarkdown detailLimit 截断并标注', mdCap.indexOf('另有 3 条未展开') > 0, mdCap.slice(-160));
ok('toMarkdown 默认按项目分组', stats.toMarkdown(rows, {}).indexOf('| 项目 |') > 0);
ok('toMarkdown 按成员分组', stats.toMarkdown(rows, { groupKey: 'assignee' }).indexOf('| 成员 |') > 0);
ok('toMarkdown 转义单元格里的竖线',
  stats.toMarkdown([{ project: 'a|b', est: 1, act: 1 }], {}).indexOf('a\\|b') > 0);

/* ------------------------------------------------------------------ *
 * 9. store（chrome.storage mock）—— 面板/设置页共用的键必须对得上
 * ------------------------------------------------------------------ */

const cfg0 = await store.get();
eq('store 默认 dryRun = true（首次使用必须是预演）', cfg0.prefs.dryRun, true);
eq('store 默认每日标准工时', cfg0.prefs.dailyTargetHours, 8);
eq('store 默认归集口径', cfg0.prefs.dateBasis, 'planEnd');
eq('store 默认统计全部任务', cfg0.prefs.taskScope, 'all');
eq('store 默认达标工时逐任务取较大值', cfg0.prefs.workDiffBasis, 'max');
eq('store 默认时间范围', cfg0.prefs.defaultRange, 'thisWeek');
eq('store 默认悬浮条显示项为空（沿用旧版样式）', cfg0.prefs.summaryBarItems, []);
eq('store 默认团队统计包含自己', cfg0.prefs.includeSelf, true);
eq('store 默认显示合计条', cfg0.prefs.showSummaryBar, true);
eq('store 默认排除已取消', cfg0.prefs.excludeCancelled, true);
eq('store 默认主题', cfg0.prefs.theme, 'auto');
eq('store 默认成员为空', cfg0.prefs.members, []);

const cfg1 = await store.setPrefs({ dryRun: false, dailyTargetHours: 7.5 });
eq('store.setPrefs 合并后回读', [cfg1.prefs.dryRun, cfg1.prefs.dailyTargetHours], [false, 7.5]);
eq('store.setPrefs 不会冲掉其它 prefs', cfg1.prefs.dateBasis, 'planEnd');

const fm = await store.setFieldMap('org-x', {
  estimated: { id: '900123', name: '预计工时' }, actual: null, planStart: null, planEnd: null
});
eq('store.setFieldMap 写入并回读', fm.estimated.id, '900123');
eq('store.setFieldMap 自动补 manual=false', fm.manual, false);
const manual = await store.setFieldMap('org-x', {
  estimated: { id: 'm1', name: '手动' }, manual: true
});
eq('store 手动映射生效', manual.estimated.id, 'm1');
const tryOverride = await store.setFieldMap('org-x', { estimated: { id: 'auto', name: '自动' } });
eq('store 手动映射不被自动探测覆盖', tryOverride.estimated.id, 'm1');

const book = await store.addContacts('org-x', [ME, OTHER, { identifier: '', realName: '脏数据' }]);
eq('store.addContacts 归一 + 去脏', Object.keys(book).sort(), ['u-2', 'u-me']);
eq('store.addContacts 取到姓名', book['u-me'].name, '陈默');
const book2 = await store.removeContact('org-x', 'u-2');
eq('store.removeContact', Object.keys(book2), ['u-me']);
await store.setRangeSnapshot('snap-x', { savedAt: 123, rows: [{ id: '1' }] });
eq('store 精确区间快照可持久化回读', (await store.getRangeSnapshot('snap-x')).rows[0].id, '1');
await store.setRangeSnapshot('snap-patch-a', { savedAt: 456, rows: [{ id: 'w-patch', est: 1, act: 2 }] });
await store.setRangeSnapshot('snap-patch-b', { savedAt: 789, rows: [{ id: 'w-patch', est: 3, act: 4 }, { id: 'keep', est: 5 }] });
eq('store 写回后同步所有命中快照', await store.patchRangeSnapshots([{ id: 'w-patch', est: 8, act: 9 }]), { snapshots: 2, rows: 2 });
eq('store 快照同步保留完整刷新时间', await store.getRangeSnapshot('snap-patch-a'), { savedAt: 456, rows: [{ id: 'w-patch', est: 8, act: 9 }] });
eq('store 快照同步不影响其它行', (await store.getRangeSnapshot('snap-patch-b')).rows[1].est, 5);

const originalDetectContext = detect.context;
const originalDetectFieldMap = detect.fieldMap;
detect.context = async () => ({ userId: 'u-me', name: '陈默', orgId: 'org-scope' });
detect.fieldMap = async () => ({
  estimated: { id: 'est-scope' }, actual: { id: 'act-scope' },
  planStart: { id: 'start-scope' }, planEnd: { id: 'end-scope' }
});
await store.setMembers('org-scope', ['u-2']);
await store.addContacts('org-scope', [{ id: 'u-2', name: '李维' }]);
const scopeWithoutSelf = await rangeData.resolve({ includeSelf: false });
eq('rangeData 排除自己时只保留已选同事',
  [scopeWithoutSelf.includeSelf, scopeWithoutSelf.members.map((m) => m.id)], [false, ['u-2']]);
await store.setMembers('org-scope', []);
const scopeFallbackSelf = await rangeData.resolve({ includeSelf: false });
eq('rangeData 没有任何成员时安全兜回自己',
  [scopeFallbackSelf.includeSelf, scopeFallbackSelf.members.map((m) => m.id)], [true, ['u-me']]);
detect.context = originalDetectContext;
detect.fieldMap = originalDetectFieldMap;

const dailyScope = {
  ctx: { orgId: 'org-daily' },
  members: [{ id: 'u-daily', name: '每日用户' }],
  fieldMap: {
    estimated: { id: 'est-daily' }, actual: { id: 'act-daily' },
    planStart: { id: 'start-daily' }, planEnd: { id: 'end-daily' }
  }
};
const dailyPrefs = { dateBasis: 'planEnd', excludeCancelled: true };
const dailyRange = rangeData.currentMonthRange();
const dailyQuery = { start: dailyRange.start, end: dailyRange.end, dateBasis: 'planEnd', excludeCancelled: true };
const dailyKey = rangeData.cacheKey(dailyScope, dailyQuery);
const dayOne = new Date(2026, 8, 1, 9, 0, 0).getTime();
const dayTwo = new Date(2026, 8, 2, 9, 0, 0).getTime();
await store.setRangeSnapshot(dailyKey, { savedAt: dayOne, rows: [] });
let dailyCalls = 0;
const originalListWorkitems = api.listWorkitems;
api.listWorkitems = async () => { dailyCalls++; return { items: [], truncated: false }; };
const sameDayResult = await rangeData.refreshThisMonthIfNeeded(dailyScope, dailyPrefs, { now: dayOne });
eq('rangeData 同日访问复用本月快照', [sameDayResult.refreshed, dailyCalls], [false, 0]);
const nextDayResult = await rangeData.refreshThisMonthIfNeeded(dailyScope, dailyPrefs, { now: dayTwo });
eq('rangeData 次日访问自动全量刷新本月', [nextDayResult.refreshed, dailyCalls, nextDayResult.snapshot.savedAt], [true, 1, dayTwo]);
const dayThree = new Date(2026, 8, 3, 9, 0, 0).getTime();
api.listWorkitems = async () => {
  dailyCalls++;
  await new Promise((resolve) => setTimeout(resolve, 10));
  return { items: [], truncated: false };
};
const concurrentDaily = await Promise.all([
  rangeData.refreshThisMonthIfNeeded(dailyScope, dailyPrefs, { now: dayThree }),
  rangeData.refreshThisMonthIfNeeded(dailyScope, dailyPrefs, { now: dayThree })
]);
eq('rangeData 面板与悬浮条并发时只刷新一次本月', [dailyCalls, concurrentDaily[0].refreshed, concurrentDaily[1].refreshed], [2, true, true]);
api.listWorkitems = originalListWorkitems;

/* ------------------------------------------------------------------ *
 * 10. api.viewFilterToGroups —— 视图筛选转换
 *     用例取自真实抓包（docs/API-VERIFY.md 第二节），错了会静默查不到数据
 * ------------------------------------------------------------------ */

// 「我负责的」内置视图的真实 filter：大量未启用条件 + statusStage 多选 + 负责人
const REAL_FILTER_MINE = JSON.stringify([[
  { field: { className: 'string', displayName: '标题', format: 'input', identifier: 'subject' },
    fieldIdentifier: 'subject', operator: 'CONTAINS', value: [] },
  { field: { className: 'statusStage', displayName: '状态阶段', format: 'multiList', identifier: 'statusStage' },
    fieldIdentifier: 'statusStage', operator: 'CONTAINS',
    value: [
      { label: '确认阶段', value: '1' }, { label: '处理阶段', value: '2' },
      { label: '分析阶段', value: '6' }, { label: '设计阶段', value: '7' },
      { label: '开发阶段', value: '11' }, { label: '测试阶段', value: '12' },
      { label: '发布阶段', value: '13' }
    ] },
  { field: { className: 'user', displayName: '负责人', format: 'list', identifier: 'assignedTo' },
    fieldIdentifier: 'assignedTo', operator: 'CONTAINS',
    value: [{ label: '陈默', value: 'u-me' }] },
  { field: { className: 'user', displayName: '创建者', format: 'list', identifier: 'creator' },
    fieldIdentifier: 'creator', operator: 'CONTAINS', value: [] },
  { field: { className: 'date', displayName: '创建时间', format: 'input', identifier: 'gmtCreate' },
    fieldIdentifier: 'gmtCreate', operator: 'MORE_THAN', value: [] }
]]);

const gMine = api.viewFilterToGroups(REAL_FILTER_MINE);
eq('viewFilter 只保留启用的条件（5 条里剩 2 条）', gMine[0].length, 2);
eq('viewFilter statusStage 值被 unwrap 成裸字符串',
  gMine[0][0].value, ['1', '2', '6', '7', '11', '12', '13']);
eq('viewFilter className/format 从 c.field 里取',
  [gMine[0][0].className, gMine[0][0].format], ['statusStage', 'multiList']);
eq('viewFilter 负责人条件正确', gMine[0][1].value, ['u-me']);
ok('viewFilter 未启用条件（value 为空数组）被丢掉',
  gMine[0].every((c) => c.fieldIdentifier !== 'subject' && c.fieldIdentifier !== 'creator'));

// 「每日任务」视图的真实 filter：日期 BETWEEN，toValue 也是 {label,value}
const REAL_FILTER_DAILY = JSON.stringify([[
  { field: { className: 'user', format: 'list', identifier: 'assignedTo' },
    fieldIdentifier: 'assignedTo', operator: 'CONTAINS', value: [{ label: '陈默', value: 'u-me' }] },
  { field: { checked: 'true', className: 'date', format: 'input', identifier: '80' },
    fieldIdentifier: '80', operator: 'BETWEEN',
    toValue: { label: '2026-08-22', value: '2026-08-22 23:59:59' },
    value: [{ label: '2026-08-17', value: '2026-08-17 00:00:00' }] }
]]);

const gDaily = api.viewFilterToGroups(REAL_FILTER_DAILY);
eq('viewFilter 日期 BETWEEN 的 value', gDaily[0][1].value, ['2026-08-17 00:00:00']);
eq('viewFilter 日期 BETWEEN 的 toValue 也被 unwrap', gDaily[0][1].toValue, '2026-08-22 23:59:59');
eq('viewFilter BETWEEN 的 operator 保留', gDaily[0][1].operator, 'BETWEEN');

// 边界
eq('viewFilter 空字符串 -> [[]]', api.viewFilterToGroups(''), [[]]);
eq('viewFilter 非法 JSON -> [[]]', api.viewFilterToGroups('{不是json'), [[]]);
eq('viewFilter null -> [[]]', api.viewFilterToGroups(null), [[]]);
eq('viewFilter 全部条件都未启用 -> [[]]',
  api.viewFilterToGroups(JSON.stringify([[{ fieldIdentifier: 'subject', value: [] }]])), [[]]);
eq('viewFilter 一维数组也能吃',
  api.viewFilterToGroups(JSON.stringify([{ fieldIdentifier: 'a', value: ['x'] }]))[0][0].value, ['x']);
ok('viewFilter 嵌套对象的 value 被拒绝（否则会静默查不到数据）',
  api.viewFilterToGroups(JSON.stringify([[{ fieldIdentifier: 'a', value: [{ value: { deep: 1 } }] }]]))[0].length === 0);
eq('viewFilter value 是 {identifier} 时回退取 identifier',
  api.viewFilterToGroups(JSON.stringify([[{ fieldIdentifier: 'a', value: [{ identifier: 'zz' }] }]]))[0][0].value, ['zz']);
eq('viewFilter 标量 value 也接受',
  api.viewFilterToGroups(JSON.stringify([[{ fieldIdentifier: 'a', value: 'x' }]]))[0][0].value, ['x']);

/* ------------------------------------------------------------------ *
 * 11. api.normalizeViewSpace —— 内置视图的 spaceIdentifier 是字面量 'system'
 * ------------------------------------------------------------------ */

eq('normalizeViewSpace: 内置视图 system -> 回落到当前用户',
  api.normalizeViewSpace({ spaceType: 'User', spaceIdentifier: 'system', scope: 'personal' }, 'aabbccddeeff001122334455').spaceIdentifier,
  'aabbccddeeff001122334455');
eq('normalizeViewSpace: 自建视图的真实 24 位 id 原样保留',
  api.normalizeViewSpace({ spaceType: 'User', spaceIdentifier: '61de3b64a96ac5d9b0cdbc7f' }, 'zz').spaceIdentifier,
  '61de3b64a96ac5d9b0cdbc7f');
eq('normalizeViewSpace: User 空间补 scope',
  api.normalizeViewSpace({ spaceType: 'User', spaceIdentifier: 'system' }, 'x').scope, 'personal');
eq('normalizeViewSpace: 空 spaceIdentifier 也回落',
  api.normalizeViewSpace({ spaceType: 'User' }, 'meid').spaceIdentifier, 'meid');

/* ------------------------------------------------------------------ *
 * 12. detect.matchFields —— 跨企业的工时字段自动识别
 *     这是公开发布的命脉：认错字段，插件对那家公司就是废的
 * ------------------------------------------------------------------ */

const F = (id, name, className, type) => ({
  identifier: id, displayName: name, className, format: 'input', type: type || 'SystemCustomField'
});
const ids = (m) => [m.estimated && m.estimated.id, m.actual && m.actual.id,
  m.planStart && m.planStart.id, m.planEnd && m.planEnd.id];

// 12.1 本组织真实字段集（实测抓包，见 docs/API-RESEARCH.md 第 3 节）
const REAL_META = [
  F('workitemType', '工作项类型', 'workitemType', 'NativeField'),
  F('status', '状态', 'status', 'NativeField'),
  F('assignedTo', '负责人', 'user', 'NativeField'),
  F('priority', '优先级', 'option'),
  F('space', '归属项目', 'space', 'NativeField'),
  F('79', '计划开始时间', 'date'),
  F('80', '计划完成时间', 'date'),
  F('101586', '预计工时', 'float'),
  F('101587', '实际工时', 'float'),
  F('sumPlanedLaborHour', '预计工时汇总', 'auto'),
  F('sumActualLaborHour', '实际工时汇总', 'auto'),
  F('sprint', '迭代', 'sprint', 'Application')
];
eq('matchFields 本组织真实字段集', ids(detect.matchFields(REAL_META)),
  ['101586', '101587', '79', '80']);
ok('matchFields 本组织字段集是高置信', detect.matchFields(REAL_META).lowConfidence === false);

// 12.2 换一家企业：中文别名（预估/登记 + 计划开始日期/计划结束日期）
eq('matchFields 中文别名（预估工时 / 登记工时）', ids(detect.matchFields([
  F('c1', '预估工时', 'float'), F('c2', '登记工时', 'float'),
  F('c3', '计划开始日期', 'date'), F('c4', '计划结束日期', 'date')
])), ['c1', 'c2', 'c3', 'c4']);

// 12.3 英文命名的企业
eq('matchFields 英文命名', ids(detect.matchFields([
  F('e1', 'Estimated Hours', 'float'), F('e2', 'Actual Hours', 'float'),
  F('e3', 'Planned Start', 'date'), F('e4', 'Due Date', 'date')
])), ['e1', 'e2', 'e3', 'e4']);

// 12.4 「工时汇总」字段绝不能被选中：父子任务 rollup，选了会重复计算
const withSumOnly = detect.matchFields([
  F('sumPlanedLaborHour', '预计工时汇总', 'float'),
  F('sumActualLaborHour', '实际工时汇总', 'float')
]);
eq('matchFields 只有 sum* 汇总字段时不认（会导致父子任务重复计算）',
  [withSumOnly.estimated, withSumOnly.actual], [null, null]);

// 12.5 只记预计工时的企业（很常见）
const onlyEst = detect.matchFields([F('o1', '预计工时', 'float'), F('o2', '计划完成时间', 'date')]);
eq('matchFields 只有预计工时时仍能识别出它', onlyEst.estimated.id, 'o1');
eq('matchFields 找不到实际工时时为 null', onlyEst.actual, null);

// 12.6 完全没有工时字段：不能崩，全部为 null
const none = detect.matchFields([F('n1', '备注', 'string'), F('n2', '优先级', 'option')]);
eq('matchFields 没有工时字段时全 null', ids(none), [null, null, null, null]);
eq('matchFields 空数组不崩', ids(detect.matchFields([])), [null, null, null, null]);
eq('matchFields 传 null 不崩', ids(detect.matchFields(null)), [null, null, null, null]);

// 12.7 非数值字段不能被当成工时（叫「工时说明」的文本字段）
const textTrap = detect.matchFields([
  F('t1', '预计工时说明', 'string'), F('t2', '实际工时备注', 'text')
]);
eq('matchFields 文本类型的「工时」字段不被选中', [textTrap.estimated, textTrap.actual], [null, null]);

// 12.8 退化路径：字段名没有预计/实际前缀词，按 id 升序顶上并标低置信
const degraded = detect.matchFields([F('900', '工时B', 'float'), F('800', '工时A', 'float')]);
eq('matchFields 退化时按 identifier 升序取前两个',
  [degraded.estimated.id, degraded.actual.id], ['800', '900']);
ok('matchFields 退化时标记 lowConfidence', degraded.lowConfidence === true);

// 12.9 预计与实际绝不能指向同一字段
const dup = detect.matchFields([F('d1', '计划实际工时', 'float'), F('d2', '实际工时', 'float')]);
ok('matchFields 预计与实际不会指向同一字段',
  !dup.estimated || !dup.actual || dup.estimated.id !== dup.actual.id,
  [dup.estimated, dup.actual]);

// 12.10 计划开始与计划完成不能指向同一字段
const dates = detect.matchFields([F('x1', '开始时间', 'date'), F('x2', '截止时间', 'date')]);
ok('matchFields 计划开始与计划完成不指向同一字段',
  !dates.planStart || !dates.planEnd || dates.planStart.id !== dates.planEnd.id,
  [dates.planStart, dates.planEnd]);

// 12.11 整数/number 类型的工时字段也要认（不是所有企业都用 float）
eq('matchFields 认 integer / number 类型的工时字段', ids(detect.matchFields([
  F('i1', '预计工时', 'integer'), F('i2', '实际工时', 'number')
])).slice(0, 2), ['i1', 'i2']);

// 12.12 同名同分时优先 SystemCustomField（组织级字段比项目级更稳）
const tie = detect.matchFields([
  F('p9', '预计工时', 'float', 'CustomField'),
  F('p1', '预计工时', 'float', 'SystemCustomField')
]);
eq('matchFields 同分时优先 SystemCustomField', tie.estimated.id, 'p1');

// 12.13 繁体中文：台港团队和云效繁体界面下字段名就是「預計工時」，漏了插件对他们直接失效
eq('matchFields 繁体（預計工時 / 實際工時 / 計劃開始時間 / 計劃完成時間）', ids(detect.matchFields([
  F('j1', '預計工時', 'float'), F('j2', '實際工時', 'float'),
  F('j3', '計劃開始時間', 'date'), F('j4', '計劃完成時間', 'date')
])), ['j1', 'j2', 'j3', 'j4']);
ok('matchFields 繁体也是高置信', detect.matchFields([
  F('j1', '預計工時', 'float'), F('j2', '實際工時', 'float')
]).lowConfidence === false);
eq('matchFields 繁体「登記工時」也认', detect.matchFields([
  F('k1', '預估工時', 'float'), F('k2', '登記工時', 'float')
]).actual.id, 'k2');

// 12.14 退化路径也要认 integer/number，不能只认 float（与主路径保持一致）
eq('matchFields 退化路径认 integer', [
  detect.matchFields([F('900', '工時B', 'integer'), F('800', '工时A', 'integer')]).estimated.id,
  detect.matchFields([F('900', '工時B', 'integer'), F('800', '工时A', 'integer')]).actual.id
], ['800', '900']);

// 12.15 describe 能出人话（设置页要展示给用户看）
const desc = detect.describe(detect.matchFields(REAL_META));
ok('describe 输出包含字段名与 id', desc.indexOf('预计工时') > 0 && desc.indexOf('101586') > 0, desc);

/* ------------------------------------------------------------------ *
 * 13. api.saveWorkHours —— 工时写入的安全保证
 *     端点已在真实云效抓包实证：POST /workitem/workitem/time/estimate
 *     这是唯一能损坏用户云效数据的功能，每条保证都必须钉死
 * ------------------------------------------------------------------ */

function makeFetchStub(script) {
  const calls = [];
  const stub = async (url, init) => {
    const method = (init && init.method) || 'GET';
    const body = init && init.body;
    calls.push({ url: String(url), method, body, parsed: body ? JSON.parse(body) : null });
    const hit = script(String(url), method, calls.length);
    if (hit instanceof Error) throw hit;
    const status = hit.status || 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k) => (String(k).toLowerCase() === 'content-type' ? 'application/json' : null) },
      text: async () => JSON.stringify(hit.json)
    };
  };
  stub.calls = calls;
  return stub;
}

// 读当前值走「按 identifier 重读工作项」（workitem/list），返回工作项对象，
// 工时在 customFields 里；没值的字段整条缺失。
const fvOk = (value) => ({
  json: {
    code: 200,
    result: [{
      identifier: 'w1',
      customFields: (value === null || value === undefined)
        ? []
        : [{ fieldIdentifier: 'F1', fieldClassName: 'float', value: value }]
    }]
  }
});
// ⚠️ 读和写现在都是 POST，只能按**路径**区分：
//    读 = workitem/list，写 = workitem/time 或 workitem/time/estimate
// 按 HTTP 方法判会读写不分，测试会假绿。
const isRead = (url) => /\/workitem\/workitem\/list/.test(String(url));
const OPT = (extra) => Object.assign({ fieldId: 'F1', userId: 'u-me' }, extra || {});

// 13.1 默认 dryRun，一个写请求都不发
{
  sandbox.fetch = makeFetchStub((u, m) => (isRead(u) ? fvOk('2') : { json: { code: 200 } }));
  const r = await api.saveWorkHours('w1', 'est', 5, OPT());
  eq('saveWorkHours 不传 options.dryRun 时默认预演', [r.ok, r.dryRun], [true, true]);
  eq('saveWorkHours 预演返回 旧值→新值', [r.would.from, r.would.to], ['2', 5]);
  eq('saveWorkHours 预演绝不发写请求',
    sandbox.fetch.calls.filter((c) => !isRead(c.url)).length, 0);
}

// 13.2 值没变化就跳过
{
  sandbox.fetch = makeFetchStub((u, m) => (isRead(u) ? fvOk('3') : { json: { code: 200 } }));
  const r = await api.saveWorkHours('w1', 'est', 3, OPT({ dryRun: false }));
  eq('saveWorkHours 值未变化时跳过', [r.ok, r.skipped], [true, 'unchanged']);
  eq('saveWorkHours 值未变化时不发写请求',
    sandbox.fetch.calls.filter((c) => !isRead(c.url)).length, 0);
}

// 13.3 正常写入：路径、方法、body 必须与实证抓包一致
{
  let stored = '2';
  sandbox.fetch = makeFetchStub((u, m) => {
    if (isRead(u)) return fvOk(stored);
    stored = '5';
    return { json: { code: 200 } };
  });
  const r = await api.saveWorkHours('w1', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 写入成功', [r.ok, r.from, r.to], [true, '2', 5]);
  const w = sandbox.fetch.calls.filter((c) => !isRead(c.url))[0];
  ok('saveWorkHours 打到实证的 time/estimate 端点',
    w.url.indexOf('/projex/api/workitem/workitem/time/estimate') === 0, w.url);
  eq('saveWorkHours 用 POST', w.method, 'POST');
  eq('saveWorkHours body 形状与云效前端一致',
    Object.keys(w.parsed).sort(),
    ['containsRestDay', 'description', 'forCreate', 'recordUserIdentifier', 'spentTime', 'type', 'workitemIdentifier']);
  eq('saveWorkHours spentTime 是数字不是字符串', typeof w.parsed.spentTime, 'number');
  eq('saveWorkHours 带上记录人', w.parsed.recordUserIdentifier, 'u-me');
  ok('saveWorkHours 写前读 + 写后复核（至少两次重读工作项）',
    sandbox.fetch.calls.filter((c) => isRead(c.url)).length >= 2);
}

// 13.4 forCreate 恒 false（不论原来有没有值）
{
  let stored = '2';
  sandbox.fetch = makeFetchStub((u, m) => (isRead(u) ? fvOk(stored) : (stored = '5', { json: { code: 200 } })));
  await api.saveWorkHours('w1', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 原来有值时 forCreate 是 false',
    sandbox.fetch.calls.filter((c) => !isRead(c.url))[0].parsed.forCreate, false);

  let empty = null;
  sandbox.fetch = makeFetchStub((u, m) => (isRead(u) ? fvOk(empty) : (empty = '5', { json: { code: 200 } })));
  await api.saveWorkHours('w2', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 原来没值时 forCreate 仍是 false（发 true 会变成建登记记录）',
    sandbox.fetch.calls.filter((c) => !isRead(c.url))[0].parsed.forCreate, false);
}

// 13.5 云效的工时是「一条条记录累加」的，**任何情况都不能重试**
//      实测事故：复核误判失败 → 用户重试 → 同一工作项多了 3 条「1 小时」预计工时
{
  sandbox.fetch = makeFetchStub((u) =>
    (isRead(u) ? fvOk('2') : { json: { code: 400, errorMsg: 'forCreate 不匹配' } }));
  const r = await api.saveWorkHours('w1', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 预计工时失败时 ok=false', r.ok, false);
  eq('saveWorkHours 预计工时只发一次写请求，绝不重试（重试会多一条工时记录）',
    sandbox.fetch.calls.filter((c) => !isRead(c.url)).length, 1);
}

// 13.5b 云效汇总是异步算的：写完立刻读还是旧值，多读几次仍不一致也**不能报失败**
{
  let n = 0;
  sandbox.fetch = makeFetchStub((u) => {
    if (isRead(u)) return fvOk(null);      // 汇总一直没刷新出来
    n += 1;
    return { json: { code: 200 } };
  });
  const r = await api.saveWorkHours('w1', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 复核读不到新值时仍算成功（POST 已 200，报失败会诱导重试）', r.ok, true);
  eq('saveWorkHours 标记为待确认', r.unverified, true);
  ok('saveWorkHours 提示里明确警告不要重复提交',
    String(r.hint).indexOf('不要重复提交') >= 0, r.hint);
  eq('saveWorkHours 复核失败也只写了一次', n, 1);
  ok('saveWorkHours 复核会多试几次再放弃',
    sandbox.fetch.calls.filter((c) => isRead(c.url)).length >= 3,
    sandbox.fetch.calls.filter((c) => isRead(c.url)).length);
}

// 13.5c 汇总延迟一会儿刷出来了 → 正常算成功，不带待确认标记
{
  let reads = 0;
  sandbox.fetch = makeFetchStub((u) => {
    if (isRead(u)) { reads += 1; return fvOk(reads <= 2 ? null : '5'); }
    return { json: { code: 200 } };
  });
  const r = await api.saveWorkHours('w1', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 汇总延迟后刷出来 → 正常成功', [r.ok, !!r.unverified], [true, false]);
}

// 13.6 forCreate 恒为 false —— 发 true 会变成「创建工时登记记录」而不是设置字段
//      实测事故：对空值发 forCreate:true，工时明细里多了 3 条记录，
//      但列表的「预计工时」列始终是空的（customFields 里根本没有那个字段）
{
  let stored = null;
  sandbox.fetch = makeFetchStub((u) => (isRead(u) ? fvOk(stored) : (stored = '5', { json: { code: 200 } })));
  await api.saveWorkHours('w-empty', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 原来没值时 forCreate 也必须是 false',
    sandbox.fetch.calls.filter((c) => !isRead(c.url))[0].parsed.forCreate, false);

  stored = '2';
  sandbox.fetch = makeFetchStub((u) => (isRead(u) ? fvOk(stored) : (stored = '5', { json: { code: 200 } })));
  await api.saveWorkHours('w-has', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 原来有值时 forCreate 是 false',
    sandbox.fetch.calls.filter((c) => !isRead(c.url))[0].parsed.forCreate, false);
}

// 13.7 两次都失败 → 明确失败，并带出每次尝试的诊断
{
  sandbox.fetch = makeFetchStub((u, m) =>
    (isRead(u) ? fvOk('2') : { json: { code: 400, errorMsg: '参数错误', traceId: 'tid-1' } }));
  const r = await api.saveWorkHours('w1', 'est', 5, OPT({ dryRun: false }));
  eq('saveWorkHours 全部失败时 ok=false', r.ok, false);
  eq('saveWorkHours 失败时只尝试一次（绝不重试）', (r.attempts || []).length, 1);
  ok('saveWorkHours 失败详情带云效原话', String(r.attempts[0]).indexOf('参数错误') >= 0, r.attempts[0]);
  ok('saveWorkHours 失败详情带 traceId', String(r.attempts[0]).indexOf('tid-1') >= 0, r.attempts[0]);
}

// 13.8 未登录是致命错，直接抛出
{
  sandbox.fetch = makeFetchStub(() => ({ status: 200, json: { code: 401, errorMsg: '未登录' } }));
  let threw = null;
  try { await api.saveWorkHours('w1', 'est', 5, OPT({ dryRun: false })); } catch (e) { threw = e; }
  ok('saveWorkHours 未登录时抛错', threw !== null);
}

// 13.9 实际工时是「登记累加」，不是赋值 —— 写的必须是增量，且**绝不能重试**
{
  let stored = '2';
  sandbox.fetch = makeFetchStub((u, m) => {
    if (isRead(u)) return fvOk(stored);
    stored = '7';                       // 云效把登记累加上去
    return { json: { code: 200 } };
  });
  const r = await api.saveWorkHours('w1', 'act', 7, OPT({ dryRun: false }));
  eq('saveWorkHours 实际工时写入成功', r.ok, true);
  const w = sandbox.fetch.calls.filter((c) => !isRead(c.url))[0];
  ok('saveWorkHours 实际工时打到 time 端点（不是 time/estimate）',
    /\/projex\/api\/workitem\/workitem\/time\?/.test(w.url), w.url);
  eq('saveWorkHours 实际工时写的是增量而不是目标值', w.parsed.actualTime, 5);
  eq('saveWorkHours 实际工时 body 形状与云效前端一致',
    Object.keys(w.parsed).sort(),
    ['actualTime', 'containsRestDay', 'description', 'gmtEnd', 'gmtStart',
      'recordUserIdentifier', 'type', 'workitemIdentifier']);
  ok('saveWorkHours gmtStart 带时区偏移而不是 UTC 的 Z',
    /[+-]\d{2}:\d{2}$/.test(w.parsed.gmtStart), w.parsed.gmtStart);
  eq('saveWorkHours 实际工时返回增量供界面展示', r.delta, 5);
}

// 13.9b 登记是追加操作：失败也**绝不能重试**，否则会多登记一条
{
  sandbox.fetch = makeFetchStub((u, m) =>
    (isRead(u) ? fvOk('2') : { json: { code: 400, errorMsg: '登记失败' } }));
  const r = await api.saveWorkHours('w1', 'act', 7, OPT({ dryRun: false }));
  eq('saveWorkHours 实际工时失败时 ok=false', r.ok, false);
  eq('saveWorkHours 实际工时只发一次请求，绝不重试（重试会多登记一条）',
    sandbox.fetch.calls.filter((c) => !isRead(c.url)).length, 1);
}

// 13.9c 想把实际工时改小 → 云效没有「负登记」，必须明确拒绝而不是乱写
{
  sandbox.fetch = makeFetchStub((u, m) => (isRead(u) ? fvOk('8') : { json: { code: 200 } }));
  const r = await api.saveWorkHours('w1', 'act', 3, OPT({ dryRun: false }));
  eq('saveWorkHours 实际工时调小时拒绝', r.ok, false);
  eq('saveWorkHours 调小时标记需要人工处理', r.needsManual, true);
  ok('saveWorkHours 调小时说清该怎么办', String(r.error).indexOf('删掉对应的登记记录') >= 0, r.error);
  eq('saveWorkHours 调小时一个写请求都不发',
    sandbox.fetch.calls.filter((c) => !isRead(c.url)).length, 0);
}

// 13.9d 预计工时是赋值语义，写的就是目标值本身
{
  let stored = '2';
  sandbox.fetch = makeFetchStub((u, m) => (isRead(u) ? fvOk(stored) : (stored = '7', { json: { code: 200 } })));
  await api.saveWorkHours('w1', 'est', 7, OPT({ dryRun: false }));
  eq('saveWorkHours 预计工时写的是目标值本身（不是增量）',
    sandbox.fetch.calls.filter((c) => !isRead(c.url))[0].parsed.spentTime, 7);
}

// 13.10 非法工时值直接拒绝
{
  sandbox.fetch = makeFetchStub(() => ({ json: { code: 200 } }));
  const bad = await api.saveWorkHours('w1', 'est', -1, OPT({ dryRun: false }));
  eq('saveWorkHours 负数工时被拒绝', bad.ok, false);
  eq('saveWorkHours 拒绝非法值时不发请求', sandbox.fetch.calls.length, 0);
}

sandbox.fetch = () => Promise.reject(new Error('smoke-test 不联网'));

/* ------------------------------------------------------------------ *
 * 14. 扩展管道层：content.js / background.js
 *     这两个文件决定「点图标 / 按 Alt+H 有没有反应」，用独立沙箱模拟 chrome API
 * ------------------------------------------------------------------ */

function makeContentSandbox(hostname, yxwt) {
  const listeners = { keydown: [], DOMContentLoaded: [] };
  const msgListeners = [];
  const box = {
    console: { warn() {}, log() {} },
    setTimeout,
    clearTimeout,
    location: { hostname: hostname, href: 'https://' + hostname + '/projex/workitem', pathname: '/projex/workitem', hash: '' },
    document: {
      readyState: 'complete',
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
      removeEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} })
    },
    chrome: { runtime: { onMessage: { addListener(fn) { msgListeners.push(fn); } } } },
    __listeners: listeners,
    __msgListeners: msgListeners
  };
  box.window = box;
  box.self = box;
  box.globalThis = box;
  box.window.YXWT = yxwt;
  vm.createContext(box);
  vm.runInContext(readFileSync(path.join(ROOT, 'src/content.js'), 'utf8'), box, { filename: 'content.js' });
  return box;
}

const mkKey = (over) => Object.assign(
  { altKey: true, ctrlKey: false, metaKey: false, code: 'KeyH', key: 'h',
    target: { nodeType: 1, tagName: 'DIV', getAttribute: () => '' },
    preventDefault() { this.__pd = true; }, stopPropagation() {} },
  over || {}
);

// 14.1 只在云效域名下生效
{
  const calls = [];
  const box = makeContentSandbox('example.com', { panel: { toggle() { calls.push('toggle'); } }, summarybar: { init() { calls.push('init'); } } });
  eq('content 非云效域名不注册 keydown', (box.__listeners.keydown || []).length, 0);
  eq('content 非云效域名不注册消息监听', box.__msgListeners.length, 0);
  eq('content 非云效域名不初始化合计条', calls.length, 0);
}

// 14.2 云效域名下正常注册，Alt+H 触发面板
{
  const calls = [];
  const box = makeContentSandbox('devops.aliyun.com', {
    panel: { toggle() { calls.push('toggle'); } },
    summarybar: { init() { calls.push('init'); } }
  });
  eq('content 云效域名下注册 keydown', box.__listeners.keydown.length, 1);
  eq('content 云效域名下初始化合计条', calls.filter((c) => c === 'init').length, 1);

  const fire = (over) => { const e = mkKey(over); box.__listeners.keydown[0](e); return e; };
  const e1 = fire();
  eq('content Alt+H 打开面板', calls.filter((c) => c === 'toggle').length, 1);
  ok('content Alt+H 阻止了默认行为', e1.__pd === true);

  // macOS 上 Alt+H 的 e.key 是 '˙'
  fire({ code: '', key: '˙' });
  eq('content macOS 的 ˙ 也能触发', calls.filter((c) => c === 'toggle').length, 2);

  // 组合键不抢
  fire({ ctrlKey: true });
  fire({ metaKey: true });
  fire({ altKey: false });
  eq('content Ctrl/Cmd/无 Alt 时不触发', calls.filter((c) => c === 'toggle').length, 2);

  // 输入框里不抢快捷键
  ['INPUT', 'TEXTAREA', 'SELECT'].forEach((tag) => {
    fire({ target: { nodeType: 1, tagName: tag, getAttribute: () => '' } });
  });
  fire({ target: { nodeType: 1, tagName: 'DIV', isContentEditable: true, getAttribute: () => '' } });
  fire({ target: { nodeType: 1, tagName: 'DIV', getAttribute: (k) => (k === 'role' ? 'textbox' : '') } });
  eq('content 输入框/富文本里不抢 Alt+H', calls.filter((c) => c === 'toggle').length, 2);

  // shadow DOM 里的输入框要靠 composedPath 识别
  fire({
    target: { nodeType: 1, tagName: 'DIV', getAttribute: () => '' },
    composedPath: () => [{ nodeType: 1, tagName: 'INPUT', getAttribute: () => '' }]
  });
  eq('content shadow DOM 里的 input 也不抢（composedPath）',
    calls.filter((c) => c === 'toggle').length, 2);
}

// 14.3 消息通道
{
  const calls = [];
  let detectResult = { estimated: { id: 'x', name: '预计工时' } };
  const box = makeContentSandbox('devops.aliyun.com', {
    panel: { toggle() { calls.push('toggle'); } },
    summarybar: { init() {} },
    detect: {
      clearCache() { calls.push('clearCache'); },
      fieldMap(force) { calls.push('fieldMap:' + force); return Promise.resolve(detectResult); }
    }
  });
  const onMessage = box.__msgListeners[0];

  let resp = null;
  const ret1 = onMessage({ type: 'YXWT_TOGGLE_PANEL' }, {}, (r) => { resp = r; });
  eq('content TOGGLE 消息同步回响应', [ret1, resp && resp.ok], [false, true]);
  eq('content TOGGLE 消息调用了 panel.toggle', calls.filter((c) => c === 'toggle').length, 1);

  eq('content 未知消息不占用响应通道',
    onMessage({ type: 'SOMETHING_ELSE' }, {}, () => {}), undefined);
  eq('content 空消息不占用响应通道', onMessage(null, {}, () => {}), undefined);

  const ret2 = onMessage({ type: 'YXWT_REDETECT_FIELDS' }, {}, (r) => { resp = r; });
  eq('content REDETECT 返回 true 占住异步通道', ret2, true);
  await new Promise((r) => setTimeout(r, 0));
  eq('content REDETECT 先清缓存再强制探测',
    [calls.indexOf('clearCache') >= 0, calls.indexOf('fieldMap:true') >= 0], [true, true]);
  eq('content REDETECT 回传探测结果', resp && resp.ok, true);

  // 探不到字段时要给人话，不能只回 ok:false
  detectResult = null;
  onMessage({ type: 'YXWT_REDETECT_FIELDS' }, {}, (r) => { resp = r; });
  await new Promise((r) => setTimeout(r, 0));
  eq('content REDETECT 探不到字段时 ok=false', resp.ok, false);
  ok('content REDETECT 失败时给出可操作的说明', String(resp.error).length > 6, resp.error);
}

// 14.4 面板模块没就绪时不能崩
{
  const box = makeContentSandbox('devops.aliyun.com', { summarybar: { init() {} } });
  let resp = null;
  const ret = box.__msgListeners[0]({ type: 'YXWT_TOGGLE_PANEL' }, {}, (r) => { resp = r; });
  eq('content 面板未就绪时不抛异常，回报 ok=false', [ret, resp.ok], [false, false]);
  ok('content 面板未就绪时带出原因', String(resp.error).indexOf('未就绪') >= 0, resp.error);
}

/* ---- background.js ---- */

function makeBgSandbox() {
  const rec = { created: [], sent: [], badge: [], title: [], optionsOpened: 0, reloaded: [] };
  const hooks = {};
  const box = {
    console: { warn() {}, log() {} },
    setTimeout: () => 0,
    clearTimeout,
    chrome: {
      action: {
        onClicked: { addListener(fn) { hooks.click = fn; } },
        setBadgeText: async (o) => { rec.badge.push(o); },
        setBadgeBackgroundColor: async () => {},
        setTitle: async (o) => { rec.title.push(o); }
      },
      tabs: {
        create: async (o) => { rec.created.push(o); },
        reload: async (id) => { rec.reloaded.push(id); },
        sendMessage: async (id, msg) => {
          rec.sent.push({ id, msg });
          if (rec.__failSend) throw new Error('Could not establish connection');
        }
      },
      runtime: {
        onMessage: { addListener(fn) { hooks.msg = fn; } },
        onInstalled: { addListener(fn) { hooks.installed = fn; } },
        openOptionsPage: () => { rec.optionsOpened += 1; return Promise.resolve(); }
      }
    },
    __rec: rec,
    __hooks: hooks
  };
  box.window = box; box.self = box; box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(readFileSync(path.join(ROOT, 'background.js'), 'utf8'), box, { filename: 'background.js' });
  return box;
}

{
  const bg = makeBgSandbox();
  ok('background 注册了图标点击监听', typeof bg.__hooks.click === 'function');
  ok('background 注册了消息监听（面板要靠它代开设置页）', typeof bg.__hooks.msg === 'function');

  await bg.__hooks.click({ id: 1, url: 'https://devops.aliyun.com/projex/workitem' });
  eq('background 云效页面点图标 -> 发切换面板消息',
    bg.__rec.sent.map((x) => x.msg.type), ['YXWT_TOGGLE_PANEL']);
  eq('background 云效页面点图标不新开标签页', bg.__rec.created.length, 0);

  await bg.__hooks.click({ id: 2, url: 'https://www.baidu.com/' });
  eq('background 非云效页面点图标 -> 打开云效',
    bg.__rec.created.map((x) => x.url), ['https://devops.aliyun.com/projex/workitem']);

  await bg.__hooks.click({ id: 3 });
  eq('background 拿不到 url 时也走「打开云效」', bg.__rec.created.length, 2);
}

// 关键：content script 没注入时**绝不能替用户刷新页面**
// 云效的描述框、评论框都不自动保存，一次静默 reload 会让用户白写
{
  const bg = makeBgSandbox();
  bg.__rec.__failSend = true;
  await bg.__hooks.click({ id: 7, url: 'https://devops.aliyun.com/projex/workitem' });
  eq('background sendMessage 失败时绝不 reload 用户页面', bg.__rec.reloaded.length, 0);
  ok('background sendMessage 失败时改用徽标提示',
    bg.__rec.badge.length > 0 && bg.__rec.badge[0].text === '刷新', bg.__rec.badge);
  ok('background 提示文案说清要刷新',
    String((bg.__rec.title[0] || {}).title).indexOf('刷新') >= 0, bg.__rec.title);
}

{
  const bg = makeBgSandbox();
  let resp = null;
  bg.__hooks.msg({ type: 'YXWT_OPEN_OPTIONS' }, {}, (r) => { resp = r; });
  await new Promise((r) => setTimeout(r, 0));
  eq('background 收到 OPEN_OPTIONS 打开设置页', bg.__rec.optionsOpened, 1);
  eq('background 未知消息不处理', bg.__hooks.msg({ type: 'X' }, {}, () => {}), undefined);

  bg.__hooks.installed({ reason: 'install' });
  eq('background 首次安装打开设置页', bg.__rec.optionsOpened, 2);
  bg.__hooks.installed({ reason: 'update' });
  eq('background 版本更新时不打扰用户', bg.__rec.optionsOpened, 2);
}

/* ------------------------------------------------------------------ *
 * 15. summarybar 分组标签检测
 *     页面上「按状态分组：已完成 2467 / 待处理 25」那排标签，
 *     选中哪一个决定了统计范围。认错了数字就全错，必须钉死。
 * ------------------------------------------------------------------ */

// 用真实 DOM 结构造假页面（结构取自云效实际页面：[role=tab] + aria-selected + 文本带条数）
function makeTabDom(spec) {
  const nodes = [];
  const mkTab = (txt, selected, cls, parent) => {
    const el = {
      textContent: txt,
      className: cls || 'next-tabs-tab' + (selected ? ' active' : ''),
      parentElement: parent,
      getAttribute: (k) => (k === 'aria-selected' ? (selected ? 'true' : 'false') : null)
    };
    nodes.push(el);
    return el;
  };
  spec.forEach((group) => {
    const parent = { __id: group.parent };
    group.tabs.forEach((t) => mkTab(t.txt, !!t.on, t.cls, parent));
  });
  sandbox.document.querySelectorAll = (sel) =>
    (String(sel).indexOf('role="tab"') >= 0 ? nodes : []);
  return nodes;
}

load('src/ui.js');
load('src/panel.js');
load('src/summarybar.js');
const sb = YXWT.summarybar;
const summarybarSource = readFileSync(path.join(ROOT, 'src/summarybar.js'), 'utf8');
const optionsSource = readFileSync(path.join(ROOT, 'options.js'), 'utf8');
const optionsHtml = readFileSync(path.join(ROOT, 'options.html'), 'utf8');

ok('summarybar 展开和折叠品牌区都允许拖动',
  summarybarSource.includes("const brandButton = button && button.classList.contains('yxwt-sb__brand');") &&
  summarybarSource.includes('if (button && !brandButton) return;'));
ok('summarybar 品牌按钮自己持有 pointer capture，轻点仍能折叠展开',
  summarybarSource.includes('captureTarget = brandButton ? button : bar;'));
ok('summarybar 展开品牌区显示可拖动光标',
  summarybarSource.includes(".yxwt-sb__brand{appearance:none;border:0;font:inherit;cursor:grab;touch-action:none;}"));
ok('summarybar 空配置保留旧版、自定义配置走完整概览指标',
  summarybarSource.includes('if (selected.length)') && summarybarSource.includes('customMetrics('));
ok('summarybar 工作日目标人数使用实际选中成员，排除自己后不会多算一人',
  summarybarSource.includes('snapshot.memberErrors, rows, scope.members.length)'));
ok('panel 工作日目标人数跟随包含/排除自己状态',
  panelSource.includes('dailyTarget(), pickedCount()'));
ok('options 改默认范围时同时过滤并保存悬浮条指标',
  optionsSource.includes('summaryItems.normalize(before.summaryBarItems, select.value)') &&
  optionsSource.includes('defaultRange: select.value, summaryBarItems: nextItems'));
ok('options 支持一键恢复悬浮条默认显示',
  optionsSource.includes("savePrefs({ summaryBarItems: [] })"));
const generalSettingOrder = ['id="dateBasis"', 'id="taskScope"', 'id="workDiffBasis"', 'id="defaultRange"']
  .map((needle) => optionsHtml.indexOf(needle));
ok('options 两个新设置紧跟默认归集口径，之后才是默认时间范围',
  generalSettingOrder.every((pos, i) => pos >= 0 && (i === 0 || pos > generalSettingOrder[i - 1])), generalSettingOrder);
ok('options 保存任务状态范围和达标工时口径',
  optionsSource.includes('savePrefs({ taskScope: this.value })') &&
  optionsSource.includes('savePrefs({ workDiffBasis: this.value })'));
ok('summarybar 对快照先按任务状态过滤，并用独立口径计算工作日偏差',
  summarybarSource.includes('NS.stats.filterByTaskScope(snapshot.rows || [], prefs.taskScope)') &&
  summarybarSource.includes('NS.stats.workHoursTotal(rows, prefs.workDiffBasis)'));

const GROUPS = [
  { identifier: '29', name: '已完成', count: 2467 },
  { identifier: '100011', name: '开发完成', count: 454 },
  { identifier: '100005', name: '待处理', count: 25 },
  { identifier: '30', name: '已修复', count: 27 }
];

// 15.1 正常识别 aria-selected 的那一个
{
  makeTabDom([{ parent: 'g', tabs: [
    { txt: '已完成2467' }, { txt: '开发完成454' }, { txt: '待处理25', on: true }, { txt: '已修复27' }
  ] }]);
  const p = sb._detectActiveGroup(GROUPS);
  eq('分组检测：认出 aria-selected 的标签', p && p.identifier, '100005');
  eq('分组检测：带出分组名', p && p.name, '待处理');
}

// 15.2 转成 groupCondition，形状必须与云效实证一致
{
  const c = sb._groupConditionOf({ identifier: 'status', className: 'status' },
    { identifier: '100005', name: '待处理' });
  eq('groupCondition 形状与云效实证一致', c,
    { fieldIdentifier: 'status', className: 'status', format: 'list', value: ['100005'], operator: 'EQUALS' });
  eq('groupCondition 的 value 是 identifier 不是名字', c.value, ['100005']);
}

// 15.3 页面上别处的 tabs（详情抽屉「动态&评论 / 子项 / 工时」）不能被误判
{
  makeTabDom([
    { parent: 'drawer', tabs: [{ txt: '动态&评论' }, { txt: '子项0', on: true }, { txt: '工时' }] }
  ]);
  eq('分组检测：无关的 tabs 不误判', sb._detectActiveGroup(GROUPS), null);
}

// 15.4 页面同时存在分组 tabs 和抽屉 tabs 时，挑对的那一组
{
  makeTabDom([
    { parent: 'drawer', tabs: [{ txt: '动态&评论', on: true }, { txt: '子项0' }] },
    { parent: 'group', tabs: [{ txt: '已完成2467' }, { txt: '待处理25', on: true }, { txt: '已修复27' }] }
  ]);
  eq('分组检测：多组 tabs 时挑名字对得上的那组',
    (sb._detectActiveGroup(GROUPS) || {}).identifier, '100005');
}

// 15.4b 只有一个标签名碰巧撞上分组名（比如抽屉里恰好有个「已完成」tab）→ 不能认
//       这一条专门守住「至少两个标签对得上才敢认」那条判据
{
  makeTabDom([{ parent: 'drawer', tabs: [
    { txt: '已完成', on: true },        // 名字撞上了分组名
    { txt: '备注' }, { txt: '附件' }
  ] }]);
  eq('分组检测：只有一个名字偶然撞上时不认（否则抽屉 tabs 会被当成分组）',
    sb._detectActiveGroup(GROUPS), null);
}

// 15.5 「取消分组」后没有选中项 → 不筛，统计全视图
{
  makeTabDom([{ parent: 'g', tabs: [{ txt: '已完成2467' }, { txt: '待处理25' }] }]);
  eq('分组检测：没有选中项时返回 null', sb._detectActiveGroup(GROUPS), null);
}

// 15.6 aria-selected 缺失时用 class 兜底
{
  makeTabDom([{ parent: 'g', tabs: [
    { txt: '已完成2467', cls: 'next-tabs-tab' },
    { txt: '待处理25', cls: 'next-tabs-tab active' }
  ] }]);
  const nodes = sandbox.document.querySelectorAll('[role="tab"]');
  nodes.forEach((n) => { n.getAttribute = () => null; });   // 模拟没有 aria
  eq('分组检测：aria 缺失时靠 class 兜底',
    (sb._detectActiveGroup(GROUPS) || {}).identifier, '100005');
}

// 15.7 标签上的条数与后端对不上 → 说明认错了，宁可不筛也不给错数字
{
  makeTabDom([{ parent: 'g', tabs: [
    { txt: '已完成2467' }, { txt: '待处理999', on: true }
  ] }]);
  eq('分组检测：条数对不上时放弃筛选（宁可全视图也不给错数）',
    sb._detectActiveGroup(GROUPS), null);
}

// 15.8 空分组 / 没有 tabs 时不崩
{
  sandbox.document.querySelectorAll = () => [];
  eq('分组检测：页面没有 tabs 时返回 null', sb._detectActiveGroup(GROUPS), null);
  eq('分组检测：分组列表为空时返回 null', sb._detectActiveGroup([]), null);
  eq('groupConditionOf：缺参数时返回 null', sb._groupConditionOf(null, { identifier: 'x' }), null);
}

/* ------------------------------------------------------------------ *
 * 16. gm-shim —— 油猴版把 GM_* 伪造成 chrome.* 的垫片
 *
 * 这层是油猴版和扩展版共用同一份 store.js 的前提，语义错一点就是「设置存不住」
 * 或者「改了不生效」，而且在浏览器里只走得到读写主路径，clear / 变更通知得在这测。
 * ------------------------------------------------------------------ */

{
  // 独立沙箱：gm-shim 会往 window.YXWT 上挂东西，别污染上面测过的那套
  const gmMem = {};
  const gmListeners = {};
  const gmBox = {
    console,
    setTimeout,
    clearTimeout,
    GM_getValue: (k, d) => (k in gmMem ? gmMem[k] : d),
    GM_setValue: (k, v) => { gmMem[k] = v; },
    GM_addValueChangeListener: (k, fn) => { (gmListeners[k] = gmListeners[k] || []).push(fn); },
    Promise,
    JSON,
    Object,
    Array,
    document: { title: 'x' },
    location: { href: 'https://devops.aliyun.com/projex/workitem', hostname: 'devops.aliyun.com' }
  };
  gmBox.window = gmBox;
  gmBox.globalThis = gmBox;
  vm.createContext(gmBox);
  vm.runInContext(readFileSync(path.join(ROOT, 'src/gm-shim.js'), 'utf8'), gmBox,
    { filename: 'src/gm-shim.js' });

  const shim = gmBox.window.YXWT.__chromeShim;
  const local = shim.storage.local;
  const get = (keys) => new Promise((res) => local.get(keys, res));
  const set = (payload) => new Promise((res) => local.set(payload, res));

  ok('gm-shim 导出 chrome 三件套', !!(shim.storage && shim.runtime && shim.tabs));
  eq('gm-shim runtime.lastError 必须是假值（store.js 每次调用后都读它）',
    !shim.runtime.lastError, true);

  eq('gm-shim 初始为空', await get(null), {});
  await set({ prefs: { theme: 'dark' }, version: 1 });
  eq('gm-shim 写入后能读回', await get(null), { prefs: { theme: 'dark' }, version: 1 });
  eq('gm-shim 全部数据落在一个 GM key 上', Object.keys(gmMem), ['yxwt.config']);
  eq('gm-shim 存的是 JSON 字符串（方便在油猴存储面板里直接看）',
    typeof gmMem['yxwt.config'], 'string');

  // set 是浅合并：只动传进来的顶层 key，别的原样留着（store.setPrefs 依赖这个语义）
  await set({ version: 2 });
  eq('gm-shim set 只覆盖传入的 key', await get(null), { prefs: { theme: 'dark' }, version: 2 });

  // 返回值必须是深拷贝，否则调用方改一下返回对象就把「存储」也改了
  const got = await get(null);
  got.prefs.theme = 'light';
  eq('gm-shim 读出来的是拷贝，改它不影响存储', (await get(null)).prefs.theme, 'dark');

  eq('gm-shim 按数组取键', await get(['version']), { version: 2 });
  eq('gm-shim 取不存在的键给 undefined', await get(['nope']), { nope: undefined });

  const seen = [];
  shim.storage.onChanged.addListener((changes) => seen.push(changes));
  await set({ version: 3 });
  await new Promise((r) => setTimeout(r, 0));
  eq('gm-shim 本页写入也要派发变更（GM 只通知别的标签页）',
    seen.length && seen[seen.length - 1].version, { oldValue: 2, newValue: 3 });

  await new Promise((res) => local.clear(res));
  eq('gm-shim clear 清空', await get(null), {});

  // 跨标签页：别的页面改了 GM 值 -> 本页收到变更
  const remote = gmListeners['yxwt.config'][0];
  const before = seen.length;
  remote('yxwt.config', JSON.stringify({ version: 9 }), JSON.stringify({ version: 10 }), true);
  await new Promise((r) => setTimeout(r, 0));
  eq('gm-shim 跨标签页变更能传进来',
    seen.length > before && seen[seen.length - 1].version, { oldValue: 9, newValue: 10 });
}

/* ------------------------------------------------------------------ *
 * 结果
 * ------------------------------------------------------------------ */

if (failures.length) {
  console.error('\n✗ 冒烟测试失败 ' + failures.length + ' 项（通过 ' + pass + ' 项）：\n');
  failures.forEach((f) => console.error('  · ' + f));
  console.error('');
  process.exit(1);
}
console.log('✓ 冒烟测试全绿：' + pass + ' 项断言通过');
console.log('  覆盖 util / stats(normalize·summarize·groupBy·byMember·byDay·overdue·missingEst·toCsv·toMarkdown) / store / api(viewFilterToGroups·normalizeViewSpace) / detect(matchFields 跨企业·简繁英·describe) / api.saveWorkHours(工时写入·实证端点) / content.js+background.js(快捷键·消息·图标) / summarybar(分组标签检测) / gm-shim(油猴版 chrome API 垫片)');
