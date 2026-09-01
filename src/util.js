/**
 * YXWT.util —— 纯工具函数，无网络、无 chrome API、无业务逻辑。
 * 依赖只能向后：本文件是加载链的第一个，不得依赖任何其他 YXWT 模块。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  // daysBetween 的安全阀：再大的区间也只吐 400 天，防止 UI 渲染卡死
  const MAX_DAYS = 400;

  const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})/;

  function pad2(n) {
    const v = Math.abs(Math.trunc(Number(n) || 0));
    return v < 10 ? '0' + v : String(v);
  }

  /**
   * 统一转成 'YYYY-MM-DD'。
   * 接受 Date / 毫秒时间戳 / 'YYYY-MM-DD[ HH:mm:ss]' 字符串。
   * 空值或非法值返回 null（云效的 finishTime 可能是 null，调用方直接透传）。
   */
  function toYMD(dateOrTs) {
    if (dateOrTs === null || dateOrTs === undefined || dateOrTs === '') return null;
    let d = null;
    if (dateOrTs instanceof Date) {
      d = dateOrTs;
    } else if (typeof dateOrTs === 'number') {
      d = new Date(dateOrTs);
    } else {
      const s = String(dateOrTs).trim();
      if (YMD_RE.test(s)) return s.slice(0, 10);
      if (/^\d+$/.test(s)) d = new Date(Number(s));
      else d = new Date(s);
    }
    if (!d || isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** 'YYYY-MM-DD' -> 本地时间当天 00:00:00 的 Date；非法返回 null */
  function parseYMD(ymd) {
    if (ymd instanceof Date) return isNaN(ymd.getTime()) ? null : new Date(ymd.getFullYear(), ymd.getMonth(), ymd.getDate());
    if (!ymd) return null;
    const m = YMD_RE.exec(String(ymd).trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  /** 工时展示：整数不带小数点，最多一位小数（0 -> '0'，25.55 -> '25.6'） */
  function fmtHours(n) {
    const v = Number(n);
    if (!isFinite(v) || v === 0) return '0';
    let s = v.toFixed(1);
    if (s.slice(-2) === '.0') s = s.slice(0, -2);
    if (s === '-0') s = '0';
    return s;
  }

  /** 云效 BETWEEN 条件用的时间串 */
  function fmtDateTimeForApi(ymd, endOfDay) {
    const day = toYMD(ymd);
    if (!day) return null;
    return day + (endOfDay ? ' 23:59:59' : ' 00:00:00');
  }

  function addDays(date, n) {
    const base = date instanceof Date ? date : parseYMD(date);
    if (!base) return null;
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + (Number(n) || 0));
    return d;
  }

  /** 周一为一周之始：getDay()===0 的周日要回退 6 天算上一周 */
  function weekStart(date) {
    const base = date instanceof Date ? date : parseYMD(date);
    if (!base) return null;
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const dow = d.getDay();
    const back = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - back);
    return d;
  }

  /** 含首尾的日期序列，最多 MAX_DAYS 天（超出直接截断） */
  function daysBetween(startYMD, endYMD) {
    const s = parseYMD(startYMD);
    const e = parseYMD(endYMD);
    if (!s || !e || e.getTime() < s.getTime()) return [];
    const out = [];
    const cur = new Date(s.getTime());
    while (cur.getTime() <= e.getTime() && out.length < MAX_DAYS) {
      out.push(toYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  function isWeekend(ymd) {
    const d = parseYMD(ymd);
    if (!d) return false;
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  }

  function monthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function monthEnd(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /** 时间范围预设，start/end 一律是 'YYYY-MM-DD' 字符串 */
  function rangePresets(today) {
    const now = today instanceof Date ? today : (today ? parseYMD(today) : new Date());
    const base = now && !isNaN(now.getTime()) ? now : new Date();
    const t = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const y = addDays(t, -1);
    const ws = weekStart(t);
    const lws = addDays(ws, -7);
    const lm = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    return [
      { key: 'today', label: '今天', start: toYMD(t), end: toYMD(t) },
      { key: 'yesterday', label: '昨天', start: toYMD(y), end: toYMD(y) },
      { key: 'thisWeek', label: '本周', start: toYMD(ws), end: toYMD(addDays(ws, 6)) },
      { key: 'lastWeek', label: '上周', start: toYMD(lws), end: toYMD(addDays(lws, 6)) },
      { key: 'thisMonth', label: '本月', start: toYMD(monthStart(t)), end: toYMD(monthEnd(t)) },
      { key: 'lastMonth', label: '上月', start: toYMD(monthStart(lm)), end: toYMD(monthEnd(lm)) },
      { key: 'last7', label: '近7天', start: toYMD(addDays(t, -6)), end: toYMD(t) },
      { key: 'last30', label: '近30天', start: toYMD(addDays(t, -29)), end: toYMD(t) }
    ];
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    const wait = Number(ms) || 0;
    let timer = null;
    function wrapped() {
      const args = arguments;
      const self = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(self, args);
      }, wait);
    }
    wrapped.cancel = function () {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    return wrapped;
  }

  /**
   * 并发受限的 map：同一时刻最多 limit 个在飞，结果按原下标回填。
   * 单项 reject 不影响整体，该位置放 {__error: message}。
   */
  function pmap(arr, fn, limit) {
    const list = Array.isArray(arr) ? arr.slice() : Array.prototype.slice.call(arr || []);
    const size = list.length;
    const max = Math.max(1, Math.min(Number(limit) || 4, size || 1));
    const out = new Array(size);
    if (size === 0) return Promise.resolve(out);

    let next = 0;
    let done = 0;

    return new Promise(function (resolve) {
      function runOne() {
        if (next >= size) return;
        const i = next++;
        let p;
        try {
          p = Promise.resolve(fn(list[i], i));
        } catch (e) {
          p = Promise.reject(e);
        }
        p.then(
          function (v) { out[i] = v; },
          function (err) { out[i] = { __error: (err && err.message) || String(err) }; }
        ).then(function () {
          done++;
          if (done === size) resolve(out);
          else runOne();
        });
      }
      for (let k = 0; k < max; k++) runOne();
    });
  }

  /** Blob 下载，url 用完必须释放 */
  function downloadText(filename, text, mime) {
    const type = mime || 'text/plain;charset=utf-8';
    const blob = new Blob([text === null || text === undefined ? '' : String(text)], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download.txt';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    // 立刻 revoke 在部分 Chrome 版本会打断下载，延后一拍再释放
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** 优先用异步剪贴板 API，被权限或非安全上下文挡住时降级到 execCommand */
  function copyText(text) {
    const s = text === null || text === undefined ? '' : String(text);
    let p;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        p = navigator.clipboard.writeText(s).then(function () { return true; });
      } else {
        p = Promise.reject(new Error('no clipboard api'));
      }
    } catch (e) {
      p = Promise.reject(e);
    }
    return p.catch(function () { return fallbackCopy(s); });
  }

  function fallbackCopy(s) {
    let ok = false;
    let ta = null;
    try {
      ta = document.createElement('textarea');
      ta.value = s;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, s.length);
      ok = document.execCommand('copy') === true;
    } catch (e) {
      ok = false;
    } finally {
      if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
    }
    return ok;
  }

  NS.util = {
    MAX_DAYS: MAX_DAYS,
    pad2: pad2,
    toYMD: toYMD,
    parseYMD: parseYMD,
    fmtHours: fmtHours,
    fmtDateTimeForApi: fmtDateTimeForApi,
    weekStart: weekStart,
    addDays: addDays,
    daysBetween: daysBetween,
    isWeekend: isWeekend,
    rangePresets: rangePresets,
    escapeHtml: escapeHtml,
    debounce: debounce,
    pmap: pmap,
    downloadText: downloadText,
    copyText: copyText
  };
})();
