# 接口契约实证补充（第二轮，2026-08-21）

> 这份是对 `API-RESEARCH.md` 的**实证补丁**，全部结论都在真实账号上跑过。
> 构建完成后必须把这里的三条修正合并进 `src/api.js` / `src/summarybar.js`。

## ✅ 修正一（必现 bug）：系统内置视图的 `spaceIdentifier` 是字面量 `"system"`

云效左侧「工作项视图」里，**系统内置视图**和**用户自建视图**的 view 对象不一样：

| 视图 | `spaceType` | `spaceIdentifier` |
|---|---|---|
| 我负责的 / 近期我参与 / 近期我创建 / 待我验证 / 我收藏的 / 已归档 | `User` | **`"system"`** |
| 用户自己保存的视图（如「每日任务」「我负责的-工时篇」） | `User` | 真实 userId（24 位 hex） |

直接把 `view.spaceIdentifier` 塞给 `workitem/list` 接口，系统视图会**恒定返回 0 条**。

**修法**（已实测通过）：
```js
const isUserSpace = (view.spaceType || 'User') === 'User';
const raw = view.spaceIdentifier;
const spaceIdentifier = (isUserSpace && !/^[0-9a-f]{24}$/.test(String(raw || '')))
  ? currentUserId          // 回落到当前登录用户
  : raw;
```

验证结果（左边是插件算出来的，右边是云效侧边栏显示的）：

| 视图 | 修复前 | 修复后 | 侧边栏 |
|---|---|---|---|
| 我负责的 | 0 ❌ | **504** | 504 ✅ |
| 近期我参与 | 0 ❌ | **1** | 1 ✅ |
| 近期我创建 | 0 ❌ | **82** | 82 ✅ |
| 待我验证 | 0 | **0** | 0 ✅ |
| 我收藏的 | 0 | **0** | 0 ✅ |

## ✅ 修正二：`view.filter → conditionGroups` 转换函数（已实证的正确版本）

```js
const unwrap = (v) => (v && typeof v === 'object' && 'value' in v) ? v.value : v;

function viewFilterToGroups(filterStr) {
  let raw = [];
  try { raw = JSON.parse(filterStr || '[]'); } catch (e) { return [[]]; }
  const groups = raw.map((group) => (group || []).map((c) => {
    const val = c.value;
    const hasVal = Array.isArray(val) ? val.length > 0
                                      : (val !== null && val !== undefined && val !== '');
    if (!hasVal) return null;                 // 未启用的条件，必须剔除
    const f = c.field || {};
    return {
      fieldIdentifier: c.fieldIdentifier,
      operator: c.operator,
      value: Array.isArray(val) ? val.map(unwrap) : [unwrap(val)],
      toValue: (c.toValue === undefined || c.toValue === null) ? null : unwrap(c.toValue),
      className: f.className || c.className,   // className/format 在 c.field 里，不在 c 上
      format: f.format || c.format
    };
  }).filter(Boolean)).filter((g) => g.length);
  return groups.length ? groups : [[]];
}
```

验证结果（用户自建视图，全部与侧边栏一致）：

| 视图 | 算出 | 侧边栏 |
|---|---|---|
| 每日任务 | 27 | 27 ✅ |
| 我负责的-工时篇 | 21 | 21 ✅ |
| 本周要完成的任务 | 25 | 25 ✅ |
| 绩效 月任务视图 | 120 | 120 ✅ |
| 上周完成任务 | 19 | 19 ✅ |

**关键点**：`value` 数组里的元素是 `{label, value}`，必须 unwrap 成裸 `value`。
实测**不 unwrap 直接传对象 → 返回 0 条**（`statusStage` 传 `[{label:'确认阶段',value:'1'}]` 得 0，
传 `['1']` 得 26）。这是静默失败，不会报错，很容易漏。

`statusStage` 的取值：1=确认 2=处理 6=分析 7=设计 11=开发 12=测试 13=发布。
字符串和数字都接受，`format` 传 `multiList` 或 `list` 都可以。

## ✅ 修正三：`GET /projex/api/workitem/workitem/field/value/{id}` 返回的是**数组**

写入前读原值要用这个接口。返回 `result` 是数组，不是对象：

```jsonc
[
  {
    "fieldIdentifier": "priority",
    "fieldFormat": "list",
    "fieldClassName": "option",
    "value": "72cecc45d279a50acf2e93b2f5",       // 标量值
    "valueList": [{"value":"紧急","displayValue":"紧急","identifier":"72cec...","level":0}],
    "objectValue": null,
    "workitemIdentifier": "d0ee1e76f70440109ae31edb0b"
  },
  { "fieldIdentifier": "workitem.tracker", "fieldClassName": "user", "valueList": [ /* 用户数组 */ ] }
]
```

读原值的正确写法：
```js
const list = await api.getFieldValues(workitemId);          // -> 数组
const row = list.find((x) => x.fieldIdentifier === fieldId);
const current = row ? row.value : null;                     // 字段无值时整条缺失，row 为 undefined
```
⚠️ 和 `workitem/list` 里的 `customFields` 一样：**没值的字段整条不出现**，不是 `value: null`。

## 待办：写入端点仍未实证

`saveFieldValue` 的三个候选端点是从云效前端 bundle 里扫出来的**路由常量**，
请求体形状是按读接口反推的，**没有做过真实写入验证**。在验证之前，写入功能保持 `dryRun` 默认开启。

### 推荐的验证方式：录云效自己的请求（零猜测、零风险）

不要拿工作项去试候选端点——每个失败的候选都是一次真实写请求，万一某个形状被
云效**部分接受**，就会写进错误的值（写后复核能发现，但数据已经改了）。

正确做法是让云效自己发一次写请求，我们在旁边录下来：

1. 在云效页面注入下面的钩子（content script 或 devtools console 都行）：

```js
(() => {
  window.__wlog = [];
  const of = window.fetch;
  window.fetch = function (i, init) {
    const url = typeof i === 'string' ? i : (i && i.url) || '';
    const m = (init && init.method) || 'GET';
    if (m !== 'GET') {
      window.__wlog.push({ m, url, body: init && typeof init.body === 'string' ? init.body : null });
    }
    return of.apply(this, arguments);
  };
  const oo = XMLHttpRequest.prototype.open;
  const os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__m = m; this.__u = u; return oo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function (b) {
    if (this.__m && this.__m !== 'GET') {
      window.__wlog.push({ m: this.__m, url: this.__u, body: typeof b === 'string' ? b : null });
    }
    return os.apply(this, arguments);
  };
  return 'hooked';
})();
```

2. 打开任意一个工作项详情页，**手动**把「实际工时」改一个值并保存
   （用自己本来就要填的任务即可，不需要专门造废弃数据）。

3. 读出录到的请求：

```js
JSON.stringify(window.__wlog.filter(r => /field|workitem/.test(r.url)), null, 1)
```

拿到真实的 `method` + `path` + `body` 之后，把它作为 `WRITE_ENDPOINTS` 的**第一个**候选，
其余保留作兜底。这样第一次真实写入就能命中，也不会有任何试错请求打到线上。

### 已知的读接口形状（反推请求体时的参照）

`GET /projex/api/workitem/workitem/field/value/{id}` 返回数组，每项：
`{fieldIdentifier, fieldFormat, fieldClassName, value, valueList, objectValue, workitemIdentifier}`

所以写接口的 body 里除了 `fieldIdentifier` + `value`，很可能还需要
`workitemIdentifier`，甚至 `fieldFormat` / `fieldClassName`。这正是必须实录而不能靠猜的原因。


---

# ✅ 写入端点已实证（2026-08-22，抓的是云效前端自己发的请求）

之前推测的三个 `field/value` 端点**全错**，云效一律回 400。真相是：
**云效的工时根本不走通用自定义字段接口，有两个专用端点，而且语义完全不同。**

## 预计工时 —— 赋值语义

```
POST /projex/api/workitem/workitem/time/estimate?_input_charset=utf-8
{
  "workitemIdentifier": "b1a8019afb4b7b661850f18176",
  "spentTime": 3,                 // 数字，不是字符串
  "type": null,
  "description": "",
  "recordUserIdentifier": "<当前用户 userId>",
  "forCreate": false,             // 之前没值时应为 true；判断错回 400
  "containsRestDay": false
}
```

## 实际工时 —— ⚠️ 登记累加语义，不是赋值

```
POST /projex/api/workitem/workitem/time?_input_charset=utf-8
{
  "workitemIdentifier": "b1a8019afb4b7b661850f18176",
  "type": null,
  "actualTime": 3,                // 这是「本次登记多少」，会累加到已有总量上
  "description": "",
  "recordUserIdentifier": "<当前用户 userId>",
  "gmtStart": "2026-08-22T11:27:41+08:00",   // 带时区偏移，不是 UTC 的 Z
  "gmtEnd":   "2026-08-22T11:27:41+08:00",
  "containsRestDay": false
}
```

**这是最容易写出数据事故的地方**：实际工时是「所有登记记录之和」。
每 POST 一次就多一条记录、总量累加。所以：

- 界面上用户填的是**目标总量**，代码必须写 `目标 − 当前` 的**增量**
- **失败绝不能重试**（预计工时可以重试换 forCreate，实际工时重试会多登记一条）
- 目标小于当前时**无解**：云效没有负登记，只能提示用户去工作项的「工时」页删记录

代码实现见 `src/api.js` 的 `HOUR_WRITERS` 与 `saveWorkHours`，
测试见 `tools/smoke-test.mjs` 第 13 节（13.9/13.9b/13.9c 专门钉这三条）。


---

# 抓包时必须同时钩 fetch 和 XHR

云效前端**混用两套 HTTP 客户端**：

- 一部分（工时写入 `time` / `time/estimate` 等）走原生 `fetch`
- **工作项列表 `workitem/list` 走 axios，也就是 `XMLHttpRequest`**

只钩 `window.fetch` 会录不到列表请求，控制台里会看到
`[Violation] 'message' handler took ...  lib/??babel-polyfill…axios.min.js` 这类线索。

完整钩子（两套都钩）：

```js
window.__wlog = [];
const _f = window.fetch;
window.fetch = function (i, n) {
  const u = typeof i === 'string' ? i : (i && i.url) || '';
  const m = (n && n.method) || 'GET';
  if (m !== 'GET') window.__wlog.push({ m, u, body: n && typeof n.body === 'string' ? n.body : null });
  return _f.apply(this, arguments);
};
const _o = XMLHttpRequest.prototype.open;
const _s = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (m, u) { this.__m = m; this.__u = u; return _o.apply(this, arguments); };
XMLHttpRequest.prototype.send = function (b) {
  if (this.__m && this.__m !== 'GET') {
    window.__wlog.push({ m: this.__m, u: this.__u, body: typeof b === 'string' ? b : null });
  }
  return _s.apply(this, arguments);
};
'已开始记录（fetch + XHR）'
```

> 另外注意：content script 跑在 isolated world，**在扩展里钩不到页面自己的 fetch/XHR**。
> 这种抓包只能在页面上下文（DevTools 控制台）里做，或者用 `world: "MAIN"` 注入
> ——后者会显著增加商店审核风险，本项目不采用。

## ✅ 分组标签（groupCondition）已实证

云效「按状态分组 / 按类别分组」那排标签的选择**不在 view.filter 里**，
是列表请求里一个独立的 `groupCondition` 参数。最早抓到过按类别分组的样子：

```json
"groupCondition": "{\"fieldIdentifier\":\"category\",\"className\":\"category\",\"format\":\"list\",\"value\":[\"Task\"],\"operator\":\"EQUALS\"}"
```

2026-08-22 抓到按状态分组的真实请求（连点三个标签）：

```json
{"fieldIdentifier":"status","className":"status","format":"list","value":["100005"],"operator":"EQUALS"}  // 待处理
{"fieldIdentifier":"status","className":"status","format":"list","value":["100011"],"operator":"EQUALS"}  // 开发完成
{"fieldIdentifier":"status","className":"status","format":"list","value":["29"],"operator":"EQUALS"}      // 已完成
```

**`value` 填的是 identifier，不是名字。** 统一形状：

```
{fieldIdentifier: <groupBy 字段>, className: <该字段的 className>, format: 'list',
 value: [<选中项的 identifier>], operator: 'EQUALS'}
```

### 怎么知道用户选中了哪个标签

云效的分组标签用的是标准 ARIA（实测 DOM）：

```html
<div role="tab" aria-selected="true" class="next-tabs-tab active">已修复27</div>
<div role="tab" aria-selected="false" class="next-tabs-tab">待处理25</div>
```

`src/summarybar.js` 的 `detectActiveGroup()` **只认 ARIA 和名字匹配，不认 class 名**
（`next-tabs-tab active` 是云效内部实现，随时会变）。三条守卫，缺一不可：

1. 页面上不止一处 tabs（工作项详情抽屉里有「动态&评论 / 子项 / 工时」），
   要按「有几个标签名能对上后端分组」挑出正确的那一组，**至少两个对得上才敢认**；
2. 标签文字形如「已完成2467」，名字后面紧跟条数，要剥掉尾部数字再匹配；
3. **拿标签上的条数和后端返回的分组条数交叉校验**，对不上说明认错了标签，
   宁可退回「全视图」也不给一个看起来对其实错的数字。

分组名 → identifier 的映射来自 `api.listGroups()`（`workitem/group/list`），
**不能写死**（每家企业的状态 id 都不一样）。

测试见 `tools/smoke-test.mjs` 第 15 节，三条守卫都做过变异验证（故意打断会被断言咬住）。


---

# ⚠️ 工时是「记录列表」，不是单个值（2026-08-22 实测事故复盘）

工作项详情里点「工时 → 查看统计」能看到真相：

```
预计工时（3 条）
类别   预计工时   负责人    登记时间
无     1 小时    陈默    2026-08-22 18:54
无     1 小时    陈默    2026-08-22 18:54
无     1 小时    陈默    2026-08-22 11:34
```

右边字段上显示的「3 小时」是这三条记录的**和**。
**预计工时和实际工时都是这样**——不是一个可以覆盖的标量。

## 事故经过

1. 插件写入 `time/estimate`，云效回 200，记录**确实建成功了**
2. 插件立刻回读做复核 → **云效的工时汇总字段是异步算的，这时读到的还是旧值 `null`**
3. 插件误报「写入后复核不一致」
4. 用户以为失败，重试 → **又多建一条记录**

**假失败比真失败更危险**：它诱导用户重复提交，而每提交一次工时就多一条。

## 修法（都已落地）

1. **绝不重试。** 原来「forCreate 猜错就用相反值再试一次」的逻辑已删除。
   工时是追加型的，任何重试都可能多建一条记录。
2. **复核容忍异步延迟**：写完等 300/700/1500/2500ms 分四次回读。
3. **即使最后仍读不到新值，也不能报失败**：POST 已经 200 了，报失败会诱导重试。
   改为返回 `{ok: true, unverified: true}`，界面提示
   「云效汇总还没刷新出来，过几秒刷新确认，**千万不要重复提交**」。

## forCreate 的正确含义

| 写入前该工作项的工时 | forCreate | 行为 |
|---|---|---|
| 空 | `true` | **新建**一条工时记录 |
| 已有值 | `false` | **更新**已有的那条，不新增 |

（原始抓包是「已有 3 小时 → 改」，所以是 `false`；
「从无到有」的场景后来才实证，是 `true`。）

测试见 `tools/smoke-test.mjs` 13.5 / 13.5b / 13.5c / 13.6。


---

# ⚠️ forCreate 恒为 false（2026-08-22 第二次事故复盘）

`time/estimate` 的 `forCreate` **不是**「新建 vs 更新」的意思。三次抓包对比：

| 场景 | 云效发的 forCreate |
|---|---|
| 详情页改预计工时（已有 3h） | `false` |
| 工作项列表里就地改预计工时 | `false` |
| 任何场景 | **云效从来没发过 `true`** |

曾经对「该工作项原来没有预计工时」的情况自作主张发 `forCreate: true`，后果是：

- 云效回 200，**但它去创建「预计工时登记记录」了**，不是设置工作项的预计工时字段
- 工作项详情的「工时明细 → 预计工时」里多出几条记录
- **列表里的「预计工时」列始终是空的**（`workitem/list` 返回的 `customFields`
  里根本没有 `101586` 这一项）

也就是说：`forCreate: true` 走的是**工时登记**那条线，`false` 才是设置字段。
`forCreate` 大概率是指「是否在工作项创建时一并设置」，编辑已有工作项一律 `false`。

**排查这类问题的决定性手段**：直接查 `workitem/list` 返回的 `customFields`，
看目标字段在不在里面。云效详情页的工时区和列表的工时列**读的不是同一份数据**，
只看界面会一直绕圈子。

```js
// 在云效页面控制台跑，看某个工作项到底有哪些自定义字段
(async () => {
  const r = await fetch('/projex/api/workitem/workitem/list?_input_charset=utf-8', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ toPage: 1, pageSize: 1, searchType: 'LIST',
      conditions: JSON.stringify({ conditionGroups: [[{ fieldIdentifier: 'serialNumber',
        operator: 'CONTAINS', value: ['MVCX-399'], toValue: null,
        className: 'string', format: 'input' }]] }) })
  });
  const w = ((await r.json()).result || [])[0];
  console.log((w.customFields || []).map(f => f.fieldIdentifier + '=' + JSON.stringify(f.value)));
})();
```

测试见 `tools/smoke-test.mjs` 13.4 / 13.6。
