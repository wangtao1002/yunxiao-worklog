# 发布手册

两种分发渠道，同一套 `src/` 源码：

| 渠道 | 产物 | 给谁用 |
|---|---|---|
| **油猴脚本**（主）| `yunxiao-worklog.user.js` | 同事。装一次自动更新，不用再发压缩包 |
| Chrome 扩展 | 两个 zip | 不想装 Tampermonkey 的人；或将来上架 Chrome 商店 |

**改代码一律改 `src/`**，两个产物都是构建出来的，别直接编辑。

---

## 一、账号与地址（先记住这几个）

| 项 | 值 |
|---|---|
| GitHub 仓库 | <https://github.com/wangtao1002/yunxiao-worklog> |
| GitHub 账号 | `wangtao1002` |
| Greasy Fork 脚本页 | <https://greasyfork.org/zh-CN/scripts/593850> |
| Greasy Fork 账号 | `abner-dev`（`abner` / `Abner` 都已被别人占用） |
| 安装地址（发给同事的就这条） | `https://update.greasyfork.org/scripts/593850/%E4%BA%91%E6%95%88%E5%B7%A5%E6%97%B6%E7%BB%9F%E8%AE%A1.user.js` |

安装地址只含脚本 ID 和脚本名，**改账号名不会让它失效**。

---

## 二、发一个新版本

```bash
# 1. 改 manifest.json 的 version —— 油猴靠 @version 判断要不要更新，不改就不会推给别人
# 2. 构建（不要传 --host，理由见「三、油猴的坑」）
python3 tools/build-userscript.py

# 3. 推 GitHub（存档 + 给 Greasy Fork 当同步源）
git commit -am "chore: 发布 vX.Y.Z"
env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY git push     # 禁代理，理由见「五、网络」

# 4. 去脚本页点「更新代码」，把 yunxiao-worklog.user.js 的内容贴进去发布
```

第 4 步可以省掉：Greasy Fork 脚本管理页有 **「从 URL 同步」**，配上 GitHub 的 raw 地址后它会定期自己拉。
Greasy Fork 服务器在国外，拉 raw 没有障碍。

发完顺手跑一遍 `node tools/smoke-test.mjs`（当前 291 项断言）。

### Chrome 扩展的包

```bash
python3 tools/pack.py      # 版本号自动从 manifest.json 读
```

出两个 zip：`-同事安装`（含「云效工时统计」文件夹 + 安装说明.txt）和 `-商店上传`（文件在包根）。

---

## 三、油猴（Greasy Fork）的坑

踩过一遍的，按发生顺序：

1. **新账号有 5 分钟冷却**。第一次发布会被拦：「新用户不能立即发布脚本」。
   源码判据是 `created_at > 5.minutes.ago`（`app/services/user_restriction_service.rb` → `DELAYED`），
   等 5 分钟就行，不是几天。

2. **必须声明 `@license`**，否则发布被拒。不声明 = 默认「不允许他人修改和再分发」。
   现在是 MIT，仓库根目录也有 LICENSE 文件。

3. **发布时不要带 `@updateURL` / `@downloadURL`**。Greasy Fork 分发时会自己注入指向
   `update.greasyfork.org` 的更新源，脚本里自带一份会跟它打架。所以构建时**不传 `--host`**。
   （`--host` 是给「自己找地方托管」用的，走 Greasy Fork 就别用。）

4. **脚本页面上的「作者」栏 = Greasy Fork 账号用户名，不是代码里的 `@author`**。
   想改那一栏，只能去 <https://greasyfork.org/zh-CN/users/edit> 改 `用户名`。
   代码里的 `@author` 决定的是油猴客户端里显示的作者。

5. **提交表单有 invisible reCAPTCHA**，正常点提交即可，不要去绕。

---

## 四、要改署名，得动这几个地方

一处没改干净就会露出来：

| 位置 | 改什么 |
|---|---|
| `tools/build-userscript.py` | `@author` 那一行（改完必须重新构建） |
| `LICENSE` | Copyright 那一行 |
| `安装说明.txt` | 结尾「其他问题找 XXX」 |
| Greasy Fork 账号 | <https://greasyfork.org/zh-CN/users/edit> 的 `用户名`（决定脚本页「作者」栏） |
| Greasy Fork 脚本 | 改完代码要去脚本页「更新代码」重新发一版，线上才会变 |

改完用 `git grep '真名'` 全仓库复查一遍，确认零命中。

> **仓库是公开的**：`tools/fixtures.js`、`tools/smoke-test.mjs`、`docs/API-RESEARCH.md` 里原本有
> 真实客户名和同事姓名，已全部换成虚构的（示例省机关、示例饮品集团、陈默、李维……）。
> **以后往测试数据里加东西，别再放真实客户名和同事真名。**

---

## 五、网络：结论和踩坑姿势

**测可达性必须禁代理**，否则结论是反的：

```bash
curl -s --noproxy '*' -o /dev/null --max-time 12 -w "%{http_code} %{time_total}s\n" <URL>
```

本机 shell 里有 `HTTPS_PROXY=127.0.0.1:7890`，`curl` 默认会走它。同事机器上没有代理，
**带着代理测出来的"能通"对他们毫无意义**。这个坑连着栽了两次：先是按带代理的结果选了 jsDelivr，
浏览器一打开就 `ERR_CONNECTION_CLOSED`。

裸连实测（2026-09）：

| 地址 | 裸连 | 走 7890 代理 |
|---|---|---|
| `update.greasyfork.org` | ✅ 200 · 1.7s | — |
| `greasyfork.org` | ✅ 200 · 0.8s | ❌ 000 |
| `raw.githubusercontent.com` | ✅ 200 · 1.1s | ❌ 超时 |
| `github.com` | ✅ 200 · 1.5s | ❌ 000 |
| `cdn.jsdelivr.net` 等 4 个节点 | ❌ 全部 000 | ✅ 200 |
| `openuserjs.org` | ❌ 503 | — |

**推论：`git push` 也要禁代理**，否则卡到超时：

```bash
env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u https_proxy -u http_proxy -u all_proxy git push
```

代理状况会变，下次卡住先按上面的方式两边都测一遍再下结论。

---

## 六、离线验证（不用登录云效、不发网络请求）

```bash
node tools/smoke-test.mjs      # 纯逻辑，291 项断言
```

界面要用浏览器看，起个本地静态服务器指到仓库根目录，然后开：

- `tools/preview.html` —— Chrome 扩展版
- `tools/userscript-preview.html` —— 油猴版（mock 了 `GM_*`，加载真实的 `.user.js` 产物）

合计条只在云效的列表页路由下注入（`parseLocation()` 只看 `location.pathname`，不看域名），
所以本地测它要把预览页挂在 `/projex/workitem` 这样的路径下。
