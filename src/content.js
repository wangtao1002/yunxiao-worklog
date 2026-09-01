/**
 * content.js —— 入口：消息通道 + 快捷键 + 合计条初始化。
 * 顶层 try/catch 兜底：本插件任何异常都只写 console.warn，绝不影响云效自身。
 */
(function () {
  'use strict';

  const HOST = 'devops.aliyun.com';
  const TOGGLE_MSG = 'YXWT_TOGGLE_PANEL';
  const REDETECT_MSG = 'YXWT_REDETECT_FIELDS';

  function warn(e) {
    try {
      console.warn('[云效工时统计]', e);
    } catch (ignored) {
      // 控制台不可用时静默
    }
  }

  function ns() {
    return window.YXWT || null;
  }

  function togglePanel() {
    const NS = ns();
    if (!NS || !NS.panel || typeof NS.panel.toggle !== 'function') {
      throw new Error('面板模块未就绪');
    }
    const r = NS.panel.toggle();
    if (r && typeof r.catch === 'function') r.catch(warn);
  }

  /** 焦点在输入类控件里时不抢快捷键；面板自己的输入框在 shadow DOM 里，要用 composedPath 取真实目标 */
  function isEditableTarget(e) {
    let node = e.target;
    if (typeof e.composedPath === 'function') {
      const path = e.composedPath();
      if (path && path.length) node = path[0];
    }
    if (!node || node.nodeType !== 1) return false;
    const tag = String(node.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') return true;
    if (node.isContentEditable) return true;
    const role = node.getAttribute ? node.getAttribute('role') : '';
    return role === 'textbox' || role === 'searchbox' || role === 'combobox';
  }

  function onKeydown(e) {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    // macOS 上 Alt+H 的 e.key 是 '˙'，所以以 e.code 为准
    const isH = e.code === 'KeyH' || e.key === 'h' || e.key === 'H' || e.key === '˙';
    if (!isH || isEditableTarget(e)) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      togglePanel();
    } catch (err) {
      warn(err);
    }
  }

  /** 设置页是 chrome-extension:// 源，调不了云效接口，重新探测只能转到这里执行 */
  function redetectFields(sendResponse) {
    const NS = ns();
    if (!NS || !NS.detect || typeof NS.detect.fieldMap !== 'function') {
      sendResponse({ ok: false, error: '探测模块未就绪，请刷新云效页面后重试' });
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
        if (map) sendResponse({ ok: true, map: map });
        else sendResponse({ ok: false, error: '没探测到工时字段：云效里至少要有一个工作项' });
      }, function (e) {
        warn(e);
        const m = (e && e.message) || String(e);
        sendResponse({ ok: false, error: m === 'YXWT_NOT_LOGGED_IN' ? '未登录云效或登录已过期' : m });
      });
  }

  function onMessage(msg, sender, sendResponse) {
    if (!msg) return undefined;                              // 不是我们的消息，不占用响应通道
    if (msg.type === REDETECT_MSG) {
      redetectFields(sendResponse);
      return true;                                           // 异步回响应，必须占住通道
    }
    if (msg.type !== TOGGLE_MSG) return undefined;
    try {
      togglePanel();
      sendResponse({ ok: true });
    } catch (e) {
      warn(e);
      sendResponse({ ok: false, error: (e && e.message) || String(e) });
    }
    return false;
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        try {
          fn();
        } catch (e) {
          warn(e);
        }
      }, { once: true });
      return;
    }
    fn();
  }

  function initSummarybar() {
    const NS = ns();
    if (!NS || !NS.summarybar || typeof NS.summarybar.init !== 'function') {
      warn('合计条模块未就绪');
      return;
    }
    const r = NS.summarybar.init();
    if (r && typeof r.catch === 'function') r.catch(warn);
  }

  try {
    if (location.hostname !== HOST) return;

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(onMessage);
    }

    document.addEventListener('keydown', onKeydown, true);

    whenReady(initSummarybar);
  } catch (e) {
    warn(e);
  }
})();
