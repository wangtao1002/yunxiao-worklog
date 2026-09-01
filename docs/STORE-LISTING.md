# Chrome 应用商店上架文案（草稿）

> 提交入口：<https://chrome.google.com/webstore/devconsole> → 新建项目 → 上传 zip → 填写「商品详情 / 隐私权规范」
> 本文件是文案底稿，字数已按商店限制核对过。上架前把所有 `【待填】` 替换掉。

---

## 1. 基本信息

| 字段 | 内容 |
|---|---|
| **名称**（≤75 字符） | `云效工时统计 – 工时合计 / 热力图 / 日报导出`（26 字符） |
| **备选名称** | `云效工时统计`（更短，图标下不折行） |
| **默认语言** | 简体中文（zh-CN） |
| **版本** | 0.1.0 |
| **主分类** | 工作流与规划（Workflow & Planning） |
| **备选分类** | 办公（Productivity / Tools） |
| **官方网站** | 【待填：代码仓库地址】 |
| **支持页面** | 【待填：仓库 Issues 地址】 |
| **隐私权政策网址** | 【待填：PRIVACY.md 的公开链接，商店必填，必须可匿名访问】 |
| **定价** | 免费 |
| **地区** | 全部 |
| **是否含远程代码** | 否（所有 JS 均随包提供，无 CDN、无 eval、无动态加载） |

---

## 2. 简短描述（Summary，上限 132 字符）

**采用：**

```
在云效 Projex 里一键统计工时：列表页自动合计、日历热力图、团队对比、导出日报周报，全部本地计算，不上传任何数据。
```

（60 字符，未超限）

**备选 A：**

```
云效工时统计：把散在自定义字段里的工时实时算出来——列表合计、日历热力图、团队对比、一键导出日报周报。数据只在本地处理。
```

（60 字符）

**备选 B（更强调痛点）：**

```
云效原生工时统计一直是 0？本插件自动识别你们组织的工时字段，实时合计、出图、导出日报周报，全程本地计算不上传。
```

（56 字符）

---

## 3. 详细描述（Description）

```
云效（阿里云 DevOps / Projex）自带的工时统计，在很多组织里打开永远是 0 —— 因为团队并没有使用云效原生的「工时登记」，真实工时其实记在自定义字段上（比如「预计工时」「实际工时」）。云效不会把自定义字段当工时统计，于是这些数字散落在几百行工作项列表里，月底报工时只能导出 Excel 自己拉公式。

「云效工时统计」就是来干这件事的：它自动认出你们组织的工时字段，把散落的数字实时合计出来，并且换一个组织、换一套字段名依然能用。


■ 主要功能

· 列表页合计条
  在工作项列表页底部常驻一条统计：共 N 条 · 预计 X h · 实际 Y h · 偏差 Z h。
  按你当前视图的筛选条件全量拉取，不受页面分页限制，切换视图自动重算。

· 统计面板（快捷键 Alt+H）
  任务数 / 预计工时 / 实际工时 / 偏差 / 日均工时 / 逾期率，六个概览卡一屏看完。
  时间范围支持今天、昨天、本周、上周、本月、上月、近 7 天、近 30 天与自定义区间。

· 日历热力图
  按周排列，颜色深浅代表当日工时。工作日不足「每日标准工时」的格子会高亮描边，
  哪天漏记了一眼就能看出来；点某一天可把明细表筛到那天。

· 分组统计
  按项目 / 类别 / 状态 / 成员四个维度切换，横向条形图 + 数值排行。

· 团队对比
  把同事加入本地通讯录后可分人出数，看清团队的工时分布（受你自己的云效权限限制）。

· 导出日报周报
  一键复制 Markdown（按项目分组的表格 + 合计行，直接贴进日报），
  或导出 CSV（带 BOM，Excel 打开不乱码）。

· 批量补填工时
  明细表的「预计」「实际」两列都可直接编辑，支持「按预计工时一键填充」。
  默认只做只读预演（dry-run），确认写入时会逐条列出「字段 + 旧值 → 新值」，
  写入前先读原值、写入后再复核，绝不静默改动你的数据。


■ 字段自动识别，不写死任何 ID

不同组织的自定义字段 ID 各不相同。本插件在运行时读取字段元数据、按字段名与类型自动匹配工时字段与日期字段，
识别结果缓存在本地。如果你们的字段名比较特别，也可以在设置页手动指定，手动指定后自动探测不会覆盖。


■ 隐私

· 不收集、不上传、不共享任何数据，插件没有服务器。
· 所有网络请求只发往 devops.aliyun.com，使用你浏览器中已有的登录状态，插件不接触账号密码。
· 设置、字段映射缓存、通讯录、本人身份缓存与成员选择只保存在本机 chrome.storage.local，不同步、不上传，卸载即清除。
· 没有分析埋点、没有远程配置、没有第三方 SDK、没有远程代码、没有广告。
· 权限只申请 storage 与 devops.aliyun.com 单一域名，未申请 <all_urls>。


■ 使用前提

· 需要 Chrome 114 或更高版本。
· 需要你已登录云效，且你的组织把工时记录在工作项的自定义字段上。
· 本插件为第三方独立工具，与阿里云 / 云效官方无任何隶属或合作关系。
```

---

## 4. 五条卖点（用于详情页要点 / 首图文案）

1. **云效原生工时是 0，这里不是** —— 自动识别工时记在哪个自定义字段上，把散落的数字实时合计出来。
2. **列表页底部常驻合计条** —— 按当前视图条件全量统计，不受分页限制，切视图自动重算。
3. **日历热力图一眼找出漏记的那天** —— 工作日不达标的格子高亮描边，不用再逐行核对。
4. **日报周报一键导出** —— Markdown 直接贴进日报，CSV 带 BOM，Excel 打开不乱码。
5. **零上传、零埋点、零依赖** —— 只连 devops.aliyun.com，数据全在本机；写回云效默认只预演，逐条确认。

---

## 5. 单一用途说明（Single Purpose，审核必填）

> 填在「隐私权规范 → 单一用途」栏。审核关注点：用途必须**单一、具体、与功能一致**。

**中文：**

```
本扩展程序的单一用途是：在阿里云云效（devops.aliyun.com）的工作项页面上，
读取用户有权访问的工作项数据，计算并展示工时统计结果（合计、按日/项目/成员分组、逾期率），
并支持将统计结果导出为 Markdown 或 CSV。

所有功能都围绕这一个用途展开：列表页合计条、统计面板、日历热力图、分组统计与导出，
都是同一份工时统计能力的不同呈现方式；可选的「批量补填工时」是在同一页面上，
由用户逐条确认后把工时数值（预计工时 / 实际工时两个工时自定义字段）写回用户自己的工作项字段，
仍属于工时统计与维护这一用途。

本扩展程序不在其他任何网站上运行，不提供与工时统计无关的功能。
```

**English:**

```
The single purpose of this extension is to compute and display work-hour statistics for Alibaba Cloud
DevOps (Yunxiao, devops.aliyun.com) work items that the signed-in user is already authorised to view,
and to let the user export those statistics as Markdown or CSV.

Every feature serves that one purpose: the list-page summary bar, the statistics panel, the calendar
heatmap, the grouped breakdowns and the exports are all different presentations of the same work-hour
computation. The optional "bulk fill actual hours" feature writes a work-hour value back to the user's
own work-item field on the same site, item by item after explicit confirmation, which is part of
maintaining those same work-hour records.

The extension runs on no other website and offers no functionality unrelated to work-hour statistics.
```

---

## 6. 权限用途说明（Permission Justification，审核必填）

> 每一项权限在开发者后台都有独立输入框，逐条粘贴。

### `storage`

**中文：**

```
用于在本机保存五类数据，使用 chrome.storage.local（不使用 sync，不上传）：
(1) 用户偏好设置：每日标准工时、默认时间范围、工时归集口径、主题、是否显示列表页合计条、写入模式开关，
    以及运行时探测出的工时字段写入接口地址；
(2) 工时字段映射缓存：本扩展在运行时探测出的当前组织工时字段与日期字段的 identifier 和名称。
    不同组织的自定义字段 ID 不同且不可预知，必须探测后缓存，否则每次打开都要重新探测，既慢又会增加请求；
(3) 本地通讯录：用户主动从当前视图导入的同事的用户 ID、显示名与头像地址，用于团队统计时选择统计对象。
    云效没有可用的成员搜索接口，只能由用户按需在本地积累。头像地址仅作为元数据保存，界面一律显示
    本地渲染的首字母占位块，不会向任何图片 CDN 发请求；
(4) 本人身份缓存：当前登录用户自己的用户 ID、显示名、头像地址及所属组织的 ID 与名称，按组织分桶保存，
    用于面板标题、「只看我」筛选，以及接口临时不可用时的降级回退；
(5) 成员选择：用户在团队统计里勾选的同事用户 ID，按组织分桶保存。
以上数据均不离开用户设备，卸载扩展程序即清除。
```

**English:**

```
Used to persist five kinds of data locally via chrome.storage.local (sync is not used, nothing is uploaded):
(1) User preferences: daily target hours, default date range, date basis, theme, summary-bar toggle, write-mode
    switch, and the write endpoint detected at runtime for the work-hour field;
(2) Field-mapping cache: the identifiers and names of the work-hour and date fields detected at runtime for the
    user's organisation. Custom field IDs differ per organisation and cannot be known in advance, so they must be
    detected and cached — otherwise every session would repeat the detection requests;
(3) A local contact list: user IDs, display names and avatar URLs of colleagues the user explicitly imported from
    the current view, used to pick whose work hours to include in team statistics. Yunxiao offers no usable
    member-search API, so this list is built up locally on demand. Avatar URLs are stored as metadata only — the UI
    always renders a local initial-letter placeholder and never requests any image CDN;
(4) Identity cache: the signed-in user's own user ID, display name and avatar URL, plus the ID and name of their
    organisation, bucketed per organisation. Used for the panel header, the "only me" filter, and as a fallback
    when the API is temporarily unavailable;
(5) Member selection: the user IDs the user ticked for team statistics, bucketed per organisation.
None of this data leaves the user's device; uninstalling the extension removes it.
```

### `host_permissions: https://devops.aliyun.com/*`

**中文：**

```
本扩展只在阿里云云效（devops.aliyun.com）上工作，需要该域名的访问权限才能：
(1) 在云效工作项页面注入统计界面（列表页底部合计条与统计面板）；
(2) 在该页面内以同源请求方式调用云效自身的工作项接口，读取用户已有权限查看的工作项数据
    （标题、编号、状态、负责人、所属项目、计划/实际完成时间及工时自定义字段）来计算工时；
(3) 在用户逐条确认后，把用户填写的工时数值（预计工时 / 实际工时两个工时自定义字段）
    写回其本人的工作项字段。
请求使用浏览器中已有的登录会话，扩展不读取也不存储任何登录凭据。
权限范围严格限定为这一个域名，未申请 <all_urls> 或任何其他主机权限；
没有该权限，扩展的全部功能都无法实现。
```

**English:**

```
The extension works only on Alibaba Cloud DevOps (devops.aliyun.com) and needs access to that domain in order to:
(1) inject its UI (the list-page summary bar and the statistics panel) into Yunxiao work-item pages;
(2) call Yunxiao's own work-item endpoints as same-origin requests from those pages, reading the work items the
    user is already authorised to see (title, number, status, assignee, project, planned/actual completion dates
    and the work-hour custom fields) in order to compute the statistics;
(3) write the user's entered work-hour values (the estimated-hours and actual-hours custom fields) back to the
    user's own work items, after per-item confirmation.
Requests rely on the browser session the user already has; the extension neither reads nor stores any credential.
The scope is strictly limited to this single domain — <all_urls> and any other host permission are not requested.
Without this permission none of the extension's functionality is possible.
```

### 未申请的权限（如审核问到，可直接答复）

`tabs` / `activeTab` / `cookies` / `history` / `downloads` / `scripting` / `<all_urls>` 均未申请。

- 导出文件通过页面内的 Blob + `a[download]` 完成，无需 `downloads` 权限。
- service worker 只在用户点击工具栏图标时用 `chrome.tabs.sendMessage` / `reload` / `create`
  操作**当前被点击的那个标签页**，这些方法本身不需要 `tabs` 权限；
  判断该标签页是否为云效页面时读取的 `tab.url`，靠的是已授予的 `devops.aliyun.com` 主机权限
  （非云效标签页读不到 URL，此时直接新开云效页面，不做任何探测）。
- content script 通过 `manifest.json` 静态声明注入，因此不需要 `scripting` 权限。

---

## 7. 数据用途披露（Privacy practices 页勾选）

| 商店问题 | 勾选 / 答复 |
|---|---|
| 是否收集个人身份信息 | 否 |
| 是否收集健康信息 | 否 |
| 是否收集财务和付款信息 | 否 |
| 是否收集身份验证信息 | 否 |
| 是否收集个人通讯内容 | 否 |
| 是否收集位置信息 | 否 |
| 是否收集网页浏览记录 | 否 |
| 是否收集用户活动（点击流、鼠标位置等） | 否 |
| 是否收集网站内容（文本、图片等） | 否（仅在用户本机内存中读取并展示，不传输、不留存到扩展之外） |
| 我不会将或使用用户数据用于与单项用途无关的目的 | ✅ 声明 |
| 我不会将或使用用户数据来确定信誉度或用于放贷 | ✅ 声明 |
| 我不会将用户数据出售给第三方 | ✅ 声明 |
| 是否使用远程代码 | 否 |

> 提示：因为「不收集任何数据」，Privacy practices 里的收集项全部选「否」即可；
> 但**隐私权政策网址仍是必填项**，必须提供一个可匿名访问的 URL（把 PRIVACY.md 发布出去）。

---

## 8. 截图脚本（5 张，1280×800 PNG）

> 商店要求 1280×800 或 640×400，至少 1 张、最多 5 张。
> 拍摄前请务必：把浏览器窗口调到 1280×800、**关闭无关插件与书签栏**、
> **打码或替换所有真实的项目名 / 人名 / 工作项编号**（建议用测试组织或改浏览器缩放后手动涂抹）。
> 每张图顶部留出 ~120px 空白，用于叠加一句大字说明文案。

| # | 画面 | 拍什么 / 怎么摆 | 叠加文案 |
|---|---|---|---|
| **1** | **列表页合计条**（首图，最重要） | 云效工作项列表页，展示 20+ 行任务，工时列可见；页面底部是插件的合计条：`共 77 条 · 预计 95 h · 实际 89 h · 偏差 -6 h`，右侧「详细统计」按钮。用箭头或高亮框圈出合计条。 | 「列表页底部自动合计，不受分页限制」 |
| **2** | **统计面板概览 + 日历热力图** | 按 Alt+H 打开面板，范围选「本月」。上方六个概览卡数字饱满（任务数 / 预计 / 实际 / 偏差 / 日均 / 逾期率），下方日历热力图深浅分明，且**至少有一个工作日格子是高亮描边的欠缺状态**。 | 「一屏看完本月工时，哪天漏记一眼看出」 |
| **3** | **分组统计 + 明细表** | 面板滚到中部：分组统计切到「按项目」，横向条形图排行清晰；下方明细表显示编号 / 标题 / 项目 / 状态 / 预计 / 实际等列，表头排序箭头可见。 | 「按项目、类别、状态、成员任意维度拆开看」 |
| **4** | **团队对比** | 成员选择器展开，勾选 3–4 个同事（**名字务必替换为「同事 A/B/C」之类**），统计结果按人分行呈现，能看出工时分布差异。 | 「团队工时分布，按人出数」 |
| **5** | **导出与安全写入** | 左半：Markdown 复制结果或 CSV 在 Excel 中打开的样子（中文不乱码）；右半：写入确认弹窗，逐条列出「编号 标题：2 → 4」，并且能看到「当前为只读预演（dry-run）」的提示。 | 「日报周报一键导出；写回云效默认只预演，逐条确认」 |

### 可选素材

- **小型宣传图块**（440×280，用于商店搜索结果卡片）：深蓝→青渐变底 + 插件图标 + 「云效工时统计」白色大字 + 一行小字「工时合计 · 热力图 · 日报导出」。
- **大型宣传图块**（1400×560，可选）：左侧文案，右侧统计面板截图去背斜放。
- 图标已生成于 `icons/`，商店上传用 `icons/icon128.png`；如需 440×280 宣传图，可参考 `tools/gen_icons.py` 的配色（`#11388C` → `#1ACDD6`）。

---

## 9. 上架前自检清单

- [ ] 打包 zip 时**不要**包含 `.git/`、`docs/`、`tools/`、`README.md`（可保留 `PRIVACY.md`）
- [ ] `manifest.json` 的 `version` 与本文件一致
- [ ] 全库 grep 不到硬编码的组织 id / 用户 id / 字段 id
- [ ] `for f in src/*.js *.js; do file -b "$f"; done` 全部是 UTF-8/ASCII text
      （源码里混进裸 NUL 会让 grep/diff 把文件当二进制跳过，上面那条 grep 自检就会假阴性）
- [ ] 隐私权政策 URL 可匿名打开
- [ ] 5 张截图分辨率均为 1280×800，且已脱敏（无真实人名 / 项目名 / 客户名）
- [ ] 在干净的 Chrome Profile 上装一次 zip 包，确认全流程可用、控制台无报错
