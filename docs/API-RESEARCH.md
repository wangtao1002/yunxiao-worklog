# 云效 Projex 内部接口调研结果（实测，2026-08-21）

> 全部接口均在 `https://devops.aliyun.com` 页面上下文中用 `fetch(..., {credentials:'include'})` 实测通过。
> 无 CSRF header 要求。**必须在 content script 里同源发起**（popup / options 页面是 `chrome-extension://` 源，
> 跨站 cookie 会被 SameSite 拦掉，不要在那里直接调）。

所有 `/projex/api/**` 接口都要带 query `_input_charset=utf-8`。
响应统一形如 `{ code: 200, result: ..., errorMsg: "", msg: "", traceId: "..." }`。
`code !== 200` 视为失败，错误文案取 `errorMsg || msg`。

---

## 1. 身份探测

### 1.1 当前用户
```
GET /uiless/api/sdk/users/me
```
（注意：这个不是 `/projex/api`，没有 `_input_charset` 参数，但同源）

返回：
```json
{"code":200,"success":true,"result":{
  "user":{"id":"61de3b64a96ac5d9b0cdbc7f","email":"...","name":"陈默","avatarUrl":"https://..."},
  "sdkConfigs":{"appUrl":"https://apps-devops.aliyun.com/category/all/detail/xxx?organitionId=61dbcd725356b19beeb1dc03", ...}
}}
```
- `result.user.id` → **userId**
- `result.sdkConfigs.appUrl` 里的 `organitionId=` 参数 → **orgId**（注意阿里这里拼写就是 `organitionId`，少个 `za`）

### 1.2 orgId 兜底来源（按优先级）
1. `me()` 里 `sdkConfigs.appUrl` 的 `organitionId` 查询参数
2. 深搜 `result.sdkConfigs` 里任意 `organi(ti|zati)onId` 键
3. 页面 DOM：`a[href*="/api/v1/organization/"]` 的 href 里 `/organization/([0-9a-f]{24})/`

> ~~`GET https://uiless-devops.aliyun.com/api/sdk/preferences/lastWorkspace`~~ 曾作为第 4 级兜底，
> 已删除：该域名不在 `host_permissions` 里，且与 PRIVACY.md / README「只发往 devops.aliyun.com」
> 的承诺冲突（请求即便被 CORS 拦掉，也已经带着 Cookie 离开了浏览器）。**不要再加回来。**

### 1.3 单个用户信息
```
GET /projex/api/common/user/{userId}?_input_charset=utf-8
```
返回 `result`: `{identifier, realName, nickName, displayName, avatar, realNamePinyin, nickNamePinyin, isDisabled, isDeleted}`

### 1.4 组织信息
```
GET /projex/api/common/organization/{orgId}?_input_charset=utf-8
```
返回 `result`: `{identifier, name, logo, ...}`

### 1.5 ⚠️ 没有可用的成员搜索接口
`/projex/api/common/user/search`、`/projex/api/workitem/user/search`、
`/uiless/api/organizations/{org}/members/search` 全部实测失败（空结果 / 404 / 405）。
**因此不要依赖成员搜索。** 成员目录改为本地积累（见 SPEC 的「通讯录」章节）。

---

## 2. 工作项查询（核心）

```
POST /projex/api/workitem/workitem/list?_input_charset=utf-8
Content-Type: application/json
```

请求体：
```jsonc
{
  "spaceType": "User",                       // "User" = 个人视图（跨项目）；"Project" = 单项目
  "spaceIdentifier": "<userId 或 projectId>",
  "category": "",                            // "" = 全部；也可 "Task"/"Req"/"Bug"
  "toPage": 1,                               // 页码，从 1 开始
  "pageSize": 200,                           // 上限 200
  "searchType": "LIST",
  "scope": "personal",                       // spaceType=User 时必须带
  "conditions": "<JSON 字符串>",              // 见下
  "orderBy": "<JSON 字符串>"                  // 可选
}
```

`conditions` 是**被 JSON.stringify 过两次的字符串**，结构：
```jsonc
{"conditionGroups":[[
  {"fieldIdentifier":"assignedTo","operator":"CONTAINS","value":["<userId>"],
   "toValue":null,"className":"user","format":"list"},
  {"fieldIdentifier":"80","operator":"BETWEEN","value":["2026-08-01 00:00:00"],
   "toValue":"2026-08-31 23:59:59","className":"date","format":"input"}
]]}
```
同一个内层数组里的条件是 **AND**；外层多个数组之间是 **OR**。

`orderBy` 同样是 JSON 字符串：
```json
{"fieldIdentifier":"80","format":"input","order":"desc","className":"date"}
```

响应：
```jsonc
{
  "code": 200,
  "result": [ /* 工作项数组 */ ],
  "toPage": 1, "pageSize": 200,
  "totalCount": 77, "totalPages": 1
}
```

### 2.1 工作项对象里有用的字段
```jsonc
{
  "identifier": "1eac18d5b338d59faa10d15744",   // 工作项 id（详情页 URL 用）
  "serialNumber": "HZFS-14",                    // 人看的编号
  "subject": "标题",
  "gmtCreate": 1787305969000,                   // 毫秒时间戳
  "gmtModified": 1787305980000,
  "finishTime": null,                           // 实际完成时间，毫秒时间戳或 null
  "categoryIdentifier": "Task",                 // Task / Req / Bug / Risk
  "category": {"identifier":"Task","name":"任务"},
  "status": {"identifier":"100005","name":"待处理", "stageId":1,
             "workflowStage":{"identifier":"1","name":"确认阶段","position":1}},
  "statusStage": {"id":1,"name":"确认阶段"},
  "spaceIdentifier": "89f30684d41dc63ad3a4968cc2",
  "space": {"identifier":"...","name":"示例省机关","type":"Project"},
  "assignedTo": {"identifier":"...","realName":"陈默","displayName":"陈默","avatar":"https://..."},
  "creator":    {"identifier":"...","realName":"孙岚", ...},
  "workitemTypeIdentifier": "ba102e46bc6a8483d9b7f25c",
  "parentIdentifier": "a058bbab00450408a53b33f30e",   // 可能为 null
  "customFields": [
    {"fieldIdentifier":"80",    "fieldFormat":"input","fieldClassName":"date", "value":"2026-08-28 00:00:00"},
    {"fieldIdentifier":"101586","fieldFormat":"input","fieldClassName":"float","value":"2"},
    {"fieldIdentifier":"workitem.tracker","fieldClassName":"user","objectValue":[ /* 用户对象数组 */ ]}
  ]
}
```
⚠️ `customFields` 里**没有值的字段会整条缺失**，不是 `value:null`。取值必须做存在性判断。
⚠️ `value` 是**字符串**，工时要 `parseFloat`。

### 2.2 权限边界（实测）
| 组合 | 结果 |
|---|---|
| `spaceType:"User"` + `spaceIdentifier:<我的id>` + `assignedTo:<我>` | ✅ 有数据 |
| `spaceType:"User"` + `spaceIdentifier:<我的id>` + `assignedTo:<别人>` | ❌ 恒为 0 条 |
| `spaceType:"User"` + `spaceIdentifier:<别人的id>` + `assignedTo:<别人>` | ✅ **有数据**（关键！团队统计靠这个） |
| `spaceType:"Project"` + `spaceIdentifier:<项目id>` | ✅ 有数据（该项目全员） |
| `spaceType:"Organization"` | ❌ 恒为 0 条 |

**团队统计的正确做法：按人循环，每人一次（或多次分页）请求，
`spaceIdentifier` 设成那个人的 userId，同时 conditions 里加 `assignedTo = 那个人`。**
实测 5 人 × 1 个月 几秒返回。不要去遍历项目（用户可能参与 200+ 个项目）。

---

## 3. 字段元数据（自动识别工时字段的关键）

```
GET /projex/api/workitem/workitem/field/{workitemIdentifier}?_input_charset=utf-8
```
返回该工作项所属类型的完整字段定义。用递归遍历 `result`，收集所有同时具备
`identifier` 和 (`displayName` 或 `name`) 的对象，可得：

| identifier | displayName | className | format | type |
|---|---|---|---|---|
| `workitemType` | 工作项类型 | workitemType | list | NativeField |
| `status` | 状态 | status | list | NativeField |
| `assignedTo` | 负责人 | user | list | NativeField |
| `priority` | 优先级 | option | list | SystemCustomField |
| `space` | 归属项目 | space | list | NativeField |
| `79` | 计划开始时间 | date | input | SystemCustomField |
| `80` | 计划完成时间 | date | input | SystemCustomField |
| **`101586`** | **预计工时** | **float** | input | SystemCustomField |
| **`101587`** | **实际工时** | **float** | input | SystemCustomField |
| `sumPlanedLaborHour` | 预计工时汇总 | auto | input | SystemCustomField |
| `sumActualLaborHour` | 实际工时汇总 | auto | input | SystemCustomField |
| `sprint` | 迭代 | sprint | list | Application |
| `tag` | 标签 | tag | multiList | Application |

⚠️ **`101586` / `101587` / `79` / `80` 是本组织的 id，别的企业不一样，绝对不能写死。**
必须运行时按 `className ∈ {float, number}` + `displayName` 正则匹配来识别，并缓存。

以下接口实测**不可用**，不要用：
`/projex/api/workitem/workitem/field/listAllFields`、`.../field/listQueryParamField`、`.../field/list`
（都报参数缺失或 404，参数形状未知）

---

## 4. 视图

```
GET /projex/api/workitem/view/{viewIdentifier}?_input_charset=utf-8
```
返回：
```jsonc
{"result":{
  "identifier":"08400356a8e63eb206fad0bae4",
  "name":"我负责的-工时篇",
  "spaceType":"User","spaceIdentifier":"<userId>",
  "filter":"<JSON 字符串：二维数组，每项 {field:{...}, fieldIdentifier, operator, value, toValue}>",
  "columns":"[\"subject\",\"status\",\"priority\",\"space\",\"101586\",\"101587\",\"80\"]",
  "groupBy":"{\"fieldIdentifier\":\"category\"}",
  "orderBy":"{\"fieldIdentifier\":\"80\",\"order\":\"desc\"}",
  "scope":"personal","type":"personalView","layout":"WorkitemViewType_list"
}}
```
`filter` 里 `value` 为空数组的条件表示"未启用"，要过滤掉。
`filter` 项里的 `value` 元素形如 `{"label":"陈默","value":"61de3b64a96ac5d9b0cdbc7f"}`，
转成 list 接口的 `conditions` 时只取 `.value`（日期类的 `toValue` 也是 `{label,value}`，取 `.value`）。

当前视图 id 来自 URL hash：`#viewIdentifier=xxxx`。

---

## 5. 写入（批量补填实际工时）

⚠️ **以下端点是从前端 bundle 里扫出来的路由常量，尚未做过真实写入验证。**
实现时必须走「先 GET 原值 → 写 → 再 GET 复核」，并默认 dry-run。

从 bundle 扫到的候选（按优先级）：
```
/projex/api/workitem/workitem/field/value/{identifier}          # 单条字段值
/projex/api/workitem/workitem/field/batch/saveFieldValue        # 批量保存字段值
/projex/api/workitem/workitem/batch/update                      # 批量更新
```
读取侧已确认可用（详情页加载时会 GET `field/value/{id}`）。

官方 OpenAPI 的等价能力（需要个人访问令牌，插件里没有，仅作参照）：
`PUT /oapi/v1/projex/organizations/{orgId}/workitems/{id}`，body 里
`updateWorkItemFields.customFieldValues = {"101587": "2"}`。

---

## 6. 本组织现状（用来解释「为什么必须自己做」）
- 项目「工时」模块（`/projex/project/{id}/inventory`）显示：预估 0h / 登记 0h / 实登记人数 0-21。
  说明本组织**没用云效原生工时登记**，原生工时统计和度量页永远是 0。
- 真实工时记在自定义字段 `101586`（预计）/ `101587`（实际）上。
- 实测数据：陈默 7 月 120 个任务 189.5h、8 月 77 个任务 95h；同组李维 8 月 24 个任务，
  预计 116h / **实际 89h**（说明「实际工时」字段确实有人在用，不是死字段）。
- 用户保存的视图日期条件全是写死的且大多过期（最久的停在 9 个月前），
  这是插件要解决的核心痛点之一。
