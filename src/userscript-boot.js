/**
 * userscript-boot.js —— 油猴版专属入口，只被 tools/build-userscript.py 打进 .user.js。
 *
 * 补上扩展版里由 background.js + options.html 提供的两件事：
 *   1. 工具栏图标点击 -> 油猴的脚本菜单命令
 *   2. 独立设置页    -> 页面内一个全屏 iframe
 *
 * 设置页为什么用 iframe 而不是 Shadow DOM：options.html 的样式大量用了 :root / html / body
 * 这类根级选择器，塞进 Shadow DOM 得逐条改写 CSS，改错一处就是错位。srcdoc 的 iframe 与
 * 父页面同源，document 是真的、CSS 一个字都不用动，还顺带把云效页面的样式完全隔离在外。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});
  const HOST_ID = 'yxwt-options-host';

  function warn(e) {
    try {
      console.warn('[云效工时统计]', e);
    } catch (ignored) {
      // 控制台不可用时静默
    }
  }

  function closeOptions() {
    const host = document.getElementById(HOST_ID);
    if (host && host.parentNode) host.parentNode.removeChild(host);
    document.removeEventListener('keydown', onEsc, true);
  }

  function onEsc(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation();
      closeOptions();
    }
  }

  function openOptions() {
    if (document.getElementById(HOST_ID)) return;      // 已经开着就不再叠一层

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483001',
      'background:rgba(10,15,25,.46)', 'display:flex',
      'align-items:center', 'justify-content:center', 'padding:24px'
    ].join(';');
    host.addEventListener('click', function (e) {
      if (e.target === host) closeOptions();
    });

    const box = document.createElement('div');
    box.style.cssText = [
      'position:relative', 'width:min(96vw,1080px)', 'height:min(92vh,900px)',
      'border-radius:16px', 'overflow:hidden', 'background:#fff',
      'box-shadow:0 24px 70px rgba(8,14,26,.42)'
    ].join(';');

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '✕';
    close.title = '关闭设置（Esc）';
    close.style.cssText = [
      'position:absolute', 'top:10px', 'right:12px', 'z-index:2',
      'width:30px', 'height:30px', 'border-radius:8px', 'cursor:pointer',
      'border:1px solid rgba(127,127,127,.35)', 'background:rgba(255,255,255,.86)',
      'color:#333', 'font-size:15px', 'line-height:1'
    ].join(';');
    close.addEventListener('click', closeOptions);

    const frame = document.createElement('iframe');
    frame.style.cssText = 'width:100%;height:100%;border:0;display:block;background:transparent;';
    // srcdoc 才能保持同源：src=blob: 在部分浏览器里会被当成不同源，拿不到 contentDocument
    frame.srcdoc = NS.__optionsHtml || '<p>设置页未打包进来</p>';

    frame.addEventListener('load', function () {
      try {
        const win = frame.contentWindow;
        const doc = frame.contentDocument;
        if (!win || !doc) throw new Error('设置页 iframe 取不到文档');

        // 把父页面的运行时递进去：iframe 里没有油猴的 GM_*，全靠这两个引用
        win.YXWT = NS;
        win.chrome = NS.__chromeShim;

        // 设置页里点「打开云效」之类的链接要开新标签，别把设置页自己顶掉
        Array.prototype.forEach.call(doc.querySelectorAll('a[href]'), function (a) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        });

        if (typeof NS.__optionsApp === 'function') NS.__optionsApp(win, doc);
      } catch (e) {
        warn(e);
      }
    });

    box.appendChild(frame);
    box.appendChild(close);
    host.appendChild(box);
    (document.body || document.documentElement).appendChild(host);
    document.addEventListener('keydown', onEsc, true);
  }

  NS.__openOptions = openOptions;

  // 扩展版点工具栏图标 = 开面板。油猴没有图标，挂到脚本菜单上（油猴图标 -> 脚本名下面）
  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('打开统计面板（Alt+H）', function () {
        try {
          if (NS.panel && typeof NS.panel.toggle === 'function') {
            const r = NS.panel.toggle();
            if (r && typeof r.catch === 'function') r.catch(warn);
          }
        } catch (e) {
          warn(e);
        }
      });
      GM_registerMenuCommand('设置', openOptions);
    }
  } catch (e) {
    warn(e);
  }
})();
