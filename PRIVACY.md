# 隐私政策 / Privacy Policy

**插件名称 / Extension:** 云效工时统计（Yunxiao Work-Hours Stats）
**版本 / Version:** 0.2.0
**生效日期 / Effective date:** 2026-08-21

---

## 中文版

### 一句话总结

**本插件不收集、不上传、不共享、不出售任何数据。** 它没有服务器，也没有开发者能看到的后台。
所有计算都在你自己的浏览器里完成。

### 1. 我们收集什么数据

**没有。** 插件不收集任何个人信息、不生成任何用户标识、不做任何统计上报。

这里的「收集」指把数据传给开发者或任何第三方。插件不做这件事——它没有服务器可传。
（为了显示面板标题和做「只看我」筛选，插件会把**你自己的云效昵称与 userId** 缓存在本机，
详见第 3 节；这份数据只留在你的电脑上，不上传、不共享。）

具体来说，插件**不会**收集下列任何一类数据：

- 个人身份信息（手机号、地址、账号密码等）
- 健康信息、财务信息、身份验证信息（密码、凭据、令牌）
- 个人通讯内容（邮件、短信、聊天记录）
- 位置信息
- 网页浏览历史、访问记录
- 用户操作行为（点击流、页面停留、功能使用频次等）

### 2. 数据发往哪里

**只发往 `https://devops.aliyun.com`，不发往任何其它域名。**

插件在云效页面内以你**当前已有的浏览器登录状态**（Cookie）调用云效自身的接口，
读取你本来就有权限看到的工作项数据。这与你手动在云效页面上点击浏览是完全等价的行为。

- 插件**没有**任何自有服务器、后端、API、数据库或日志服务。
- 插件**不会**把云效数据、统计结果、导出内容发送到开发者或任何第三方。
- 插件**不接触**你的账号密码：它不读取、不存储、不传输任何登录凭据，
  也不请求 `cookies` 权限，仅由浏览器在同源请求中自动携带既有会话。

### 3. 数据存在哪里

插件仅使用 Chrome 的 `chrome.storage.local`，**数据只保存在你这台电脑上**，
不会同步到云端（未使用 `chrome.storage.sync`），不会离开你的设备。

存储的内容仅限：

| 内容 | 用途 |
|---|---|
| 偏好设置 | 每日标准工时、默认时间范围、归集口径、主题、是否显示合计条、写入模式；以及自动探测出的工时字段写入接口地址（`_writeEndpoint`） |
| 字段映射缓存 | 你所在组织的工时/日期字段 identifier 与名称的对应关系，避免每次重新探测 |
| 通讯录缓存 | 你主动从当前视图导入的同事的 userId、显示名、头像 URL，用于团队统计的成员选择（头像 URL 只作为元数据保存，界面上一律显示首字母占位块，不会去加载远程图片） |
| 身份缓存 | 你自己的 userId、云效显示名、头像 URL，以及所属组织的 id 与名称，按组织分桶保存。用于面板标题、「只看我」筛选，以及接口抖动时的降级回退 |
| 成员选择 | 你在团队统计里勾选的同事 userId，按组织分桶保存 |
| 区间统计快照 | 最近 12 个已加载日期区间的标准化工作项统计数据，用于离线回显和手动按区间刷新 |

**导出的 CSV / Markdown 由你自己触发下载或复制到剪贴板，插件不保留副本。**

### 4. 数据保留与删除

- 数据一直保存在本机，直到你主动删除。
- 删除方式一：设置页底部「**清除全部本地数据**」。
- 删除方式二：在 `chrome://extensions` 卸载本插件，浏览器会自动清除其全部本地存储。

### 5. 我们不做的事

- ❌ 没有分析工具、没有埋点、没有崩溃上报（无 Google Analytics、无 Sentry 等）
- ❌ 没有远程配置、没有远程开关、没有云端下发的规则
- ❌ 没有第三方 SDK、没有 CDN、没有外部脚本、样式或图片（所有代码与资源都打包在插件内；
  通讯录头像也不从阿里的头像 CDN 拉取，一律用本地渲染的首字母占位块）
- ❌ 没有远程代码执行：不使用 `eval`，不动态加载脚本
- ❌ 不投放广告，不做用户画像，不销售或出租数据
- ❌ 不在 `devops.aliyun.com` 以外的任何网站上运行

### 6. 权限说明（逐条）

插件遵循最小权限原则，只申请下列两项：

| 权限 | 为什么需要 |
|---|---|
| `storage` | 把你的偏好设置、组织工时字段映射缓存、本地通讯录保存在**本机**，让下次打开时不用重新配置、不用重新探测字段。仅使用 `storage.local`，不同步、不上传。 |
| `host_permissions: https://devops.aliyun.com/*` | 插件只在云效页面上运行；它需要在该域名下注入统计界面，并以你已有的登录态调用云效自身的工作项接口来读取数据、计算工时。没有这项权限，插件无法工作。范围严格限定在这一个域名。 |

**未申请**：`tabs`、`activeTab`、`cookies`、`history`、`bookmarks`、`downloads`、`<all_urls>` 等。

### 7. 写入行为说明

插件提供「批量补填工时（预计工时 / 实际工时两个自定义字段）」功能，
可以把你在界面上填的数值写回**你自己的**云效工作项字段。
这属于对云效的写操作，因此做了以下限制：

- **默认为「只读预演（dry-run）」**，不发出任何写请求；必须由你在设置页手动开启「允许写回云效」。
  这一个开关同时管着上述两个工时字段的写回。
- 每次写入前弹出确认框，**逐条列出编号、标题、字段名、旧值 → 新值**，
  标题写明本次涉及哪几个字段。
- 写入前先读取当前值，**值未变化的自动跳过**；写入后再次读取复核，不一致即报失败。
- 写入的目标只有云效，且只写上述两个工时字段（且只写你在界面上改过的那些格子），
  不修改任何其它字段。

### 8. 变更

隐私政策如有变更，会随插件版本更新在本文件中说明，并在版本说明中提示。

### 9. 联系方式

问题或疑虑请通过 Chrome 应用商店的「支持」页面，或本项目代码仓库的 Issue 反馈。

### 10. 关联声明

本插件是第三方独立工具，与阿里云、云效（Alibaba Cloud DevOps / Yunxiao）官方**无任何隶属或合作关系**。
你对云效数据的访问范围完全由你的云效账号权限决定，插件不会、也无法扩大这个范围。

---

## English Version

### In one sentence

**This extension collects nothing, uploads nothing, shares nothing, and sells nothing.**
It has no server and no developer-facing backend. All processing happens locally in your own browser.

### 1. What data we collect

**None.** The extension collects no personal information, generates no user identifier, and sends no telemetry.

"Collect" here means sending data to the developer or any third party. The extension does not do
that — it has no server to send anything to. (To render the panel header and the "only me" filter it
does cache **your own** Yunxiao display name and userId locally; see section 3. That data stays on
your machine and is never uploaded or shared.)

Specifically, it does **not** collect any of the following:

- Personally identifiable information (phone number, address, account credentials)
- Health information, financial information, or authentication information (passwords, credentials, tokens)
- Personal communications (emails, messages, chat logs)
- Location data
- Web browsing history
- User activity (clickstream, dwell time, feature usage metrics)

### 2. Where data is sent

**Only to `https://devops.aliyun.com`. Nowhere else.**

The extension runs inside Yunxiao pages and calls Yunxiao's own endpoints using the browser session
(cookies) you **already** have, reading only work-item data you are already authorised to see.
This is functionally identical to you clicking around Yunxiao yourself.

- The extension has **no** server, backend, API, database, or logging service of its own.
- It **never** transmits Yunxiao data, computed statistics, or exported content to the developer or any third party.
- It **never** touches your credentials: it does not read, store, or transmit any login credential,
  and it does not request the `cookies` permission — the browser simply attaches your existing
  session to same-origin requests.

### 3. Where data is stored

The extension uses only Chrome's `chrome.storage.local`. **Data stays on your machine**,
is not synced to the cloud (`chrome.storage.sync` is not used), and never leaves your device.

Stored items are limited to:

| Item | Purpose |
|---|---|
| Preferences | Daily target hours, default date range, date basis, theme, summary-bar toggle, write mode, and the auto-detected write endpoint for the work-hour field (`_writeEndpoint`) |
| Field-mapping cache | The identifiers and names of your organisation's work-hour / date fields, so they need not be re-detected every time |
| Contacts cache | userId, display name and avatar URL of colleagues you explicitly imported from the current view, used for member selection in team statistics (the avatar URL is kept as metadata only — the UI always renders a local initial-letter placeholder and never loads the remote image) |
| Identity cache | Your own userId, Yunxiao display name and avatar URL, plus the id and name of your organisation, bucketed per organisation. Used for the panel header, the "only me" filter, and as a fallback when the API is temporarily unreachable |
| Member selection | The userIds of colleagues you ticked for team statistics, bucketed per organisation |
| Range snapshots | Normalized statistics for the 12 most recently loaded date ranges, used for local replay and manual range refresh |

**Exported CSV / Markdown is downloaded or copied to your clipboard by your own action; no copy is retained.**

### 4. Retention and deletion

- Data stays on your machine until you delete it.
- Option 1: click "Clear all local data" at the bottom of the options page.
- Option 2: uninstall the extension from `chrome://extensions`; Chrome removes all of its local storage automatically.

### 5. What we do not do

- ❌ No analytics, no telemetry, no crash reporting (no Google Analytics, no Sentry, etc.)
- ❌ No remote configuration, no remote kill switch, no server-delivered rules
- ❌ No third-party SDKs, no CDNs, no external scripts, stylesheets or images (all code and assets ship
  inside the package; contact avatars are never fetched from Alibaba's avatar CDN — a locally rendered
  initial-letter placeholder is used instead)
- ❌ No remote code execution: no `eval`, no dynamically loaded scripts
- ❌ No ads, no profiling, no sale or rental of data
- ❌ Runs on no site other than `devops.aliyun.com`

### 6. Permission justification

The extension follows the principle of least privilege and requests only:

| Permission | Why it is needed |
|---|---|
| `storage` | To keep your preferences, the cached work-hour field mapping for your organisation, and your local contact list **on this device**, so settings persist and fields need not be re-detected on every use. Only `storage.local` is used — nothing is synced or uploaded. |
| `host_permissions: https://devops.aliyun.com/*` | The extension runs only on Yunxiao. It needs to inject its statistics UI on that domain and to call Yunxiao's own work-item endpoints with your existing session in order to read data and compute work hours. Without this permission the extension cannot function. The scope is strictly limited to this single domain. |

**Not requested:** `tabs`, `activeTab`, `cookies`, `history`, `bookmarks`, `downloads`, `<all_urls>`, and others.

### 7. About the write feature

The extension offers a "bulk fill actual hours" feature that can write values you typed back into
**your own** Yunxiao work-item fields. Because this is a write operation, it is deliberately constrained:

- **Dry-run by default** — no write request is sent at all until you explicitly enable
  "allow writing back to Yunxiao" in the options page.
- Every write is preceded by a confirmation dialog listing **each item's number, title, old value → new value**.
- The current value is read first and **unchanged values are skipped**; after writing, the value is
  read back and verified — a mismatch is reported as a failure.
- Writes go only to Yunxiao, and only to the single work-hour field you chose. No other field is modified.

### 8. Changes

Any change to this policy will be documented in this file alongside the extension version and noted in the release notes.

### 9. Contact

Please use the "Support" tab on the Chrome Web Store listing, or open an issue in this project's repository.

### 10. Affiliation

This is an independent third-party tool with **no affiliation to or endorsement by** Alibaba Cloud
or Yunxiao (Alibaba Cloud DevOps). Your access to Yunxiao data is governed entirely by your own
Yunxiao account permissions; the extension does not and cannot broaden that scope.
