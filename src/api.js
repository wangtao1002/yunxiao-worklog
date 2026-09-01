(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  const PROJEX_BASE = '/projex/api';
  const CHARSET_KEY = '_input_charset';
  const NOT_LOGGED_IN = 'YXWT_NOT_LOGGED_IN';
  const MAX_PAGE_SIZE = 200;
  const DEFAULT_PAGE_SIZE = 200;
  const DEFAULT_MAX_PAGES = 20;
  const META_MAX_DEPTH = 12;
  const ORG_ID_RE = /[0-9a-f]{24}/i;

  /**
   * 工时写入端点（**已在真实云效上抓包实证**，不是猜的）。
   *
   * 关键认知：云效的工时**不走通用字段接口**。虽然「预计工时 / 实际工时」在
   * 工作项列表里以自定义字段（如 101586 / 101587）的形式读得到，但写入有专门的端点，
   * body 里还要带记录人、是否含休息日这些工时特有的参数。
   * 之前按 `field/value` 的形状写，云效一律回 400。
   *
   * 实测抓到的预计工时请求（2026-08-22，云效前端自己发的）：
   *   POST /projex/api/workitem/workitem/time/estimate?_input_charset=utf-8
   *   {"workitemIdentifier":"...","spentTime":3,"type":null,"description":"",
   *    "recordUserIdentifier":"<当前用户id>","forCreate":false,"containsRestDay":false}
   *
   * 注意 spentTime 是**数字**不是字符串。
   */
  const HOUR_WRITERS = {
    est: {
      key: 'timeEstimate',
      method: 'POST',
      path: '/workitem/workitem/time/estimate',
      body: function (workitemId, hours, ctx) {
        return {
          workitemIdentifier: String(workitemId),
          spentTime: hours,
          type: null,
          description: '',
          recordUserIdentifier: String((ctx && ctx.userId) || ''),
          // 该工作项之前没有预计工时时是「新建」，有值时是「更新」。
          // 判断错了云效会回 400，所以调用方会用相反的值再试一次。
          // 恒为 false。三次抓包（详情页改、列表就地改、有值/无值）云效**从来没发过 true**。
        // 曾经对「原来没值」的情况自作主张发 true，结果它去创建「工时登记记录」了，
        // 而不是设置工作项的预计工时字段 —— 工时明细里多出几条记录，
        // 列表里的「预计工时」列却始终是空的。forCreate 应该是指
        // 「是否在工作项创建时一并设置」，编辑已有工作项一律 false。
        forCreate: false,
          containsRestDay: false
        };
      }
    },
    act: {
      key: 'timeRecord',
      method: 'POST',
      path: '/workitem/workitem/time',
      // ⚠️ 语义与预计工时完全不同：这是「登记一条工时记录」，值是**累加**的，不是赋值。
      // 实测抓包（2026-08-22，云效前端自己发的）：
      //   POST /projex/api/workitem/workitem/time?_input_charset=utf-8
      //   {"workitemIdentifier":"...","type":null,"actualTime":3,"description":"",
      //    "recordUserIdentifier":"<用户id>","gmtStart":"2026-08-22T11:27:41+08:00",
      //    "gmtEnd":"2026-08-22T11:27:41+08:00","containsRestDay":false}
      // 所以调用方传进来的是「目标总量」，这里写的是「目标 − 当前」的增量。
      accumulative: true,
      body: function (workitemId, deltaHours, ctx) {
        const at = (ctx && ctx.at) || isoWithOffset(new Date());
        return {
          workitemIdentifier: String(workitemId),
          type: null,
          actualTime: deltaHours,
          description: (ctx && ctx.description) || '',
          recordUserIdentifier: String((ctx && ctx.userId) || ''),
          gmtStart: at,
          gmtEnd: at,
          containsRestDay: false
        };
      }
    }
  };

  /** 云效要的是带时区偏移的 ISO，比如 2026-08-22T11:27:41+08:00（不是 UTC 的 Z 结尾） */
  function isoWithOffset(d) {
    const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const oh = Math.floor(Math.abs(off) / 60);
    const om = Math.abs(off) % 60;
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) +
      'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) +
      sign + p2(oh) + ':' + p2(om);
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function apiError(message, code, traceId) {
    const err = new Error(message || '云效接口调用失败');
    err.code = code === undefined ? null : code;
    err.traceId = traceId || null;
    return err;
  }

  function notLoggedInError(httpStatus, traceId) {
    return apiError(NOT_LOGGED_IN, httpStatus === undefined ? null : httpStatus, traceId);
  }

  function isNotLoggedIn(err) {
    return !!err && err.message === NOT_LOGGED_IN;
  }

  // 拼 projex 接口地址：补 /projex/api 前缀 + 追加 _input_charset=utf-8（path 里可能已经带 ?）
  function buildProjexUrl(path) {
    let p = String(path || '');
    const hashAt = p.indexOf('#');
    let hash = '';
    if (hashAt >= 0) {
      hash = p.slice(hashAt);
      p = p.slice(0, hashAt);
    }
    if (p.charAt(0) !== '/') {
      p = '/' + p;
    }
    if (p.indexOf(PROJEX_BASE + '/') !== 0 && p !== PROJEX_BASE) {
      p = PROJEX_BASE + p;
    }
    if (!new RegExp('[?&]' + CHARSET_KEY + '=').test(p)) {
      p += (p.indexOf('?') >= 0 ? '&' : '?') + CHARSET_KEY + '=utf-8';
    }
    return p + hash;
  }

  // 云效有 HTTP 200 但 body 是 Spring 错误对象的坑，两种形状都要当失败处理
  function detectHttpShapedError(json) {
    const candidates = [json, json && json.result];
    for (let i = 0; i < candidates.length; i++) {
      const o = candidates[i];
      if (!o || typeof o !== 'object' || Array.isArray(o)) {
        continue;
      }
      const st = o.status;
      if (typeof st !== 'number' || st < 400) {
        continue;
      }
      // 工作项的 status 是对象，这里只认「数字 status + Spring 错误特征字段」
      const looksLikeSpring =
        hasOwn(o, 'error') || hasOwn(o, 'message') || hasOwn(o, 'path') ||
        hasOwn(o, 'timestamp') || hasOwn(o, 'exception');
      if (!looksLikeSpring) {
        continue;
      }
      const msg = (typeof o.error === 'string' && o.error) ||
        (typeof o.message === 'string' && o.message) || '';
      return { status: st, message: msg ? ('云效接口 ' + st + '：' + msg) : ('云效接口 ' + st) };
    }
    return null;
  }

  async function req(path, options) {
    const opts = options || {};
    const base = opts.base || 'projex';
    const method = (opts.method || 'GET').toUpperCase();
    const url = base === 'raw' ? String(path) : buildProjexUrl(path);

    const headers = Object.assign({ Accept: 'application/json, text/plain, */*' }, opts.headers || {});
    const init = { method: method, credentials: 'include', headers: headers };
    if (opts.signal) {
      init.signal = opts.signal;
    }
    if (opts.body !== undefined && opts.body !== null && method !== 'GET' && method !== 'HEAD') {
      if (typeof opts.body === 'string') {
        init.body = opts.body;
      } else {
        init.body = JSON.stringify(opts.body);
      }
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      if (e && e.name === 'AbortError') {
        throw e;
      }
      throw apiError('网络请求失败：' + ((e && e.message) || '未知错误'), 'YXWT_NETWORK', null);
    }

    if (res.status === 401 || res.status === 403) {
      throw notLoggedInError(res.status, res.headers.get('x-trace-id'));
    }
    // 被重定向到登录页时同样按未登录处理
    if (res.redirected && /\/(login|signin|passport)/i.test(res.url || '')) {
      throw notLoggedInError(res.status, null);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    let text;
    try {
      text = await res.text();
    } catch (e) {
      throw apiError('读取云效响应失败：' + ((e && e.message) || '未知错误'), res.status, null);
    }

    const trimmed = text.replace(/^\uFEFF/, '').trim();
    if (contentType.indexOf('text/html') >= 0 || trimmed.charAt(0) === '<') {
      throw notLoggedInError(res.status, null);
    }
    if (!trimmed) {
      if (!res.ok) {
        throw apiError('云效接口 HTTP ' + res.status, res.status, null);
      }
      throw apiError('云效接口返回空响应', res.status, null);
    }

    let json;
    try {
      json = JSON.parse(trimmed);
    } catch (e) {
      throw apiError('云效接口返回了无法解析的内容', res.status, null);
    }

    const traceId = (json && json.traceId) || res.headers.get('x-trace-id') || null;

    const shaped = detectHttpShapedError(json);
    if (shaped) {
      throw apiError(shaped.message, shaped.status, traceId);
    }

    const code = json && json.code;
    if (code !== undefined && code !== null && Number(code) !== 200) {
      const msg = (json && (json.errorMsg || json.msg)) || ('云效接口 ' + code);
      throw apiError(msg, code, traceId);
    }
    if (json && json.success === false) {
      const msg = (json.errorMsg || json.msg) || '云效接口返回失败';
      throw apiError(msg, code === undefined ? res.status : code, traceId);
    }
    if (!res.ok) {
      const msg = (json && (json.errorMsg || json.msg)) || ('云效接口 HTTP ' + res.status);
      throw apiError(msg, res.status, traceId);
    }

    return json;
  }

  // 从任意字符串里抠 organitionId（阿里把 organization 拼错了，两种拼写都兼容）
  function orgIdFromUrl(str) {
    if (!str || typeof str !== 'string') {
      return null;
    }
    const m = str.match(/[?&]organi(?:ti|zati)onId=([0-9a-zA-Z]+)/);
    if (m && m[1]) {
      return m[1];
    }
    const m2 = str.match(/\/organization\/([0-9a-f]{24})(?:[/?#]|$)/i);
    return m2 ? m2[1] : null;
  }

  function orgIdFromDom() {
    if (typeof document === 'undefined') {
      return null;
    }
    const fromLocation = orgIdFromUrl(location.href);
    if (fromLocation) {
      return fromLocation;
    }
    let nodes = [];
    try {
      nodes = document.querySelectorAll('a[href*="organization/"], [data-organization-id], [href*="organitionId"]');
    } catch (e) {
      nodes = [];
    }
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const dataId = el.getAttribute && el.getAttribute('data-organization-id');
      if (dataId && ORG_ID_RE.test(dataId)) {
        return dataId;
      }
      const href = (el.getAttribute && el.getAttribute('href')) || '';
      const hit = orgIdFromUrl(href);
      if (hit) {
        return hit;
      }
    }
    return null;
  }

  // 注：这里曾经有一级 uiless-devops.aliyun.com/api/sdk/preferences/lastWorkspace 的跨域兜底。
  // 它不在 manifest 的 host_permissions 里，也和 PRIVACY.md / README「只发往 devops.aliyun.com」
  // 的承诺冲突（请求即便被 CORS 拦掉也已经带着 Cookie 离开浏览器），所以整级删掉。
  // orgId 现在只靠同源的三级兜底：sdkConfigs.appUrl → 深搜 sdkConfigs → 扫 DOM。

  function deepFindOrgId(node, depth, seen) {
    if (!node || depth > 4) {
      return null;
    }
    if (typeof node === 'string') {
      return orgIdFromUrl(node);
    }
    if (typeof node !== 'object' || seen.has(node)) {
      return null;
    }
    seen.add(node);
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = node[k];
      if (typeof v === 'string' && /^organi(ti|zati)onId$/i.test(k) && v) {
        return v;
      }
      const hit = deepFindOrgId(v, depth + 1, seen);
      if (hit) {
        return hit;
      }
    }
    return null;
  }

  async function me() {
    const json = await req('/uiless/api/sdk/users/me', { base: 'raw' });
    const result = (json && json.result) || {};
    const user = result.user || {};
    const userId = user.id || user.identifier || null;
    if (!userId) {
      throw apiError(NOT_LOGGED_IN, json && json.code, json && json.traceId);
    }

    let orgId = orgIdFromUrl((result.sdkConfigs && result.sdkConfigs.appUrl) || '');
    if (!orgId) {
      orgId = deepFindOrgId(result.sdkConfigs, 0, new WeakSet());
    }
    if (!orgId) {
      orgId = orgIdFromDom();
    }

    return {
      userId: String(userId),
      name: user.name || user.realName || user.displayName || user.nickName || '',
      avatar: user.avatarUrl || user.avatar || '',
      email: user.email || '',
      orgId: orgId || null
    };
  }

  async function getUser(userId) {
    const json = await req('/common/user/' + encodeURIComponent(userId));
    const r = (json && json.result) || {};
    return {
      id: String(r.identifier || userId),
      name: r.displayName || r.realName || r.nickName || '',
      avatar: r.avatar || ''
    };
  }

  async function getOrg(orgId) {
    const json = await req('/common/organization/' + encodeURIComponent(orgId));
    const r = (json && json.result) || {};
    return {
      id: String(r.identifier || orgId),
      name: r.name || '',
      logo: r.logo || ''
    };
  }

  async function getView(viewId) {
    const json = await req('/workitem/view/' + encodeURIComponent(viewId));
    return (json && json.result) || null;
  }

  // 云效实体 id 都是 24 位 hex；内置视图（我负责的 / 近期我参与 / 待我验证…）返回的
  // spaceIdentifier 是字面量 'system'，直接拿去查 workitem/list 会恒返回 0 条。
  const REAL_ID_RE = /^[0-9a-f]{24}$/i;

  /**
   * 把 getView 的结果收敛成能直接用来查询的 {spaceType, spaceIdentifier, scope}。
   * 非法 spaceIdentifier（'system' 等）一律回落到 meUserId，避免恒 0 条。
   * 见 docs/API-VERIFY.md「修正一（必现 bug）」。
   */
  /**
   * 视图的 filter 是 JSON 字符串（二维数组），转成 workitem/list 要的 conditionGroups。
   *
   * 这段逻辑很容易写错而且**错了不报错、只是静默返回 0 条**，所以只留这一份实现，
   * panel 和 summarybar 都调它（曾经各写过一份，行为还不一致）。三个必须踩准的点：
   *   1. value 是空数组的条件表示「未启用」，必须整条丢掉，否则查不出东西；
   *   2. value 的元素形如 {label, value}，必须 unwrap 成裸值——实测传对象进去返回 0 条；
   *   3. className / format 藏在 c.field 里，不在 c 上。
   */
  function viewFilterToGroups(filter) {
    let raw = filter;
    if (typeof raw === 'string') {
      if (!raw.trim()) return [[]];
      try { raw = JSON.parse(raw); } catch (e) { return [[]]; }
    }
    if (!Array.isArray(raw) || !raw.length) return [[]];

    const groups = Array.isArray(raw[0]) ? raw : [raw];
    const out = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!Array.isArray(g)) continue;
      const conds = [];
      for (let j = 0; j < g.length; j++) {
        const c = viewConditionToCond(g[j]);
        if (c) conds.push(c);
      }
      if (conds.length) out.push(conds);
    }
    return out.length ? out : [[]];
  }

  function viewPickValue(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') {
      // 嵌套对象直接塞进去会静默查不到东西，所以只接受标量的 value / identifier
      if (v.value !== null && v.value !== undefined && typeof v.value !== 'object') return String(v.value);
      if (v.identifier !== null && v.identifier !== undefined && typeof v.identifier !== 'object') {
        return String(v.identifier);
      }
      return null;
    }
    return String(v);
  }

  function viewConditionToCond(c) {
    if (!c || typeof c !== 'object') return null;
    const field = c.field && typeof c.field === 'object' ? c.field : null;
    const fid = c.fieldIdentifier || (field ? field.identifier : '');
    if (!fid) return null;

    const rawValues = Array.isArray(c.value)
      ? c.value
      : (c.value === null || c.value === undefined || c.value === '' ? [] : [c.value]);
    const values = [];
    for (let i = 0; i < rawValues.length; i++) {
      const v = viewPickValue(rawValues[i]);
      if (v !== null && v !== '') values.push(v);
    }
    if (!values.length) return null;   // 未启用的条件

    const cond = {
      fieldIdentifier: String(fid),
      operator: c.operator || 'CONTAINS',
      value: values,
      toValue: viewPickValue(c.toValue)
    };
    const className = (field && field.className) || c.className;
    const format = (field && field.format) || c.format;
    if (className) cond.className = String(className);
    if (format) cond.format = String(format);
    return cond;
  }

  function normalizeViewSpace(view, meUserId) {
    const v = view || {};
    const out = {
      spaceType: v.spaceType ? String(v.spaceType) : 'User',
      spaceIdentifier: '',
      scope: undefined
    };
    const raw = v.spaceIdentifier === null || v.spaceIdentifier === undefined ? '' : String(v.spaceIdentifier);
    out.spaceIdentifier = REAL_ID_RE.test(raw) ? raw : String(meUserId || '');
    if (out.spaceType === 'User') {
      out.scope = v.scope ? String(v.scope) : 'personal';
    }
    return out;
  }

  function toPositiveInt(v, fallback, max) {
    const n = parseInt(v, 10);
    if (!isFinite(n) || n <= 0) {
      return fallback;
    }
    return max && n > max ? max : n;
  }

  async function listWorkitems(opts) {
    const o = opts || {};
    const spaceType = o.spaceType || 'User';
    const pageSize = toPositiveInt(o.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const maxPages = toPositiveInt(o.maxPages, DEFAULT_MAX_PAGES);
    const onProgress = typeof o.onProgress === 'function' ? o.onProgress : null;

    // 外部传对象，这里统一 stringify；空条件也必须是 {"conditionGroups":[[]]}
    const groups = Array.isArray(o.conditionGroups) && o.conditionGroups.length ? o.conditionGroups : [[]];
    const conditions = JSON.stringify({ conditionGroups: groups });
    const orderBy = o.orderBy ? JSON.stringify(o.orderBy) : null;
    // 「按状态分组 / 按类别分组」那排标签选中哪一项，云效是靠这个独立参数发的，
    // 不在 conditions 里。不带它就等于统计整个视图（页面显示 25 条、插件显示 3307 条）。
    // 实证形状（2026-08-22 抓的云效自己的请求）：
    //   {"fieldIdentifier":"status","className":"status","format":"list",
    //    "value":["100005"],"operator":"EQUALS"}     ← value 是 identifier 不是名字
    const groupCondition = o.groupCondition ? JSON.stringify(o.groupCondition) : null;

    const items = [];
    let total = 0;
    let truncated = false;
    let page = 1;

    for (; page <= maxPages; page++) {
      const body = {
        spaceType: spaceType,
        spaceIdentifier: String(o.spaceIdentifier == null ? '' : o.spaceIdentifier),
        category: o.category || '',
        toPage: page,
        pageSize: pageSize,
        searchType: o.searchType || 'LIST',
        conditions: conditions
      };
      if (spaceType === 'User') {
        body.scope = o.scope || 'personal';
      } else if (o.scope) {
        body.scope = o.scope;
      }
      if (orderBy) {
        body.orderBy = orderBy;
      }
      if (groupCondition) {
        body.groupCondition = groupCondition;
      }

      const json = await req('/workitem/workitem/list', {
        method: 'POST',
        body: body,
        signal: o.signal
      });

      const arr = Array.isArray(json.result) ? json.result
        : (json.result && Array.isArray(json.result.data) ? json.result.data : []);
      const reported = Number(json.totalCount != null ? json.totalCount
        : (json.result && json.result.totalCount != null ? json.result.totalCount : NaN));
      for (let i = 0; i < arr.length; i++) {
        items.push(arr[i]);
      }
      total = isFinite(reported) ? reported : items.length;

      if (onProgress) {
        try {
          onProgress(items.length, total);
        } catch (e) {
          // 进度回调不该影响拉取
        }
      }

      if (!arr.length || items.length >= total || arr.length < pageSize) {
        break;
      }
    }

    if (page > maxPages && items.length < total) {
      truncated = true;
    }
    return { items: items, total: total, truncated: truncated };
  }

  // 递归收集所有同时具备 identifier 和 (displayName||name) 的对象
  function collectFieldMeta(node, out, seen, keys, depth) {
    if (!node || typeof node !== 'object' || depth > META_MAX_DEPTH || seen.has(node)) {
      return;
    }
    seen.add(node);

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        collectFieldMeta(node[i], out, seen, keys, depth + 1);
      }
      return;
    }

    const id = node.identifier != null ? String(node.identifier) : '';
    const name = (typeof node.displayName === 'string' && node.displayName) ||
      (typeof node.name === 'string' && node.name) || '';
    if (id && name) {
      const key = id + '\u0000' + name;
      if (!keys.has(key)) {
        keys.add(key);
        out.push({
          id: id,
          name: name,
          className: node.className || node.fieldClassName || '',
          format: node.format || node.fieldFormat || '',
          type: node.type || node.fieldType || ''
        });
      }
    }

    const props = Object.keys(node);
    for (let i = 0; i < props.length; i++) {
      collectFieldMeta(node[props[i]], out, seen, keys, depth + 1);
    }
  }

  /**
   * 取「按 X 分组」那排标签。返回 [{identifier, name, count}]。
   * 形状照抄云效自己的请求（首轮抓包记录见 docs/API-RESEARCH.md）：
   *   POST /projex/api/workitem/workitem/group/list
   *   {spaceType, spaceIdentifier, category:'Workitem', conditions, size:200,
   *    groupFieldInfo:'{"identifier":"status","className":"status"}', scope}
   */
  async function listGroups(opts) {
    const o = opts || {};
    if (!o.groupField || !o.groupField.identifier) return [];
    const groups = Array.isArray(o.conditionGroups) && o.conditionGroups.length ? o.conditionGroups : [[]];
    const body = {
      spaceType: o.spaceType || 'User',
      spaceIdentifier: String(o.spaceIdentifier == null ? '' : o.spaceIdentifier),
      category: o.category || 'Workitem',
      conditions: JSON.stringify({ conditionGroups: groups }),
      size: 200,
      groupFieldInfo: JSON.stringify({
        identifier: String(o.groupField.identifier),
        className: String(o.groupField.className || o.groupField.identifier)
      })
    };
    if ((o.spaceType || 'User') === 'User') body.scope = o.scope || 'personal';

    const json = await req('/workitem/workitem/group/list', {
      method: 'POST', body: body, signal: o.signal
    });
    const arr = Array.isArray(json.result) ? json.result
      : (json.result && Array.isArray(json.result.data) ? json.result.data : []);
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const g = arr[i] || {};
      // 云效在不同分组维度下键名不完全一致，几种都兜住
      const id = g.identifier != null ? g.identifier
        : (g.value != null ? g.value : (g.id != null ? g.id : null));
      const name = g.displayName || g.name || g.label || (id == null ? '' : String(id));
      if (id == null || id === '') continue;
      out.push({
        identifier: String(id),
        name: String(name),
        count: Number(g.count != null ? g.count : (g.total != null ? g.total : 0)) || 0
      });
    }
    return out;
  }

  /**
   * 按 identifier 重读单个工作项。
   *
   * 这是**云效自己**写完工时后用来刷新那一行的方式（抓包实证：time/estimate 前面
   * 紧跟着就是这个请求）。用它做写后复核，读到的就是列表和刷新页面后看到的同一份数据，
   * 比读 field/value 可靠——工时写进的是工时子系统，自定义字段只是那边同步过来的副本。
   */
  async function getWorkitemById(workitemId, opts) {
    const o = opts || {};
    const json = await req('/workitem/workitem/list', {
      method: 'POST',
      body: {
        toPage: 1,
        pageSize: 1,
        searchType: 'LIST',
        conditions: JSON.stringify({
          conditionGroups: [[{
            fieldIdentifier: 'identifier',
            operator: 'CONTAINS',
            value: [String(workitemId)],
            toValue: null,
            className: 'string',
            format: 'input'
          }]]
        })
      },
      signal: o.signal
    });
    const arr = Array.isArray(json.result) ? json.result
      : (json.result && Array.isArray(json.result.data) ? json.result.data : []);
    return arr[0] || null;
  }

  /** 从工作项对象里取某个自定义字段的值（没值的字段在 customFields 里整条缺失） */
  function customFieldValue(item, fieldId) {
    if (!item || !fieldId) return null;
    const list = Array.isArray(item.customFields) ? item.customFields : [];
    for (let i = 0; i < list.length; i++) {
      const cf = list[i];
      if (cf && String(cf.fieldIdentifier) === String(fieldId)) {
        return cf.value === undefined ? null : cf.value;
      }
    }
    return null;
  }

  async function getFieldMeta(workitemId) {
    const json = await req('/workitem/workitem/field/' + encodeURIComponent(workitemId));
    const out = [];
    collectFieldMeta(json && json.result, out, new WeakSet(), new Set(), 0);
    return out;
  }

  async function getFieldValues(workitemId) {
    const json = await req('/workitem/workitem/field/value/' + encodeURIComponent(workitemId));
    return (json && json.result) !== undefined ? json.result : null;
  }

  // 字段值容器形状不稳定（数组 / customFields / 直接映射），逐种试
  function pickFieldValue(result, fieldId) {
    const target = String(fieldId);
    const lists = [];
    if (Array.isArray(result)) {
      lists.push(result);
    } else if (result && typeof result === 'object') {
      ['customFields', 'fieldValues', 'values', 'fields', 'result'].forEach(function (k) {
        if (Array.isArray(result[k])) {
          lists.push(result[k]);
        }
      });
    }

    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      for (let j = 0; j < list.length; j++) {
        const it = list[j];
        if (!it || typeof it !== 'object') {
          continue;
        }
        const id = it.fieldIdentifier != null ? it.fieldIdentifier
          : (it.identifier != null ? it.identifier : it.fieldId);
        if (id == null || String(id) !== target) {
          continue;
        }
        if (it.value !== undefined && it.value !== null) {
          return it.value;
        }
        if (it.fieldValue !== undefined && it.fieldValue !== null) {
          return it.fieldValue;
        }
        if (it.objectValue !== undefined) {
          return it.objectValue;
        }
        return null;
      }
    }

    if (result && typeof result === 'object' && !Array.isArray(result) && hasOwn(result, target)) {
      const v = result[target];
      if (v === null || typeof v !== 'object') {
        return v;
      }
      if (hasOwn(v, 'value')) {
        return v.value;
      }
    }
    return null;
  }

  function normValue(v) {
    if (v === undefined || v === null) {
      return '';
    }
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch (e) {
        return String(v);
      }
    }
    return String(v).trim();
  }

  // '2' 和 '2.0' 要算相等，所以两边都是数字时按数值比
  function sameValue(a, b) {
    const sa = normValue(a);
    const sb = normValue(b);
    if (sa === sb) {
      return true;
    }
    if (sa !== '' && sb !== '') {
      const na = Number(sa);
      const nb = Number(sb);
      if (isFinite(na) && isFinite(nb)) {
        return na === nb;
      }
    }
    return false;
  }

  /**
   * 写工时。which = 'est'（预计工时）或 'act'（实际工时）。
   *
   * 流程（每一步都不能省，写错的是用户线上工作项）：
   *   1. dryRun（默认）→ 只读当前值返回「旧值 → 新值」，一个写请求都不发
   *   2. 读当前值
   *   3. 值没变就跳过，不写（也避免在云效操作日志里留无意义记录）
   *   4. 写。forCreate 判断错云效会回 400，所以失败时用相反的值再试一次
   *   5. 写完再读回来复核，不一致就报失败
   *
   * @param workitemId 工作项 identifier
   * @param which      'est' | 'act'
   * @param hours      数字（云效要的是数字，不是字符串）
   * @param options    {dryRun, fieldId, userId}
   *                   fieldId 只用于「读当前值」——读是按自定义字段读的，写不是
   */
  async function saveWorkHours(workitemId, which, hours, options) {
    const opts = options || {};
    const dryRun = opts.dryRun !== false;
    const writer = HOUR_WRITERS[which];
    const fieldId = opts.fieldId;

    if (!writer) {
      return { ok: false, error: '不支持的工时类型：' + which };
    }

    // 读当前值走「按 identifier 重读工作项」——和列表、和刷新页面后看到的是同一份数据。
    // 早期用 field/value 读，那是自定义字段的副本，可能和工时子系统不同步，
    // 会出现「复核通过、刷新后工时没了」的假成功。
    const readCurrent = async function () {
      if (!fieldId) return null;
      const item = await getWorkitemById(workitemId, { signal: opts.signal });
      return customFieldValue(item, fieldId);
    };

    const target = Number(hours);
    if (!isFinite(target) || target < 0) {
      return { ok: false, error: '工时必须是不小于 0 的数字' };
    }

    if (dryRun) {
      let from = null;
      try {
        from = await readCurrent();
      } catch (e) {
        if (isNotLoggedIn(e)) throw e;
        from = null;
      }
      return {
        ok: true, dryRun: true,
        would: { workitemId: workitemId, which: which, from: from, to: target }
      };
    }

    const before = await readCurrent();
    if (sameValue(before, target)) {
      return { ok: true, skipped: 'unchanged', from: before, to: target };
    }

    let userId = opts.userId;
    if (!userId) {
      try {
        userId = (await me()).userId;
      } catch (e) {
        if (isNotLoggedIn(e)) throw e;
        userId = '';
      }
    }

    const current = Number(before) || 0;

    // 实际工时在云效里是「登记记录之和」，接口是**追加一条记录**而不是赋值。
    // 所以这里写的是增量；而且没有「负的登记」，减少只能去云效删记录。
    let payloadValue = target;
    let delta = null;
    if (writer.accumulative) {
      delta = Math.round((target - current) * 10) / 10;
      if (delta < 0) {
        return {
          ok: false,
          error: '实际工时在云效里是「工时登记」的累加值，只能增加不能改小（当前 ' + current +
            'h，想改成 ' + target + 'h）。要调小请到该工作项的「工时」页删掉对应的登记记录。',
          from: before, to: target, needsManual: true
        };
      }
      payloadValue = delta;
    }

    const attemptErrors = [];
    let wrote = false;
    // ⚠️ 只发一次，**绝不重试**。
    // 云效的工时（预计和实际都是）本质是「一条条记录」，右边显示的数字是这些记录的和。
    // 重试一次就多一条记录、总量翻倍。实测就出过这个事故：
    // 复核误判失败 → 用户重试 → 同一个工作项上多了 3 条「1 小时」的预计工时。
    // forCreate 的判断依据：之前没值 = 新建一条，已有值 = 更新已有的那条。
    for (const forCreate of [false]) {
      const body = writer.body(workitemId, payloadValue, {
        userId: userId, forCreate: forCreate, description: opts.description
      });
      try {
        await req(writer.path, { method: writer.method, body: body });
        wrote = true;
        break;
      } catch (e) {
        if (isNotLoggedIn(e)) throw e;
        attemptErrors.push(writer.key +
          (forCreate === null ? '' : '(forCreate=' + forCreate + ')') + ' → ' +
          ((e && e.message) || '写入失败') +
          (e && e.code !== undefined && e.code !== null ? '（code ' + e.code + '）' : '') +
          (e && e.traceId ? ' traceId=' + e.traceId : ''));
        try {
          console.warn('[云效工时统计] 工时写入失败：', {
            which: which, endpoint: writer.key, path: writer.path, body: body,
            error: (e && e.message) || e, code: e && e.code, traceId: e && e.traceId
          });
        } catch (ignored) { /* 控制台不可用时静默 */ }
      }
    }

    if (!wrote) {
      return {
        ok: false,
        error: attemptErrors[attemptErrors.length - 1] || '写入失败',
        attempts: attemptErrors,
        from: before, to: target
      };
    }

    // 云效的工时汇总字段是异步算出来的，写完立刻回读经常还是旧值。
    // 所以要等一等、多读几次；**而且即使最后仍对不上也不能报失败**——
    // POST 已经 200 了，报失败会诱导用户重试，而重试会再加一条工时记录。
    let after = null;
    let verified = false;
    let verifyError = null;
    const waits = [300, 700, 1500, 2500];
    for (let i = 0; i < waits.length; i++) {
      try {
        after = await readCurrent();
      } catch (e) {
        if (isNotLoggedIn(e)) throw e;
        verifyError = (e && e.message) || '未知错误';
        break;
      }
      if (!fieldId || sameValue(after, target)) { verified = true; break; }
      if (i < waits.length - 1) await sleep(waits[i]);
    }

    if (!verified) {
      return {
        ok: true,
        unverified: true,
        error: verifyError
          ? '已提交，但复核时读不到最新值（' + verifyError + '）'
          : '已提交，但云效的工时汇总还没刷新出来（读到 ' + after + '）',
        hint: '云效的工时汇总是异步算的，通常几秒后才更新。请刷新页面确认，**不要重复提交**——每提交一次就会多一条工时记录。',
        from: before, to: target, delta: delta, endpoint: writer.key
      };
    }
    // 写入成功也留一条日志：万一出现「提示成功但刷新后没有」，
    // 这条能直接看出「写前是多少、写了多少、写后复核读回多少」，不用再猜。
    try {
      console.info('[云效工时统计] 工时已写入：', {
        workitemId: workitemId, which: which, endpoint: writer.key,
        before: before, target: target, delta: delta, verified: after
      });
    } catch (ignored) { /* 控制台不可用时静默 */ }
    return { ok: true, from: before, to: target, delta: delta, endpoint: writer.key };
  }

  function pickFieldValue(result, fieldId) {
    const target = String(fieldId);
    const lists = [];
    if (Array.isArray(result)) {
      lists.push(result);
    } else if (result && typeof result === 'object') {
      ['customFields', 'fieldValues', 'values', 'fields', 'result'].forEach(function (k) {
        if (Array.isArray(result[k])) {
          lists.push(result[k]);
        }
      });
    }

    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      for (let j = 0; j < list.length; j++) {
        const it = list[j];
        if (!it || typeof it !== 'object') {
          continue;
        }
        const id = it.fieldIdentifier != null ? it.fieldIdentifier
          : (it.identifier != null ? it.identifier : it.fieldId);
        if (id == null || String(id) !== target) {
          continue;
        }
        if (it.value !== undefined && it.value !== null) {
          return it.value;
        }
        if (it.fieldValue !== undefined && it.fieldValue !== null) {
          return it.fieldValue;
        }
        if (it.objectValue !== undefined) {
          return it.objectValue;
        }
        return null;
      }
    }

    if (result && typeof result === 'object' && !Array.isArray(result) && hasOwn(result, target)) {
      const v = result[target];
      if (v === null || typeof v !== 'object') {
        return v;
      }
      if (hasOwn(v, 'value')) {
        return v.value;
      }
    }
    return null;
  }

  function normValue(v) {
    if (v === undefined || v === null) {
      return '';
    }
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch (e) {
        return String(v);
      }
    }
    return String(v).trim();
  }

  // '2' 和 '2.0' 要算相等，所以两边都是数字时按数值比
  function sameValue(a, b) {
    const sa = normValue(a);
    const sb = normValue(b);
    if (sa === sb) {
      return true;
    }
    if (sa !== '' && sb !== '') {
      const na = Number(sa);
      const nb = Number(sb);
      if (isFinite(na) && isFinite(nb)) {
        return na === nb;
      }
    }
    return false;
  }

  const cond = {
    user: function (fieldId, userIds) {
      return {
        fieldIdentifier: String(fieldId),
        operator: 'CONTAINS',
        value: Array.isArray(userIds) ? userIds.map(String) : [String(userIds)],
        toValue: null,
        className: 'user',
        format: 'list'
      };
    },
    dateBetween: function (fieldId, startYMD, endYMD) {
      return {
        fieldIdentifier: String(fieldId),
        operator: 'BETWEEN',
        value: [startYMD + ' 00:00:00'],
        toValue: endYMD + ' 23:59:59',
        className: 'date',
        format: 'input'
      };
    },
    category: function (values) {
      return {
        fieldIdentifier: 'category',
        operator: 'CONTAINS',
        value: Array.isArray(values) ? values.map(String) : [String(values)],
        className: 'category',
        format: 'list'
      };
    }
  };

  NS.api = {
    NOT_LOGGED_IN: NOT_LOGGED_IN,
    req: req,
    me: me,
    orgIdFromDom: orgIdFromDom,
    getUser: getUser,
    getOrg: getOrg,
    getView: getView,
    normalizeViewSpace: normalizeViewSpace,
    viewFilterToGroups: viewFilterToGroups,
    listWorkitems: listWorkitems,
    listGroups: listGroups,
    getFieldMeta: getFieldMeta,
    getFieldValues: getFieldValues,
    getWorkitemById: getWorkitemById,
    customFieldValue: customFieldValue,
    saveWorkHours: saveWorkHours,
    pickFieldValue: pickFieldValue,
    cond: cond
  };
})();
