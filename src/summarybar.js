/**
 * YXWT.summarybar —— 云效工作项列表页底部常驻统计条。
 * 依赖（均在本文件之前加载）：util / store / api / detect / stats / ui / panel。
 * 原则：任何一步失败都静默降级，只把「统计失败，点击重试」写到条上，绝不弹窗打断云效。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  const HOST_ID = 'yxwt-summarybar';
  const PAGE_PAD = '48px';        // 给 <html> 垫的底部留白，避免盖住云效分页器
  const POLL_MS = 500;            // 云效是 SPA，切视图不一定触发 hashchange，靠轮询兜底
  const DEBOUNCE_MS = 800;
  const PAGE_SIZE = 200;
  const MAX_PAGES = 10;           // 2000 条安全阀，超出在条上标注「+」
  const BIG_LIST = 800;           // 超过这么多条就不自动统计，先问一句

  const PERSONAL_RE = /^\/projex\/workitem(?:\/|$)/;
  const PROJECT_RE = /^\/projex\/project\/([^/?#]+)\/(task|req|bug|workitem)(?:\/|$)/;
  const VIEW_RE = /[#&?]viewIdentifier=([^&#/?]+)/;

  // 路径段 -> 云效 category，让统计范围和用户当前看的 tab 对齐
  const CATEGORY_BY_SEG = { task: 'Task', req: 'Req', bug: 'Bug', workitem: '' };

  const FALLBACK_PREFS = {
    showSummaryBar: true,
    dateBasis: 'planEnd',
    excludeCancelled: true,
    warnMissingEst: true,
    theme: 'auto'
  };

  const CSS = [
    // 满宽条会盖住云效表格的横向滚动条、挡住点击，改成可拖拽的紧凑浮标：
    // 宽度按内容走，默认停在右下角，位置记在本地。
    '.yxwt-sb{',
    '  position:fixed;z-index:2147483000;',
    '  box-sizing:border-box;height:32px;padding:0 6px 0 10px;',
    '  display:inline-flex;align-items:center;gap:10px;max-width:min(72vw,720px);',
    '  border-radius:16px;cursor:grab;user-select:none;touch-action:none;',
    '  font-family:-apple-system,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;',
    '  font-size:12px;line-height:1;letter-spacing:.01em;',
    '  color:var(--yxwt-fg,#1d2333);',
    '  background:var(--yxwt-bar-bg,rgba(255,255,255,.84));',
    '  -webkit-backdrop-filter:saturate(180%) blur(14px);',
    '  backdrop-filter:saturate(180%) blur(14px);',
    '  border:1px solid var(--yxwt-border,rgba(17,24,39,.12));',
    '  box-shadow:0 6px 20px rgba(17,24,39,.14);',
    '}',
    '.yxwt-sb.is-dragging{cursor:grabbing;box-shadow:0 10px 28px rgba(17,24,39,.22);}',
    // 折叠态：只留一个小圆点，完全不挡页面
    '.yxwt-sb.is-mini{padding:0 4px 0 8px;gap:6px;}',
    '.yxwt-sb.is-mini .yxwt-sb__msg,.yxwt-sb.is-mini .yxwt-sb__btn{display:none;}',
    '.yxwt-sb.is-mini .yxwt-sb__name{display:none;}',
    '.yxwt-sb__brand{appearance:none;border:0;font:inherit;cursor:pointer;}',
    '.yxwt-sb__brand{',
    '  flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;',
    '  padding:3px 8px;border-radius:999px;font-size:12px;font-weight:600;',
    '  color:var(--yxwt-accent,#2f6bff);',
    '  background:var(--yxwt-accent-soft,rgba(47,107,255,.10));',
    '}',
    '.yxwt-sb__dot{width:6px;height:6px;border-radius:50%;background:currentColor;}',
    // text-overflow 对 flex 子项无效，所以这里不写 ellipsis：改成让每个指标自己可收缩
    // （flex:0 1 auto + min-width:0），窄屏时收缩而不是被 overflow:hidden 齐刷刷切掉
    '.yxwt-sb__msg{',
    '  flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:14px;',
    '  overflow:hidden;white-space:nowrap;',
    '}',
    '.yxwt-sb__item{display:inline-flex;align-items:baseline;gap:5px;',
    '  flex:0 1 auto;min-width:0;overflow:hidden;}',
    '.yxwt-sb__k{color:var(--yxwt-muted,#6b7280);font-size:12px;white-space:nowrap;}',
    '.yxwt-sb__v{font-weight:600;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;',
    '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.yxwt-sb__v.is-good{color:var(--yxwt-good,#12855b);}',
    '.yxwt-sb__v.is-warn{color:var(--yxwt-warn,#c2670a);}',
    '.yxwt-sb__v.is-bad{color:var(--yxwt-bad,#d93a2b);}',
    '.yxwt-sb__v.is-dim{color:var(--yxwt-dim,#8a94a6);font-weight:400;}',
    '.yxwt-sb__text{color:var(--yxwt-muted,#6b7280);overflow:hidden;text-overflow:ellipsis;}',
    '.yxwt-sb__text.is-error{color:var(--yxwt-danger,#c62f2f);}',
    '.yxwt-sb__btn{',
    '  flex:0 0 auto;appearance:none;border:0;cursor:pointer;',
    '  height:22px;padding:0 10px;border-radius:6px;',
    '  font-family:inherit;font-size:12px;font-weight:600;',
    '  color:#fff;background:var(--yxwt-accent,#2f6bff);',
    '  transition:filter .15s ease,transform .15s ease;',
    '}',
    '.yxwt-sb__btn:hover{filter:brightness(1.08);}',
    '.yxwt-sb__btn:active{transform:translateY(1px);}',
    // 重试必须是真 button：挂在 div 上键盘和读屏都够不着
    '.yxwt-sb__retry{',
    '  appearance:none;border:0;background:transparent;cursor:pointer;padding:0;',
    '  font:inherit;color:var(--yxwt-danger,#c62f2f);text-decoration:underline;',
    '}',
    '.yxwt-sb__icon{',
    '  flex:0 0 auto;appearance:none;border:0;cursor:pointer;background:transparent;',
    '  width:20px;height:20px;border-radius:5px;line-height:1;font-size:12px;font-family:inherit;',
    '  color:var(--yxwt-muted,#6b7280);',
    '}',
    '.yxwt-sb__icon:hover{background:var(--yxwt-accent-soft,rgba(47,107,255,.10));}',
    '.yxwt-sb__btn:focus-visible,.yxwt-sb__icon:focus-visible,.yxwt-sb__retry:focus-visible{',
    '  outline:2px solid var(--yxwt-accent,#2f6bff);outline-offset:2px;',
    '}',
    '@media (max-width:720px){',
    '  .yxwt-sb{gap:8px;padding:0 6px;}',
    '  .yxwt-sb__brand{display:none;}',
    '  .yxwt-sb__msg{gap:10px;}',
    '}',
    '@media (prefers-color-scheme:dark){',
    '  :host(:not([data-theme="light"])) .yxwt-sb{',
    '    color:var(--yxwt-fg,#e6e8ee);',
    '    background:var(--yxwt-bar-bg,rgba(24,26,32,.86));',
    '    border-top-color:var(--yxwt-border,rgba(255,255,255,.12));',
    '    box-shadow:0 -6px 20px rgba(0,0,0,.35);',
    '  }',
    '  :host(:not([data-theme="light"])) .yxwt-sb__k,',
    '  :host(:not([data-theme="light"])) .yxwt-sb__text{color:var(--yxwt-muted,#9aa4b2);}',
    '  :host(:not([data-theme="light"])) .yxwt-sb__v.is-good{color:var(--yxwt-good,#3ddc97);}',
    '  :host(:not([data-theme="light"])) .yxwt-sb__v.is-warn{color:var(--yxwt-warn,#f5a524);}',
    '  :host(:not([data-theme="light"])) .yxwt-sb__v.is-bad{color:var(--yxwt-bad,#ff6b5c);}',
    '  :host(:not([data-theme="light"])) .yxwt-sb__text.is-error{color:var(--yxwt-danger,#ff6b6b);}',
    '}',
    ':host([data-theme="dark"]) .yxwt-sb{',
    '  color:var(--yxwt-fg,#e6e8ee);',
    '  background:var(--yxwt-bar-bg,rgba(24,26,32,.86));',
    '  border-top-color:var(--yxwt-border,rgba(255,255,255,.12));',
    '  box-shadow:0 -6px 20px rgba(0,0,0,.35);',
    '}',
    ':host([data-theme="dark"]) .yxwt-sb__k,',
    ':host([data-theme="dark"]) .yxwt-sb__text{color:var(--yxwt-muted,#9aa4b2);}',
    ':host([data-theme="dark"]) .yxwt-sb__v.is-good{color:var(--yxwt-good,#3ddc97);}',
    ':host([data-theme="dark"]) .yxwt-sb__v.is-warn{color:var(--yxwt-warn,#f5a524);}',
    ':host([data-theme="dark"]) .yxwt-sb__v.is-bad{color:var(--yxwt-bad,#ff6b5c);}',
    ':host([data-theme="dark"]) .yxwt-sb__text.is-error{color:var(--yxwt-danger,#ff6b6b);}'
  ].join('\n');

  const HIDE_KEY = 'yxwt_sb_hidden';   // 本次会话内隐藏（sessionStorage，关标签页即失效）

  function isHiddenThisSession() {
    try {
      return sessionStorage.getItem(HIDE_KEY) === '1';
    } catch (e) {
      return false;   // 隐私模式下 sessionStorage 会抛，当作没隐藏
    }
  }

  function setHiddenThisSession(v) {
    try {
      if (v) sessionStorage.setItem(HIDE_KEY, '1');
      else sessionStorage.removeItem(HIDE_KEY);
    } catch (e) {
      // 存不下就只能这次点了没记住，不影响主流程
    }
  }

  const state = {
    started: false,
    enabled: false,
    mounted: false,
    host: null,
    root: null,
    els: null,
    prefs: null,
    seq: 0,          // 递增序号：只认最后一次请求的结果，过期响应直接丢弃
    abort: null,
    timer: null,
    lastHref: '',
    lastKey: '',
    groupedView: false,
    forceKey: Object.create(null),   // 用户对某个列表点过「仍要统计」
    errored: false
  };

  function warn(e) {
    try {
      console.warn('[云效工时统计]', e);
    } catch (ignored) {
      // 控制台不可用时也不能抛
    }
  }

  function util() {
    return NS.util || null;
  }

  function fmtHours(n) {
    const u = util();
    if (u && typeof u.fmtHours === 'function') return u.fmtHours(n);
    const v = Number(n) || 0;
    return String(Math.round(v * 10) / 10);
  }

  function str(v) {
    return typeof v === 'string' ? v : (v === null || v === undefined ? '' : String(v));
  }

  function el(tag, cls, text) {
    const ui = NS.ui;
    if (ui && typeof ui.h === 'function') {
      return ui.h(tag, { class: cls || '', text: text === undefined ? '' : text });
    }
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  /* ---------------- 路由 ---------------- */

  function readViewId() {
    const hash = str(location.hash);
    let m = VIEW_RE.exec(hash);
    if (m) return decodeURIComponent(m[1]);
    m = VIEW_RE.exec(str(location.search));
    return m ? decodeURIComponent(m[1]) : '';
  }

  /** 当前页面是否是要注入的列表页；不是返回 null */
  function parseLocation() {
    const path = str(location.pathname);
    const viewId = readViewId();
    if (PERSONAL_RE.test(path)) {
      return { kind: 'user', projectId: '', category: '', viewId: viewId };
    }
    const m = PROJECT_RE.exec(path);
    if (m) {
      return {
        kind: 'project',
        projectId: m[1],
        category: CATEGORY_BY_SEG[m[2]] || '',
        viewId: viewId
      };
    }
    return null;
  }

  /** 只有这个 key 变了才值得重新拉数据（抽屉、选中项之类的 hash 变化不算） */
  function routeKey(ctx) {
    if (!ctx) return '';
    return ctx.kind + '|' + ctx.projectId + '|' + ctx.category + '|' + ctx.viewId;
  }

  /* ---------------- 视图 filter -> conditionGroups ---------------- */

  // 视图 filter -> conditionGroups 统一走 api.viewFilterToGroups（这段错了不报错、只会静默返回 0 条）
  function filterToConditionGroups(filter) {
    const groups = NS.api.viewFilterToGroups(filter);
    // 调用方靠 null 判断「没有可用条件」，保持原有语义
    return groups && groups.length && groups[0].length ? groups : null;
  }

  /* ---------------- 分组标签（页面上那排「已完成 2467 / 待处理 25」）---------------- */

  /**
   * 找出用户当前选中的分组标签。
   *
   * 不认云效的 class 名（`next-tabs-tab active` 这种随时会变），只认两样东西：
   *   1. 标准 ARIA：[role=tab] + aria-selected="true"
   *   2. 标签文字要能和后端返回的分组名对上
   * 页面上不止一处 tabs（工作项详情抽屉里也有「动态&评论/子项/工时」），
   * 所以先按「有几个标签名能对上后端分组」挑出正确的那一组 tabs。
   *
   * @param groups api.listGroups() 的结果 [{identifier, name, count}]
   * @return {identifier, name, count} | null（没分组 / 认不出来都返回 null）
   */
  function detectActiveGroup(groups) {
    if (!groups || !groups.length) return null;
    let tabs = [];
    try {
      tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
    } catch (e) {
      return null;
    }
    if (!tabs.length) return null;

    const byName = Object.create(null);
    groups.forEach(function (g) { byName[g.name] = g; });

    // 标签文字形如「已完成2467」：名字紧跟条数，把尾部数字剥掉
    const nameOf = function (tab) {
      const raw = String(tab.textContent || '').replace(/\s+/g, '').trim();
      if (byName[raw]) return raw;                       // 没带条数的情况
      const m = /^(.*?)(\d[\d,]*)$/.exec(raw);
      const stripped = m ? m[1] : raw;
      return byName[stripped] ? stripped : '';
    };

    // 按父节点分组，挑「命中后端分组名最多」的那一组 tabs
    const buckets = [];
    tabs.forEach(function (t) {
      const parent = t.parentElement || null;
      let b = null;
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].parent === parent) { b = buckets[i]; break; }
      }
      if (!b) { b = { parent: parent, tabs: [], hits: 0 }; buckets.push(b); }
      b.tabs.push(t);
      if (nameOf(t)) b.hits++;
    });
    buckets.sort(function (a, b) { return b.hits - a.hits; });
    const best = buckets[0];
    // 至少两个标签能对上才敢认，否则可能是页面上别处的 tabs
    if (!best || best.hits < 2) return null;

    let active = null;
    for (let i = 0; i < best.tabs.length; i++) {
      if (best.tabs[i].getAttribute('aria-selected') === 'true') { active = best.tabs[i]; break; }
    }
    if (!active) {
      // aria 缺失时的兜底：class 里带 active/selected/current
      for (let i = 0; i < best.tabs.length; i++) {
        if (/(^|[\s_-])(active|selected|current)([\s_-]|$)/i.test(String(best.tabs[i].className || ''))) {
          active = best.tabs[i];
          break;
        }
      }
    }
    if (!active) return null;

    const name = nameOf(active);
    if (!name) return null;
    const g = byName[name];

    // 交叉校验：标签上写的条数应该和后端给的对得上。对不上说明我们认错了标签，宁可不筛。
    const m = /(\d[\d,]*)$/.exec(String(active.textContent || '').replace(/\s+/g, ''));
    if (m && g.count) {
      const shown = Number(String(m[1]).replace(/,/g, ''));
      if (isFinite(shown) && shown !== g.count) return null;
    }
    return g;
  }

  /** 把选中的分组转成列表接口要的 groupCondition（实证形状见 docs/API-VERIFY.md） */
  function groupConditionOf(groupField, picked) {
    if (!groupField || !groupField.identifier || !picked) return null;
    return {
      fieldIdentifier: String(groupField.identifier),
      className: String(groupField.className || groupField.identifier),
      format: 'list',
      value: [String(picked.identifier)],
      operator: 'EQUALS'
    };
  }

  /* ---------------- 查询构造 ---------------- */

  async function buildQuery(ctx) {
    if (ctx.kind === 'project') {
      const q = {
        spaceType: 'Project',
        spaceIdentifier: ctx.projectId,
        category: ctx.category,
        conditionGroups: [[]],
        scopeText: '当前项目'
      };
      // 项目页同样要跟着当前视图的筛选走（SPEC 8），否则页面列表 30 条、合计条却统计全项目 800 条。
      // 注意：spaceType/spaceIdentifier 保持项目本身，不用 view 里的覆盖——项目视图的
      // spaceIdentifier 可能是 'system' 之类的非法值，拿去查会恒返回 0 条。
      if (!ctx.viewId) return q;
      let view = null;
      try {
        view = await NS.api.getView(ctx.viewId);
      } catch (e) {
        view = null;   // 视图取不到就退回「整个项目」，不让整条统计挂掉
      }
      if (!view) return q;
      const pgroups = filterToConditionGroups(view.filter);
      if (pgroups) q.conditionGroups = pgroups;
      if (view.name) q.scopeText = String(view.name);
      return q;
    }

    const me = await NS.detect.context();
    const query = {
      spaceType: 'User',
      spaceIdentifier: str(me && me.userId),
      scope: 'personal',
      category: '',
      conditionGroups: [[]],
      scopeText: '我的工作项'
    };
    if (!query.spaceIdentifier) throw new Error('未取到当前用户');
    if (!ctx.viewId) return query;

    let view = null;
    try {
      view = await NS.api.getView(ctx.viewId);
    } catch (e) {
      view = null;   // 视图取不到就退回「个人空间全部」，不让整条统计挂掉
    }
    if (!view) return query;

    // 内置视图的 spaceIdentifier 是字面量 'system'，直接拿去查会恒返回 0 条，
    // 统一交给 api.normalizeViewSpace 收敛（panel 的「导入同事」走的是同一个函数）
    const space = NS.api.normalizeViewSpace(view, query.spaceIdentifier);
    query.spaceType = space.spaceType;
    if (space.spaceIdentifier) query.spaceIdentifier = space.spaceIdentifier;
    if (space.scope === undefined) delete query.scope;
    else query.scope = space.scope;
    const groups = filterToConditionGroups(view.filter);
    if (groups) query.conditionGroups = groups;
    if (view.name) query.scopeText = String(view.name);
    // 视图开了分组时，页面上那排「已完成 2467 / 待处理 25」的标签是**额外的**筛选，
    // 不在 view.filter 里（云效是靠单独的 groupCondition 参数发的）。
    // 在支持它之前，必须说清楚浮标算的是整个视图，否则用户看到
    // 页面「共 25 条」而浮标「共 3307 条」，只会以为插件坏了。
    try {
      const gb = view.groupBy ? JSON.parse(view.groupBy) : null;
      if (gb && gb.fieldIdentifier) {
        query.groupField = {
          identifier: String(gb.fieldIdentifier),
          className: String(gb.className || gb.fieldIdentifier)
        };
      }
    } catch (e) { /* 解析不了就当没分组 */ }
    return query;
  }

  /* ---------------- 挂载 / 卸载 ---------------- */

  function applyTheme() {
    if (!state.host) return;
    const theme = state.prefs ? state.prefs.theme : 'auto';
    if (theme === 'dark' || theme === 'light') {
      state.host.setAttribute('data-theme', theme);
    } else {
      state.host.removeAttribute('data-theme');
    }
  }

  /**
   * 找出页面上真正在滚的容器。
   * 云效是 app shell 布局，滚动经常发生在内部 div 上而不是 <html>——
   * 那种情况下只给 <html> 加 padding-bottom 完全不产生位移，合计条会直接压住分页器。
   */
  function scrollContainers() {
    const out = [];
    const de = document.documentElement;
    if (de) out.push(de);
    if (!document.body || typeof window.getComputedStyle !== 'function') return out;

    const vh = window.innerHeight || 0;
    let nodes = [];
    try {
      nodes = document.body.querySelectorAll('div,main,section');
    } catch (e) {
      return out;
    }
    // 只看前若干个，避免在超大 DOM 上做全量 getComputedStyle
    const limit = Math.min(nodes.length, 400);
    for (let i = 0; i < limit && out.length < 4; i++) {
      const n = nodes[i];
      if (!n || n.clientHeight <= 0) continue;
      // 容器得撑满大半个视口，且内容确实溢出
      if (vh && n.clientHeight < vh * 0.5) continue;
      if (n.scrollHeight <= n.clientHeight + 8) continue;
      let oy = '';
      try {
        oy = window.getComputedStyle(n).overflowY;
      } catch (e) {
        continue;
      }
      if (oy !== 'auto' && oy !== 'scroll') continue;
      out.push(n);
    }
    return out;
  }

  function padNode(n) {
    if (!n || !n.style || !n.dataset) return;
    if (n.dataset.yxwtPad === '1') return;
    n.dataset.yxwtPadPrev = n.style.paddingBottom || '';
    n.dataset.yxwtPad = '1';
    n.style.paddingBottom = PAGE_PAD;
  }

  function unpadNode(n) {
    if (!n || !n.style || !n.dataset || n.dataset.yxwtPad !== '1') return;
    n.style.paddingBottom = n.dataset.yxwtPadPrev || '';
    delete n.dataset.yxwtPadPrev;
    delete n.dataset.yxwtPad;
  }

  // 浮标是紧凑的、可拖走的，不再需要给页面垫底部留白。
  // 保留 removePagePadding 是为了把**老版本**留在页面上的 padding 清掉，
  // 否则用户从旧版升级上来会看到云效底部凭空多一块空白。
  function addPagePadding() { /* 已改为浮标定位，不再垫页面 */ }

  const POS_KEY = '_sbPos';
  const MARGIN = 12;

  function clampPos(x, y, w, h) {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    return {
      x: Math.max(MARGIN, Math.min(x, vw - w - MARGIN)),
      y: Math.max(MARGIN, Math.min(y, vh - h - MARGIN))
    };
  }

  function applyPos(pos) {
    const bar = state.els && state.els.bar;
    if (!bar) return;
    const w = bar.offsetWidth || 320;
    const h = bar.offsetHeight || 32;
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    // 没存过位置就默认停右下角（避开云效自己的右下角悬浮球，往左让一点）
    const raw = pos && isFinite(pos.x) && isFinite(pos.y)
      ? pos
      : { x: vw - w - 72, y: vh - h - MARGIN };
    const p = clampPos(raw.x, raw.y, w, h);
    bar.style.left = p.x + 'px';
    bar.style.top = p.y + 'px';
    bar.style.right = 'auto';
    bar.style.bottom = 'auto';
  }

  const MINI_KEY = '_sbMini';

  function applyMini(on) {
    const bar = state.els && state.els.bar;
    if (!bar) return;
    if (on) bar.classList.add('is-mini');
    else bar.classList.remove('is-mini');
    keepInView();
  }

  function toggleMini() {
    const bar = state.els && state.els.bar;
    if (!bar) return;
    const next = !bar.classList.contains('is-mini');
    applyMini(next);
    if (NS.store && typeof NS.store.setPrefs === 'function') {
      const patch = {};
      patch[MINI_KEY] = next;
      NS.store.setPrefs(patch).catch(function () { /* 记不住只影响下次 */ });
    }
  }

  function keepInView() {
    const bar = state.els && state.els.bar;
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    if (!r.width) return;
    const p = clampPos(r.left, r.top, r.width, r.height);
    bar.style.left = p.x + 'px';
    bar.style.top = p.y + 'px';
  }

  function savePos(p) {
    if (!NS.store || typeof NS.store.setPrefs !== 'function') return;
    const patch = {};
    patch[POS_KEY] = { x: Math.round(p.x), y: Math.round(p.y) };
    NS.store.setPrefs(patch).catch(function () { /* 记不住只影响下次位置 */ });
  }

  /** 让浮标可以拖走。移动超过 3px 才算拖拽，否则当点击处理，不吞掉按钮 */
  function makeDraggable(bar) {
    let dragging = false;
    let moved = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;

    bar.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      // 按钮上按下不拖，否则点「详细统计」会变成拖拽
      const t = e.target;
      if (t && t.closest && t.closest('button')) return;
      dragging = true;
      moved = false;
      sx = e.clientX; sy = e.clientY;
      const r = bar.getBoundingClientRect();
      ox = r.left; oy = r.top;
      try { bar.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器忽略 */ }
    });

    bar.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      if (!moved) { moved = true; bar.classList.add('is-dragging'); }
      const p = clampPos(ox + dx, oy + dy, bar.offsetWidth, bar.offsetHeight);
      bar.style.left = p.x + 'px';
      bar.style.top = p.y + 'px';
      e.preventDefault();
    });

    const end = function (e) {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove('is-dragging');
      try { bar.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      if (!moved) return;
      const r = bar.getBoundingClientRect();
      savePos({ x: r.left, y: r.top });
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);

    // 窗口变小时别让浮标跑到视口外面去
    window.addEventListener('resize', function () {
      const r = bar.getBoundingClientRect();
      const p = clampPos(r.left, r.top, bar.offsetWidth, bar.offsetHeight);
      bar.style.left = p.x + 'px';
      bar.style.top = p.y + 'px';
    });
  }

  function removePagePadding() {
    const de = document.documentElement;
    unpadNode(de);
    let marked = [];
    try {
      marked = document.querySelectorAll('[data-yxwt-pad="1"]');
    } catch (e) {
      marked = [];
    }
    for (let i = 0; i < marked.length; i++) unpadNode(marked[i]);
  }

  function buildDom(root) {
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    const bar = el('div', 'yxwt-sb');
    const brand = el('button', 'yxwt-sb__brand');
    if (brand.setAttribute) {
      brand.setAttribute('type', 'button');
      brand.title = '点一下折叠/展开（折叠后只剩一个小标记，完全不挡页面）';
    }
    brand.appendChild(el('span', 'yxwt-sb__dot'));
    brand.appendChild(el('span', 'yxwt-sb__name', '工时统计'));
    brand.addEventListener('click', function () { toggleMini(); });
    const msg = el('div', 'yxwt-sb__msg');
    const btn = el('button', 'yxwt-sb__btn', '详细统计');
    if (btn.setAttribute) btn.setAttribute('type', 'button');

    // 设置入口：合计条上原本没有任何指引，用户想关掉只能自己去扩展管理里翻
    const gear = el('button', 'yxwt-sb__icon', '⚙');
    if (gear.setAttribute) {
      gear.setAttribute('type', 'button');
      gear.setAttribute('title', '打开插件设置');
      gear.setAttribute('aria-label', '打开插件设置');
    }

    // 关闭：只隐藏本次会话，重开标签页还在（永久关闭仍在设置页）
    const closeBtn = el('button', 'yxwt-sb__icon', '✕');
    if (closeBtn.setAttribute) {
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('title', '本次浏览会话内隐藏（想永久关闭请到插件设置）');
      closeBtn.setAttribute('aria-label', '隐藏合计条');
    }

    bar.appendChild(brand);
    bar.appendChild(msg);
    bar.appendChild(btn);
    bar.appendChild(gear);
    bar.appendChild(closeBtn);
    root.appendChild(bar);

    btn.addEventListener('click', function () {
      openPanel();
    });
    gear.addEventListener('click', function () {
      openOptions();
    });
    closeBtn.addEventListener('click', function () {
      setHiddenThisSession(true);
      unmount();
    });

    return { bar: bar, msg: msg, btn: btn };
  }

  function openOptions() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime &&
          typeof chrome.runtime.openOptionsPage === 'function') {
        chrome.runtime.openOptionsPage();
        return;
      }
    } catch (e) { /* 继续降级 */ }
    try {
      const p = chrome.runtime.sendMessage({ type: 'YXWT_OPEN_OPTIONS' });
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {
      warn(e);
    }
  }

  function ensureMounted() {
    if (state.mounted) return true;
    if (isHiddenThisSession()) return false;
    if (!document.body) return false;
    const ui = NS.ui;
    if (!ui || typeof ui.mount !== 'function') return false;

    let mounted = null;
    try {
      mounted = ui.mount(HOST_ID);
    } catch (e) {
      warn(e);
      return false;
    }
    if (!mounted || !mounted.root) return false;

    state.host = mounted.host || null;
    state.root = mounted.root;
    state.els = buildDom(mounted.root);
    state.mounted = true;
    applyTheme();
    // 老版本可能给页面垫过底部留白，升级上来要清掉，否则云效底部凭空多一块空白
    removePagePadding();
    applyMini(!!(state.prefs && state.prefs[MINI_KEY]));
    applyPos(state.prefs && state.prefs[POS_KEY]);
    makeDraggable(state.els.bar);
    return true;
  }

  function unmount() {
    state.seq++;   // 让在途请求的结果失效
    abortInFlight();
    if (!state.mounted) return;
    try {
      if (NS.ui && typeof NS.ui.unmount === 'function') NS.ui.unmount(HOST_ID);
    } catch (e) {
      warn(e);
    }
    removePagePadding();
    state.mounted = false;
    state.host = null;
    state.root = null;
    state.els = null;
    state.errored = false;
    state.lastKey = '';
  }

  function openPanel() {
    const panel = NS.panel;
    if (!panel || typeof panel.open !== 'function') {
      warn('面板模块未就绪');
      return;
    }
    try {
      const r = panel.open();
      if (r && typeof r.catch === 'function') r.catch(warn);
    } catch (e) {
      warn(e);
    }
  }

  /* ---------------- 渲染 ---------------- */

  function setText(text, isError) {
    if (!state.els) return;
    const msg = state.els.msg;
    clearNode(msg);
    if (isError) {
      // 重试做成真 <button>：原来是给 div 挂 click，键盘和读屏用户既感知不到也点不了
      const b = el('button', 'yxwt-sb__retry', text);
      if (b.setAttribute) b.setAttribute('type', 'button');
      b.addEventListener('click', refreshNow);
      msg.appendChild(b);
    } else {
      msg.appendChild(el('span', 'yxwt-sb__text', text));
    }
    state.errored = !!isError;
  }

  function setMetrics(items, title) {
    if (!state.els) return;
    const msg = state.els.msg;
    clearNode(msg);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const wrap = el('span', 'yxwt-sb__item');
      wrap.appendChild(el('span', 'yxwt-sb__k', it.k));
      wrap.appendChild(el('span', 'yxwt-sb__v' + (it.tone ? ' is-' + it.tone : ''), it.v));
      msg.appendChild(wrap);
    }
    // 窄屏会收缩甚至截断，把完整数值一并写进 title，悬浮至少读得到
    const full = items.map(function (it) {
      return (it.k ? it.k + ' ' : '') + it.v;
    }).join(' · ');
    if (msg.setAttribute) msg.setAttribute('title', full + (title ? '\n' + title : ''));
    state.errored = false;
    // 内容变了宽度就变了，重新夹一次，别让浮标被撑出视口
    keepInView();
  }

  function renderLoading(loaded, total) {
    if (total > 0 && loaded > 0 && loaded < total) {
      setText('统计中… ' + loaded + '/' + total, false);
    } else {
      setText('统计中…', false);
    }
  }

  /** 列表太大时不自动统计，给一个可点的入口，别让用户以为插件坏了 */
  function renderTooBig(total, key, scopeText) {
    if (!state.els) return;
    const msg = state.els.msg;
    clearNode(msg);
    const wrap = el('span', 'yxwt-sb__item');
    wrap.appendChild(el('span', 'yxwt-sb__k', '共'));
    wrap.appendChild(el('span', 'yxwt-sb__v', String(total) + ' 条'));
    msg.appendChild(wrap);
    const go = el('button', 'yxwt-sb__retry', '条数较多，点此统计');
    if (go.setAttribute) go.setAttribute('type', 'button');
    go.addEventListener('click', function () {
      state.forceKey[key] = true;
      refreshNow();
    });
    msg.appendChild(go);
    if (msg.setAttribute) {
      msg.setAttribute('title', '统计范围：' + (scopeText || '当前列表') +
        '\n共 ' + total + ' 条，超过 ' + BIG_LIST + ' 条不自动统计（要翻很多页，慢且占用云效资源）。' +
        '点一下就会统计，或者先用云效的筛选把范围缩小。');
    }
    state.errored = false;
    keepInView();
  }

  function renderError(e) {
    const raw = e && e.message ? String(e.message) : String(e || '');
    let tip = '统计失败，点击重试';
    if (raw === 'YXWT_NOT_LOGGED_IN') tip = '未登录云效，登录后点击重试';
    setText(tip, true);
    if (state.els && state.els.msg && state.els.msg.setAttribute && raw) {
      state.els.msg.setAttribute('title', raw);
    }
  }

  function renderResult(sum, hasFieldMap, truncated, scopeText, skipped, missing) {
    const items = [{
      k: '共',
      v: String(Number(sum.count) || 0) + (truncated ? '+' : '') + ' 条'
    }];
    // 云效列表显示的是原始条数，这里排除了已取消。浮标要窄，所以只在条数后面
    // 加个小角标，完整说明放 tooltip 里（不说明会让人以为算错了）。
    if (skipped > 0) {
      items[0].v += '*';
    }
    // 分组视图下，页面显示的条数和浮标不一致是必然的，加个显式标记别让人猜
    if (state.groupedView) {
      items.push({ k: '', v: '全视图', tone: 'dim' });
    }
    if (hasFieldMap) {
      const diff = Number(sum.diff) || 0;
      items.push({ k: '预计', v: fmtHours(sum.est) + ' h' });
      items.push({ k: '实际', v: fmtHours(sum.act) + ' h' });
      items.push({
        k: '偏差',
        v: (diff > 0 ? '+' : '') + fmtHours(diff) + ' h',
        tone: diff > 0 ? 'warn' : (diff < 0 ? 'good' : '')
      });
      // 漏填的预计工时会把上面的「预计」压低，不点出来根本发现不了
      if (missing > 0) items.push({ k: '未填预计', v: String(missing) + ' 条', tone: 'bad' });
    } else {
      items.push({ k: '', v: '未识别到工时字段' });
    }
    let title = '统计范围：' + (scopeText || '当前列表');
    if (state.groupedView) {
      title += '\n⚠ 这个视图开了分组：浮标统计的是**整个视图**，不随你点的分组标签（如「待处理 25」）变化。';
    }
    if (skipped > 0) title += '\n* 已排除 ' + skipped + ' 条「已取消」的工作项（可在设置页关掉）';
    if (missing > 0) {
      title += '\n⚠ ' + missing + ' 条没填「预计工时」，上面的预计合计是偏低的；点「详细统计」可以标红置顶看是哪些。';
    }
    if (truncated) title += '（超出 ' + PAGE_SIZE * MAX_PAGES + ' 条，仅统计前 ' + PAGE_SIZE * MAX_PAGES + ' 条）';
    if (!hasFieldMap) title += '；请到设置页手动指定预计/实际工时字段';
    setMetrics(items, title);
  }

  /* ---------------- 拉数 ---------------- */

  function abortInFlight() {
    if (state.abort) {
      try {
        state.abort.abort();
      } catch (e) {
        // AbortController 不可用时忽略
      }
      state.abort = null;
    }
  }

  function isAbort(e) {
    return !!e && (e.name === 'AbortError' || String(e.message || '').indexOf('abort') >= 0);
  }

  async function doRefresh() {
    const ctx = parseLocation();
    if (!ctx || !state.enabled || isHiddenThisSession()) {
      unmount();
      return;
    }
    if (!ensureMounted()) return;

    state.lastKey = routeKey(ctx);
    addPagePadding();   // SPA 换页后滚动容器可能换了，重算一次避让
    const seq = ++state.seq;
    abortInFlight();

    let controller = null;
    if (typeof AbortController === 'function') {
      controller = new AbortController();
      state.abort = controller;
    }

    renderLoading(0, 0);

    try {
      let fieldMap = null;
      try {
        fieldMap = await NS.detect.fieldMap();
      } catch (e) {
        fieldMap = null;   // 字段探测失败不影响「共 N 条」
      }
      if (seq !== state.seq) return;

      const query = await buildQuery(ctx);
      if (seq !== state.seq) return;

      // 视图开了分组时，先把用户点中的那个标签解出来。
      // 这一步失败（认不出来/接口挂了）不能让整条统计失败，退回「全视图」并标注。
      let picked = null;
      if (query.groupField) {
        try {
          const groups = await NS.api.listGroups({
            spaceType: query.spaceType,
            spaceIdentifier: query.spaceIdentifier,
            scope: query.scope,
            conditionGroups: query.conditionGroups,
            groupField: query.groupField,
            signal: controller ? controller.signal : undefined
          });
          if (seq !== state.seq) return;
          picked = detectActiveGroup(groups);
        } catch (e) {
          if (isAbort(e)) return;
          warn(e);
        }
      }
      const groupCondition = groupConditionOf(query.groupField, picked);
      // 只有「开了分组但没认出选中项」才需要提示统计范围是全视图
      state.groupedView = !!query.groupField && !groupCondition;
      if (picked) query.scopeText = (query.scopeText || '当前列表') + ' · ' + picked.name;

      // 先只拉 1 条探总量：像「全部任务 10228 条」这种列表，
      // 无脑翻 10 页拉 2000 条既慢又给云效添负担，而且合计出来也没什么意义。
      // 超过阈值就停下来问一句，让人自己决定要不要统计。
      const probe = await NS.api.listWorkitems({
        spaceType: query.spaceType,
        spaceIdentifier: query.spaceIdentifier,
        scope: query.scope,
        category: query.category,
        conditionGroups: query.conditionGroups,
        groupCondition: groupCondition,
        pageSize: 1,
        maxPages: 1,
        signal: controller ? controller.signal : undefined
      });
      if (seq !== state.seq) return;

      const total = Number(probe.total) || 0;
      const routeId = routeKey(ctx) + '|' + (picked ? picked.identifier : '');
      if (total > BIG_LIST && !state.forceKey[routeId]) {
        renderTooBig(total, routeId, query.scopeText);
        return;
      }

      const res = await NS.api.listWorkitems({
        spaceType: query.spaceType,
        spaceIdentifier: query.spaceIdentifier,
        scope: query.scope,
        category: query.category,
        conditionGroups: query.conditionGroups,
        groupCondition: groupCondition,
        pageSize: PAGE_SIZE,
        maxPages: MAX_PAGES,
        signal: controller ? controller.signal : undefined,
        onProgress: function (loaded, tot) {
          if (seq === state.seq) renderLoading(loaded, tot || total);
        }
      });
      if (seq !== state.seq) return;

      const prefs = state.prefs || FALLBACK_PREFS;
      const rows = NS.stats.normalize(res.items, fieldMap, {
        dateBasis: prefs.dateBasis,
        excludeCancelled: prefs.excludeCancelled
      });
      const sum = NS.stats.summarize(rows);
      const skipped = prefs.excludeCancelled
        ? Math.max(0, (res.items ? res.items.length : 0) - rows.length)
        : 0;
      const hasFieldMap = !!(fieldMap && (fieldMap.estimated || fieldMap.actual));
      // 预计工时字段没识别出来时整表 est 都是 0，这时候提示「全都没填」是误报
      const canWarnMissing = !!(fieldMap && fieldMap.estimated && fieldMap.estimated.id) &&
        prefs.warnMissingEst !== false;
      const missing = canWarnMissing ? NS.stats.missingEst(rows).count : 0;
      renderResult(sum, hasFieldMap, !!res.truncated, query.scopeText, skipped, missing);
    } catch (e) {
      if (seq !== state.seq || isAbort(e)) return;
      warn(e);
      renderError(e);
    } finally {
      if (state.abort === controller) state.abort = null;
    }
  }

  let scheduled = null;

  function scheduleRefresh() {
    if (!scheduled) {
      const u = util();
      scheduled = u && typeof u.debounce === 'function'
        ? u.debounce(runRefresh, DEBOUNCE_MS)
        : runRefresh;
    }
    scheduled();
  }

  function runRefresh() {
    doRefresh().catch(warn);
  }

  function refreshNow() {
    state.lastKey = '';
    runRefresh();
  }

  /* ---------------- 路由监听 ---------------- */

  function onLocationMaybeChanged() {
    const href = location.href;
    if (href === state.lastHref) return;
    state.lastHref = href;

    const ctx = parseLocation();
    if (!ctx) {
      unmount();
      return;
    }
    const key = routeKey(ctx);
    if (state.mounted && key === state.lastKey) return;   // 只是抽屉/选中项变化，不重拉
    state.lastKey = key;
    scheduleRefresh();
  }

  function startWatch() {
    if (state.timer) return;
    window.addEventListener('hashchange', onLocationMaybeChanged, false);
    window.addEventListener('popstate', onLocationMaybeChanged, false);
    state.timer = setInterval(onLocationMaybeChanged, POLL_MS);
  }

  function stopWatch() {
    if (!state.timer) return;
    window.removeEventListener('hashchange', onLocationMaybeChanged, false);
    window.removeEventListener('popstate', onLocationMaybeChanged, false);
    clearInterval(state.timer);
    state.timer = null;
  }

  function apply() {
    const prefs = state.prefs || FALLBACK_PREFS;
    state.enabled = prefs.showSummaryBar !== false;
    if (!state.enabled) {
      stopWatch();
      unmount();
      return;
    }
    startWatch();
    state.lastHref = location.href;
    if (!parseLocation()) {
      unmount();
      return;
    }
    applyTheme();
    scheduleRefresh();
  }

  function samePrefs(a, b) {
    if (!a || !b) return false;
    return a.showSummaryBar === b.showSummaryBar &&
      a.dateBasis === b.dateBasis &&
      a.excludeCancelled === b.excludeCancelled &&
      a.warnMissingEst === b.warnMissingEst &&
      a.theme === b.theme;
  }

  async function init() {
    if (state.started) return;
    state.started = true;

    let cfg = null;
    try {
      cfg = await NS.store.get();
    } catch (e) {
      warn(e);
    }
    state.prefs = (cfg && cfg.prefs) || FALLBACK_PREFS;

    try {
      NS.store.onChange(function (next) {
        const prefs = (next && next.prefs) || FALLBACK_PREFS;
        if (samePrefs(prefs, state.prefs)) return;
        const wasEnabled = state.enabled;
        state.prefs = prefs;
        applyTheme();
        if (prefs.showSummaryBar === false || !wasEnabled) {
          apply();          // 开关变化：整体启停
        } else {
          refreshNow();     // 口径/主题变化：重算一次
        }
      });
    } catch (e) {
      warn(e);
    }

    apply();
  }

  NS.summarybar = {
    // 仅供测试：分组标签检测依赖页面 DOM，是最容易悄悄失效的一段
    _detectActiveGroup: detectActiveGroup,
    _groupConditionOf: groupConditionOf,
    init: init,
    refresh: refreshNow,
    unmount: unmount,
    isMounted: function () {
      return state.mounted;
    }
  };
})();
