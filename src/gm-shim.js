/**
 * gm-shim.js —— 油猴（Tampermonkey）版专用垫片，只被 tools/build-userscript.py 打进 .user.js，
 * 不进 Chrome 扩展包。
 *
 * 它把 GM_* 伪造成扩展版用的那套 chrome.* API，好让 store.js / panel.js / options.js
 * 这些文件在两个版本之间**一行都不用改**——否则维护两套代码，迟早腐烂成两个插件。
 *
 * 关键约束：不能往全局写 chrome。网页里本来就有 window.chrome（Chrome 浏览器自带），
 * 覆盖它可能把云效自己搞坏。所以构建脚本会把所有模块包进一个 IIFE，
 * 把这里导出的对象作为名为 chrome 的**形参**传进去，模块里的 chrome 就解析到形参上，
 * 全局那个原封不动。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  // 扩展版的 chrome.storage.local 是「顶层多个 key」的形状，store.js 只用 get(null) / set(patch) / clear()。
  // 这里统一塞进一个 GM 值：读就是整个对象，写就是浅合并。这样 GM_addValueChangeListener
  // 只需要盯一个 key，跨标签页同步也自然就有了。
  const KEY = 'yxwt.config';

  function readAll() {
    try {
      const raw = GM_getValue(KEY, null);
      if (!raw) return {};
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      warn(e);
      return {};
    }
  }

  function writeAll(obj) {
    // 存字符串而不是对象：Tampermonkey 对对象值会做自己的序列化，跨版本行为不完全一致，
    // 存 JSON 字符串最稳，也方便用户在油猴的「存储」面板里直接看内容。
    GM_setValue(KEY, JSON.stringify(obj || {}));
  }

  function warn(e) {
    try {
      console.warn('[云效工时统计]', e);
    } catch (ignored) {
      // 控制台不可用时静默
    }
  }

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  /** 回调可能被同步调用，统一推到微任务里，跟扩展版的异步语义保持一致 */
  function defer(fn) {
    Promise.resolve().then(fn);
  }

  const listeners = [];

  function emit(changes) {
    if (!changes || !Object.keys(changes).length) return;
    listeners.slice().forEach(function (fn) {
      try {
        fn(changes, 'local');
      } catch (e) {
        warn(e);
      }
    });
  }

  const local = {
    get: function (keys, cb) {
      // store.js 只会传 null（取全部），其余形态一并兼容，免得以后改了 store 这里就崩
      const done = typeof keys === 'function' ? keys : cb;
      const sel = typeof keys === 'function' ? null : keys;
      const all = readAll();
      let out;
      if (sel === null || sel === undefined) {
        out = clone(all);
      } else if (typeof sel === 'string') {
        out = {};
        out[sel] = clone(all[sel]);
      } else if (Array.isArray(sel)) {
        out = {};
        sel.forEach(function (k) { out[k] = clone(all[k]); });
      } else {
        out = {};
        Object.keys(sel).forEach(function (k) {
          out[k] = all[k] === undefined ? clone(sel[k]) : clone(all[k]);
        });
      }
      if (typeof done === 'function') defer(function () { done(out); });
    },

    set: function (payload, cb) {
      const all = readAll();
      const changes = {};
      Object.keys(payload || {}).forEach(function (k) {
        changes[k] = { oldValue: clone(all[k]), newValue: clone(payload[k]) };
        all[k] = clone(payload[k]);
      });
      writeAll(all);
      if (typeof cb === 'function') defer(cb);
      // 本标签页的监听要自己派发：GM_addValueChangeListener 只通知**别的**标签页
      defer(function () { emit(changes); });
    },

    remove: function (keys, cb) {
      const all = readAll();
      const list = Array.isArray(keys) ? keys : [keys];
      const changes = {};
      list.forEach(function (k) {
        if (!(k in all)) return;
        changes[k] = { oldValue: clone(all[k]) };
        delete all[k];
      });
      writeAll(all);
      if (typeof cb === 'function') defer(cb);
      defer(function () { emit(changes); });
    },

    clear: function (cb) {
      const all = readAll();
      const changes = {};
      Object.keys(all).forEach(function (k) { changes[k] = { oldValue: clone(all[k]) }; });
      writeAll({});
      if (typeof cb === 'function') defer(cb);
      defer(function () { emit(changes); });
    }
  };

  // 别的标签页改了配置 -> 这边跟着刷新。扩展版靠 chrome.storage.onChanged 天然拥有这个能力。
  try {
    if (typeof GM_addValueChangeListener === 'function') {
      GM_addValueChangeListener(KEY, function (name, oldValue, newValue, remote) {
        if (!remote) return;                    // 本页自己写的已经在 set 里派发过了
        let prev = {};
        let next = {};
        try {
          prev = oldValue ? JSON.parse(oldValue) : {};
          next = newValue ? JSON.parse(newValue) : {};
        } catch (e) {
          warn(e);
        }
        const changes = {};
        const keys = Object.keys(prev).concat(Object.keys(next));
        keys.forEach(function (k) {
          if (changes[k]) return;
          if (JSON.stringify(prev[k]) === JSON.stringify(next[k])) return;
          changes[k] = { oldValue: clone(prev[k]), newValue: clone(next[k]) };
        });
        emit(changes);
      });
    }
  } catch (e) {
    warn(e);
  }

  // 扩展版里这些是 background / options 页的活。油猴没有那两样东西，
  // 但设置页和面板就在同一个页面里，所以全部退化成本地直调。
  const runtime = {
    // store.js 每次调用后都会读一下它，必须存在且为假值
    lastError: null,

    getManifest: function () {
      return { version: NS.__version || '0.0.0' };
    },

    getURL: function (path) {
      return String(path || '');
    },

    openOptionsPage: function (cb) {
      try {
        if (typeof NS.__openOptions === 'function') NS.__openOptions();
      } catch (e) {
        warn(e);
      }
      if (typeof cb === 'function') defer(cb);
    },

    // 扩展版里设置页（chrome-extension:// 源）调不了云效接口，得把「重新探测」发给内容脚本。
    // 油猴版里设置页就在云效页面上，本地直接执行，消息通道只是个空壳兼容层。
    onMessage: {
      addListener: function () {},
      removeListener: function () {}
    },
    sendMessage: function (msg, cb) {
      if (typeof cb === 'function') defer(function () { cb({ ok: true }); });
      return Promise.resolve({ ok: true });
    }
  };

  // options.js 的「重新探测字段」原本要先找云效标签页再发消息。这里把它短路到当前页：
  // 报一个假的 tab，sendMessage 直接跑本地探测。
  const FAKE_TAB = { id: 1, url: location.href, title: document.title || '云效' };

  const tabs = {
    query: function (info, cb) {
      const out = location.hostname === 'devops.aliyun.com' ? [FAKE_TAB] : [];
      if (typeof cb === 'function') defer(function () { cb(out); });
    },
    create: function (info, cb) {
      try {
        window.open((info && info.url) || 'https://devops.aliyun.com/projex/workitem', '_blank');
      } catch (e) {
        warn(e);
      }
      if (typeof cb === 'function') defer(function () { cb(FAKE_TAB); });
    },
    sendMessage: function (tabId, msg, cb) {
      const reply = function (res) {
        if (typeof cb === 'function') defer(function () { cb(res); });
      };
      if (!msg || msg.type !== 'YXWT_REDETECT_FIELDS') {
        reply({ ok: true });
        return;
      }
      if (!NS.detect || typeof NS.detect.fieldMap !== 'function') {
        reply({ ok: false, error: '探测模块未就绪，请刷新云效页面后重试' });
        return;
      }
      try {
        if (typeof NS.detect.clearCache === 'function') NS.detect.clearCache();
      } catch (e) {
        warn(e);
      }
      Promise.resolve()
        .then(function () { return NS.detect.fieldMap(true); })
        .then(function (map) {
          reply(map ? { ok: true, map: map }
                    : { ok: false, error: '没探测到工时字段：云效里至少要有一个工作项' });
        }, function (e) {
          warn(e);
          const m = (e && e.message) || String(e);
          reply({ ok: false, error: m === 'YXWT_NOT_LOGGED_IN' ? '未登录云效或登录已过期' : m });
        });
    }
  };

  NS.__chromeShim = {
    storage: {
      local: local,
      onChanged: {
        addListener: function (fn) {
          if (typeof fn === 'function') listeners.push(fn);
        },
        removeListener: function (fn) {
          const i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        }
      }
    },
    runtime: runtime,
    tabs: tabs
  };
})();
