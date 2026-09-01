# 云效工时统计 —— 构建规格书（模块契约）

面向 **Chrome 应用商店公开发布**。任何组织 id、用户 id、字段 id 都**必须运行时探测**，
代码里出现 `101586` / `101587` / `61dbcd72...` 之类的硬编码即为不合格。
先读 `docs/API-RESEARCH.md`（实测接口文档），本文件只定义模块契约。

## 0. 全局约定

- 纯原生 JS，**无构建步骤、无 npm 依赖、无 CDN**（商店审核友好 + 直接 load unpacked）。
- Manifest V3。content script 运行在 isolated world，同源调云效接口。
- 所有 content-script 模块写成 IIFE，挂到全局命名空间：
  ```js
  (function () {
    const NS = (window.YXWT = window.YXWT || {});
    NS.util = { /* ... */ };
  })();
  ```
- manifest 里的加载顺序（**依赖只能向前**）：
  `util.js → summary-items.js → store.js → api.js → detect.js → stats.js → workcalendar.js → range-data.js → ui.js → panel.js → summarybar.js → content.js`
- 语言：界面中文。代码注释中文，只在不显而易见处写。
- 缩进 2 空格，单引号，无分号结尾风格**不用**——统一**带分号**。
- 严禁 `eval`、`innerHTML` 拼接用户数据（用 `textContent` 或 `escapeHtml`）。
- 严禁把任何数据发到云效以外的域名。没有埋点，没有远程配置。

## 1. src/util.js → `YXWT.util`

```js
pad2(n) -> '07'
toYMD(dateOrTs) -> '2026-08-21'
parseYMD('2026-08-21') -> Date(本地时间 00:00:00)
fmtHours(n) -> '25' | '25.5'      // 整数不带小数，最多一位小数
fmtDateTimeForApi(ymd, endOfDay=false) -> '2026-08-21 00:00:00' | '2026-08-21 23:59:59'
weekStart(date) -> Date            // 周一为一周之始
addDays(date, n) -> Date
daysBetween(startYMD, endYMD) -> ['2026-08-17', ...]   // 含首尾，上限 400 天
isWeekend(ymd) -> boolean
rangePresets(today = new Date()) -> [
  {key:'today',     label:'今天',   start, end},
  {key:'yesterday', label:'昨天',   start, end},
  {key:'thisWeek',  label:'本周',   start, end},   // 周一~周日
  {key:'lastWeek',  label:'上周',   start, end},
  {key:'thisMonth', label:'本月',   start, end},
  {key:'lastMonth', label:'上月',   start, end},
  {key:'last7',     label:'近7天',  start, end},
  {key:'last30',    label:'近30天', start, end}
]                                   // start/end 均为 'YYYY-MM-DD' 字符串
escapeHtml(s) -> string
debounce(fn, ms) -> fn
pmap(arr, fn, limit=4) -> Promise<Array>    // 并发受限 map，保持顺序，单项失败返回 {__error}
downloadText(filename, text, mime) -> void  // 用 Blob + a[download]，用完 revokeObjectURL
copyText(text) -> Promise<boolean>          // navigator.clipboard，失败降级 textarea+execCommand
```

## 2. src/store.js → `YXWT.store`

`chrome.storage.local` 封装，全部方法返回 Promise。

```js
const DEFAULTS = {
  version: 1,
  fieldMap: {},   // { [orgId]: FieldMap }
  contacts: {},   // { [orgId]: { [userId]: {id, name, avatar} } }
  rangeSnapshots: {}, // 最近 12 个“组织+成员+口径+起止日期”的本地区间快照
  prefs: {
    dailyTargetHours: 8,
    dateBasis: 'planEnd',      // 'planEnd' | 'finishTime' | 'planStart'
    defaultRange: 'thisWeek',
    summaryBarItems: [],       // 空数组沿用旧版；非空按选择显示且强制包含 range
    members: [],               // 团队视图里额外纳入的 userId 数组（不含自己）
    includeSelf: true,         // 是否把自己计入团队统计
    showSummaryBar: true,
    excludeCancelled: true,    // 统计时是否排除"已取消"状态
    warnMissingEst: true,      // 是否提醒"没填工时"的任务（标红 + 置顶 + 合计条角标）
    hoursBasis: 'estimated',   // 单值指标的基准：'estimated' | 'actual' | 'both'
    theme: 'auto'              // 'auto' | 'light' | 'dark'
  }
};

YXWT.store = {
  get(),                            // -> 完整配置（与 DEFAULTS 深合并）
  set(patch),                       // 浅合并顶层 key
  setPrefs(patch),                  // 合并 prefs
  getFieldMap(orgId), setFieldMap(orgId, map),
  getContacts(orgId),               // -> {userId: {id,name,avatar}}
  addContacts(orgId, users),        // users: [{identifier|id, realName|displayName|name, avatar}]，去重合并
  removeContact(orgId, userId),
  getRangeSnapshot(cacheKey),
  setRangeSnapshot(cacheKey, snapshot),
  patchRangeSnapshots(patches),       // 写回成功后修正所有命中工作项的快照，不改变 savedAt
  onChange(cb)                      // 包一层 chrome.storage.onChanged
};
```

`FieldMap` 结构：
```js
{
  estimated: {id:'101586', name:'预计工时'} | null,
  actual:    {id:'101587', name:'实际工时'} | null,
  planStart: {id:'79',     name:'计划开始时间'} | null,
  planEnd:   {id:'80',     name:'计划完成时间'} | null,
  detectedAt: 1787309149000,
  manual: false            // true = 用户在设置页手动指定过，探测不得覆盖
}
```

## 3. src/api.js → `YXWT.api`

只负责网络，不做业务聚合。所有请求同源、`credentials:'include'`。

```js
YXWT.api = {
  req(path, {method='GET', body, base='projex'} = {}),
    // base:'projex' -> 自动加 /projex/api 前缀 和 _input_charset=utf-8
    // base:'raw'    -> path 原样使用
    // code!==200 抛 Error(errorMsg||msg||`云效接口 ${code}`)，Error 上挂 .code 和 .traceId
    // 401/403 或返回 html 时抛 Error('YXWT_NOT_LOGGED_IN')

  me(),               // -> {userId, name, avatar, email, orgId}   见 API-RESEARCH 1.1/1.2
  getUser(userId),    // -> {id, name, avatar}
  getOrg(orgId),      // -> {id, name, logo}
  getView(viewId),    // -> 原始 result

  listWorkitems(opts), // 见下
  getFieldMeta(workitemId),   // -> [{id, name, className, format, type}]，已去重
  getFieldValues(workitemId), // -> 原始 result

  saveFieldValue(workitemId, fieldId, value, {dryRun=true} = {})
};
```

### 3.1 `listWorkitems(opts)`

```js
opts = {
  spaceType: 'User' | 'Project',
  spaceIdentifier: '<userId 或 projectId>',
  scope: 'personal',            // spaceType==='User' 时必填
  category: '',                 // '' | 'Task' | 'Req' | 'Bug'
  conditionGroups: [[cond, ...]],   // 已是对象数组，api 内部负责 JSON.stringify
  orderBy: {fieldIdentifier, order, className, format} | null,
  pageSize: 200,
  maxPages: 20,                 // 安全阀
  onProgress: (loaded, total) => {}
}
// -> {items: [...], total: number, truncated: boolean}
```
必须自动翻页直到 `items.length >= totalCount` 或到 `maxPages`（到上限时 `truncated=true`）。

条件构造辅助（也放在 api 上）：
```js
YXWT.api.cond = {
  user(fieldId, userIds)     -> {fieldIdentifier, operator:'CONTAINS', value:userIds, toValue:null, className:'user', format:'list'},
  dateBetween(fieldId, startYMD, endYMD)
                             -> {fieldIdentifier, operator:'BETWEEN', value:[`${startYMD} 00:00:00`], toValue:`${endYMD} 23:59:59`, className:'date', format:'input'},
  category(values)           -> {fieldIdentifier:'category', operator:'CONTAINS', value:values, className:'category', format:'list'}
};
```

### 3.2 `saveFieldValue` —— 写入，必须极度保守

流程固定为：
1. `dryRun` 为真 → 直接返回 `{ok:true, dryRun:true, would:{workitemId, fieldId, from, to}}`，**不发任何写请求**。
2. 先 `getFieldValues(workitemId)` 读当前值 `from`。
3. 若 `String(from) === String(value)` → 返回 `{ok:true, skipped:'unchanged'}`，不写。
4. 依次尝试候选端点（见 API-RESEARCH 第 5 节），**第一个返回 code===200 的即成功**：
   - `PUT  /projex/api/workitem/workitem/field/value/{workitemId}`  body `{fieldIdentifier, value}`
   - `POST /projex/api/workitem/workitem/field/value/{workitemId}`  body 同上
   - `POST /projex/api/workitem/workitem/field/batch/saveFieldValue` body `{workitemIdentifier, fieldValues:[{fieldIdentifier, value}]}`
   成功的端点形状要 `YXWT.store` 记住（`prefs._writeEndpoint`），下次直接用。
5. 写完再 `getFieldValues` 复核，值不符则返回 `{ok:false, error:'写入后复核不一致'}`。
6. 全部候选都失败 → `{ok:false, error:<最后一条错误>}`，**不得静默成功**。

## 4. src/detect.js → `YXWT.detect`

```js
YXWT.detect = {
  context(),        // -> {userId, name, avatar, orgId, orgName}，结果内存缓存
  fieldMap(force),  // -> FieldMap，优先读 store（manual 的永不覆盖），否则探测后写回 store
  matchFields(metaList)   // 纯函数，便于测试
};
```

`matchFields(metaList)` 规则（**按顺序打分，取最高分**）：
- 候选池：`className ∈ {'float','number','integer'}` 的字段
- 预计工时：`name` 匹配 `/(预计|预估|计划|估算|estimated?|planned?)/i` 且匹配 `/(工时|工时数|小时|hours?)/i`
- 实际工时：`name` 匹配 `/(实际|登记|真实|已用|actual|spent|logged)/i` 且匹配 `/(工时|小时|hours?)/i`
- 若上面没命中，退化为：名字里含"工时"的 float 字段按出现顺序取前两个（第一个=预计，第二个=实际），
  并在返回值里标 `lowConfidence: true`
- 日期字段（`className==='date'`）：`/计划开始|开始时间|start/i` → planStart；
  `/计划完成|计划结束|截止|due|end/i` → planEnd
- **排除** `identifier` 以 `sum` 开头的汇总字段（`sumPlanedLaborHour` 等，是只读 rollup）

`fieldMap()` 的探测样本：调 `listWorkitems({spaceType:'User', spaceIdentifier:me.userId, scope:'personal', pageSize:1, conditionGroups:[[]]})`
取第一条的 `identifier`，再 `getFieldMeta(it)`。若一条都没有，返回 `null` 并让 UI 提示"请先在云效里有至少一个工作项，或到设置页手动指定字段"。

## 5. src/stats.js → `YXWT.stats`

**纯函数，禁止 DOM / 网络 / chrome API。** 这是唯一需要可单测的模块。

```js
YXWT.stats = {
  normalize(items, fieldMap, opts),  // opts:{dateBasis, excludeCancelled}
  summarize(rows),
  groupBy(rows, key),
  byDay(rows, startYMD, endYMD, opts),
  byMember(rows),
  overdue(rows, nowTs),
  isMissingEst(row),                // 未取消 且 est <= 0
  missingEst(rows),                 // -> {count, total, rate, list}
  toMarkdown(rows, opts),
  toCsv(rows)
};
```

### `normalize(items, fieldMap, opts) -> Row[]`
```js
Row = {
  id, sn, subject,
  projectId, project,             // space.identifier / space.name，缺失时 '(无项目)'
  category,                       // category.name || categoryIdentifier
  status,                         // status.name
  stage,                          // statusStage.name
  stageId,                        // statusStage.id (number)
  assigneeId, assignee, avatar,
  est,                            // number，缺失为 0
  act,                            // number，缺失为 0
  planStart, planEnd,             // 'YYYY-MM-DD' | null，来自 customFields[fieldMap.planStart.id]
  finishTime,                     // 'YYYY-MM-DD' | null，来自 item.finishTime 毫秒时间戳
  date,                           // 归集日期：按 opts.dateBasis 取 planEnd/finishTime/planStart，可能为 null
  isCancelled,                    // status.name 含 '取消'
  isDone,                         // !!finishTime —— 真正结束（不看状态名）
  looksDone,                      // 状态名/阶段名含 '完成'，仅供展示，不参与逾期判定
  url                             // `https://devops.aliyun.com/projex/project/${projectId}/task/${id}`
                                  // categoryIdentifier 为 Req -> /req/, Bug -> /bug/, 其余 /task/
}
```
`opts.excludeCancelled` 为真时，把 `isCancelled` 的行剔除。

### `summarize(rows) -> {count, est, act, diff, days, avgPerDay}`
`diff = act - est`。`days` = 有 `date` 的不同日期数。

### `groupBy(rows, key) -> [{key, label, count, est, act}]`
`key ∈ 'project'|'category'|'status'|'stage'|'assignee'`，按 `est` 降序，`est` 相同按 `count` 降序。

### `byDay(rows, startYMD, endYMD, opts) -> [{ymd, weekday, isWeekend, count, est, act, target, deficit}]`
覆盖区间内**每一天**（没有数据的日子也要出现，值为 0）。
`target = isWeekend ? 0 : opts.dailyTargetHours`；`deficit = Math.max(0, target - est)`。

### `overdue(rows, nowTs) -> {total, overdue, rate, list}`
逾期判定：有 `planEnd`，且 **未取消**，且
- **有 `finishTime`**（云效原生字段，真正结束）→ `finishTime > planEnd` 才算逾期；
- **无 `finishTime`** → `nowTs > planEnd 当天 23:59:59` 算逾期。

⚠️ **不要用状态名判断是否完成**。实测：状态叫「开发完成」的任务 `finishTime` 是 `null`，
任务其实没结束，云效自己在列表里仍标它「逾期N天」。状态名各企业叫法不同，
公开插件只能认云效原生的 `finishTime`。`row.isDone` 因此定义为 `!!finishTime`，
状态名像完成的另存 `row.looksDone`，仅供展示。
`rate` 保留 1 位小数的百分数（number，如 12.3）。

### `toMarkdown(rows, opts) -> string`
默认按项目分组的表格 + 合计行，直接可贴日报周报。`opts.groupKey` 可选。

### `toCsv(rows) -> string`
带 UTF-8 BOM（`﻿`），Excel 直接打开不乱码。列：
编号,标题,项目,类别,状态,负责人,预计工时,实际工时,计划开始,计划完成,实际完成,链接

## 6. src/ui.js → `YXWT.ui`

Shadow DOM + 设计系统。**不写业务**。

```js
YXWT.ui = {
  CSS,                       // 全部样式字符串（含 :host 变量、light/dark）
  h(tag, props, ...children),// 极简 createElement；props 支持 class/style/on*/dataset/text/html(禁用)
  mount(hostId),             // 建 host div + attachShadow({mode:'open'})，注入 CSS，返回 {host, root}
  unmount(hostId),
  toast(root, msg, type),    // 'info'|'success'|'error'
  confirmDialog(root, {title, body, okText, cancelText, danger}) // -> Promise<boolean>
};
```

设计要求：
- 设计令牌放 `:host`，暗色走 `@media (prefers-color-scheme: dark)`，并支持 `[data-theme]` 覆盖。
- 主色用云效蓝系但**不要抄它的组件**，要有自己的识别度。
- 字体栈：`-apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif`。
- 数字用 `font-variant-numeric: tabular-nums`。
- 所有浮层 `z-index` 用 `2147483000` 起步，避免被云效盖住。
- 面板宽度自适应，最小 960px，窗口更小时全宽；表格自己横向滚动，页面不横向滚动。

## 7. src/panel.js → `YXWT.panel`

```js
YXWT.panel = { toggle(), open(), close(), isOpen() };
```

布局（全屏遮罩 + 居中卡片）：

**顶栏**：标题「云效工时统计」+ 组织名 + 关闭按钮。

**筛选行**：
- 时间范围：预设按钮组（今天/昨天/本周/上周/本月/上月/近7天/近30天）+ 两个 date input 自定义
- 归集口径下拉：计划完成时间 / 实际完成时间 / 计划开始时间
- 成员：默认「只看我」；点「+ 成员」展开通讯录多选（来自 `store.getContacts`），
  另有「从当前视图导入同事」按钮（扫当前页工作项的 assignedTo 灌进通讯录）
- 「刷新」按钮 + 加载进度文案

**概览卡**：第一行是任务数 / 预计工时 / 实际工时 / 偏差 / 日均工时 / 逾期率等常规统计。
第二行固定从工作日总工时开始，紧跟“实际 − 工作日总工时”的工时偏差，所有时间范围都显示；
本周、本月再追加截止今日工时，以及“实际 − 截止今日工时”的偏差。两种目标偏差均为正数红色、负数绿色，0 使用普通颜色。
原偏差为负显示绿色，正显示橙色；逾期率 >20% 显示红色。

**未填预计工时告警**（`prefs.warnMissingEst`，默认开）：判据 `isMissingEst` = 未取消且 `est <= 0`
（字段整条没值和明确填 0 都算，`row.estMissing` 只用于提示文案的措辞）。
前置条件是「预计工时」字段已识别 —— 字段没识别时全表 est 都是 0，整套告警必须静默，
否则会把字段映射问题误报成漏填。表现：概览上方一条警示（数字取**整个时间区间**，不随搜索/单日下钻变化）、
第 7 张可点的「未填预计」卡（值随当前筛选）、明细行整行标红 + 左侧红条 + 默认置顶、
明细工具条上「只看未填预计（N）」与「未填置顶」两个开关、列表页合计条上红色的「未填预计 N 条」。
行内把预计工时补上后（尚未提交云效时也一样）标红与置顶立即消失，用 `effective()` 取值。

**日历热力图**：
- 按周排列（周一起），每格显示日期 + 工时数
- 颜色深浅按当日预计工时；工作日不足 `dailyTargetHours` 的格子加醒目描边
- 悬浮显示当日任务数/工时；点击某天把明细表筛到那天

**分组统计**：一组 tab（按项目 / 按类别 / 按状态 / 按成员），横向条形 + 数值，前 15 项 + 「其余 N 项」折叠

**明细表**：
- 列：编号 / 标题 / 项目 / 状态 / 负责人 / **预计（可编辑）** / **实际（可编辑）** / 计划完成 / 打开
- 表头点击排序；顶部搜索框过滤标题/编号/项目
- 「预计」「实际」两列都是 input，改动的行高亮；顶部出现「已修改 N 条 · 提交到云效 · 撤销」。
  某一列只在对应字段被**运行时探测**识别到时才可编辑（`fieldMap.estimated` / `fieldMap.actual`），
  否则该列自动降级为只读；可编辑的列在表头带一个 ✎ 标记（`aria-hidden`，不进列名与排序提示）。
  两个字段映射到同一个 id 时（只可能来自设置页手填），一律只保留「实际」列可编辑并给出提示——
  否则同一个字段会被连写两次，后写的静默覆盖先写的。
- 编辑状态按「行 + 字段」两级存：`state.edits[rowId] = { est?: 数值, act?: 数值 }`，只放真正改过的字段；
  失败原因按 `state.failed[rowId + '|' + which] = 错误文案` 存，一行两个字段的错误互不覆盖。
  编辑值按一位小数取整，与 `util.fmtHours` 的展示精度一致——弹窗里确认的数字必须就是写进云效的数字。
- 「按预计工时一键填充」：把**当前筛选可见**、`act===0` 且云效上 `est>0` 的行的实际值设成预计值
  （只改本地，仍需提交）。**只作用于可见行**：无视筛选会误改用户根本看不见的数据。
  填充来源只取云效上的 `r.est`，不取本地还没写回的预计工时——两个字段是各自独立提交的，
  预计那条写失败时实际就会被填成一个从未落库的数。
- 提交流程：`ui.confirmDialog` 列出全部改动（编号 + 标题 + **字段标签** + 旧值 → 新值），
  弹窗标题按本次实际涉及的字段动态生成（如「写回云效：预计工时 / 实际工时」）；
  确认后逐条 `api.saveFieldValue(工作项id, 该条的 fieldId, ..., {dryRun:false})`，显示进度与失败清单，
  失败项保留在表里可重试。真实写入成功后就地更新 `r[which]`，收尾要重绘概览/日历/分组/明细四块
  （日历热力图按 `est` 着色，漏了它会和概览卡对不上）。
  **默认 dryRun 由设置页开关控制，首次使用默认 true；该开关同时管着两列的写回。**

**底部工具条**：复制 Markdown / 导出 CSV / 打开设置

### 数据加载逻辑
```
members = [me, ...prefs.members(仅当用户选了)]
对每个 member 并发（limit 3）:
  api.listWorkitems({
    spaceType:'User', spaceIdentifier: member.id, scope:'personal',
    conditionGroups: [[ cond.user('assignedTo',[member.id]), cond.dateBetween(dateField, start, end) ]],
    orderBy: {fieldIdentifier: dateField, order:'desc', className:'date', format:'input'}
  })
```
`dateBasis==='finishTime'` 时，云效没有可筛的 finishTime 字段 → 改为**用 planEnd 拉一个更宽的区间（前后各扩 90 天）再在本地按 finishTime 过滤**，并在 UI 上标注「实际完成口径为本地过滤，区间外的任务可能不全」。

单个成员失败不能让整体失败：那个人显示为「加载失败（原因）」，其余照常统计。

区间快照按组织、成员集合、归集口径、起止日期、排除取消开关和字段映射签名精确区分。
默认区间首次无快照时加载；切换到其它无快照区间只显示「未加载」，由用户点击后仅加载当前区间。
本月快照记录完整拉取时间；本地自然日变化后首次访问自动重新全量拉取本月。插件写回成功时同步修正所有命中工作项的快照，但不修改完整拉取时间。
概览中的工作日总工时和截止今日工时使用随脚本打包的 2023—2026 法定休假/调休数据；缺失年份退回周一至周五并提示更新脚本。

## 8. src/summarybar.js → `YXWT.summarybar`

在云效工作项列表页底部注入一条常驻统计条。

- 生效路径：`/projex/workitem`（个人视图）和 `/projex/project/*/(task|req|bug|workitem)`
- 读取 `prefs.defaultRange`，与面板共用 `rangeData` 的精确区间查询和本地快照
- `prefs.summaryBarItems` 为空时沿用 `范围 本月 · 共 N 条 · 预计 X h · 实际 Y h · 偏差 Z h`；非空时按选择显示当前区间支持的概览指标，并强制显示“范围”
- 所有区间可选：任务数、预计、实际、偏差、日均、逾期率、未填预计、工作日总工时、工时偏差；本周、本月额外可选截止今日工时及其偏差
- 修改默认时间范围时，必须过滤并持久化现有选择：删除新区间不支持的指标，保留仍支持的指标
- 右侧「详细统计」按钮 → `YXWT.panel.open()`
- 展开时蓝色“工时统计”区域、折叠时蓝色圆点均可拖动；移动超过 3px 才算拖拽，单击仍只负责折叠/展开
- 监听 `hashchange` + `popstate` + 一个 500ms 轮询兜底（云效是 SPA，切视图不触发 hashchange 的情况要兜住）
- 请求要 debounce 800ms，并在切换时取消上一次（用 AbortController 或序号守卫）
- `prefs.showSummaryBar` 为 false 时不注入
- 注入失败 / 接口失败时**静默降级**，只在条上显示「统计失败，点击重试」，绝不弹窗打扰

## 9. src/content.js

```js
// 1) 只在 devops.aliyun.com 运行
// 2) chrome.runtime.onMessage: {type:'YXWT_TOGGLE_PANEL'} -> YXWT.panel.toggle()
// 3) 初始化 summarybar
// 4) 快捷键 Alt+H 打开面板（在 input/textarea/contenteditable 里不触发）
// 5) 顶层 try/catch，任何异常只 console.warn，不能影响云效本身
```

## 10. background.js

```js
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.startsWith('https://devops.aliyun.com/')) {
    try { await chrome.tabs.sendMessage(tab.id, {type:'YXWT_TOGGLE_PANEL'}); }
    catch (e) { chrome.tabs.reload(tab.id); }   // content script 未注入（插件刚装）时刷新一下
  } else {
    chrome.tabs.create({url: 'https://devops.aliyun.com/projex/workitem'});
  }
});
```

## 11. options.html / options.js

设置页（独立页面，不能直接调云效接口，所有需要接口的操作转发给 content script 或只做本地配置）：
- 每日标准工时（number，默认 8）
- 默认归集口径、默认时间范围
- 悬浮条显示项（多选）：空选保持旧版显示；自定义后范围必显；默认范围变化时剔除不适用项
- 统计时排除"已取消"（checkbox）
- 显示列表页合计条（checkbox）
- 主题：跟随系统 / 亮 / 暗
- **写入模式**：只读预演（dry-run，默认）/ 允许写回云效
- 字段映射：显示当前 orgId 的探测结果，可手动填 identifier 覆盖，有「重新探测」按钮
- 通讯录管理：列出已积累的同事，可删除
- 底部：版本号 + 隐私说明链接 + 「清除全部本地数据」

## 12. manifest.json

```jsonc
{
  "manifest_version": 3,
  "name": "云效工时统计",
  "version": "0.1.0",
  "description": "在阿里云云效 Projex 里一键统计工时：列表合计、日历热力图、团队对比、导出日报周报。所有数据只在本地处理。",
  "minimum_chrome_version": "114",
  "permissions": ["storage"],
  "host_permissions": ["https://devops.aliyun.com/*"],
  "background": {"service_worker": "background.js"},
  "content_scripts": [{
    "matches": ["https://devops.aliyun.com/*"],
    "js": ["src/util.js","src/store.js","src/api.js","src/detect.js","src/stats.js","src/ui.js","src/panel.js","src/summarybar.js","src/content.js"],
    "run_at": "document_idle",
    "all_frames": false
  }],
  "action": {"default_title": "云效工时统计（Alt+H）", "default_icon": {...}},
  "options_page": "options.html",
  "icons": {"16":"icons/icon16.png","32":"icons/icon32.png","48":"icons/icon48.png","128":"icons/icon128.png"}
}
```
不要申请 `tabs`、`activeTab` 之外的权限；不要 `<all_urls>`。

## 13. 验收标准

1. `chrome://extensions` 加载 unpacked 无错误，云效页面控制台无 YXWT 报错。
2. 打开云效工作项列表页，底部出现合计条且数字与页面列可核对。
3. Alt+H 或点图标打开面板，默认展示「本周 · 只看我」的统计。
4. 字段映射是探测出来的，代码里 grep 不到 `101586` / `101587`（文档除外）。
5. 团队模式下加 3 个同事，统计能分人出数。
6. 导出的 CSV 用 Excel 打开不乱码；复制的 Markdown 能直接贴进日报。
7. 写入默认 dry-run，确认弹窗里能看到每一条 `旧值 → 新值`。
8. 断网 / 未登录云效时，面板给出明确提示而不是白屏或报错堆栈。
