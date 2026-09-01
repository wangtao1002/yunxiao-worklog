/**
 * 设置页逻辑（SPEC 第 11 节）
 *
 * 注意：options 页是 chrome-extension:// 源，向云效发请求会被 SameSite 拦掉 cookie，
 * 所以这里绝不直接调云效接口。需要接口的操作（重新探测工时字段）一律转发给
 * 云效标签页里的 content script 执行，本页只读写 chrome.storage。
 */
(function () {
  'use strict';

  const store = window.YXWT && window.YXWT.store;

  const YX_PREFIX = 'https://devops.aliyun.com/';
  const YX_MATCH = 'https://devops.aliyun.com/*';

  const BASIS_OPTIONS = [
    ['planEnd', '计划完成时间'],
    ['finishTime', '实际完成时间'],
    ['planStart', '计划开始时间']
  ];
  const RANGE_OPTIONS = [
    ['today', '今天'],
    ['yesterday', '昨天'],
    ['thisWeek', '本周'],
    ['lastWeek', '上周'],
    ['thisMonth', '本月'],
    ['lastMonth', '上月'],
    ['last7', '近 7 天'],
    ['last30', '近 30 天']
  ];
  const THEME_OPTIONS = [
    ['auto', '跟随系统'],
    ['light', '亮色'],
    ['dark', '暗色']
  ];
  const FIELD_ROWS = [
    { key: 'estimated', label: '预计工时', hint: '数值字段 float' },
    { key: 'actual', label: '实际工时', hint: '数值字段 float' },
    { key: 'planStart', label: '计划开始时间', hint: '日期字段 date' },
    { key: 'planEnd', label: '计划完成时间', hint: '日期字段 date' }
  ];

  // 渲染快照：用来判断外部（面板/内容脚本）改动是否需要重绘，避免打断正在输入的用户
  const state = { cfg: null, fieldMapSig: '', contactsSig: '' };

  // ---------- 基础工具 ----------

  function $(id) {
    return document.getElementById(id);
  }

  // 极简 createElement：只用 textContent，绝不拼 innerHTML
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        const v = props[k];
        if (v === null || v === undefined || v === false) {
          return;
        }
        if (k === 'class') {
          node.className = String(v);
        } else if (k === 'text') {
          node.textContent = String(v);
        } else if (k.indexOf('on') === 0 && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else {
          node.setAttribute(k, String(v));
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) {
        return;
      }
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function fillSelect(sel, options) {
    sel.textContent = '';
    options.forEach(function (pair) {
      sel.appendChild(el('option', { value: pair[0], text: pair[1] }));
    });
  }

  let toastTimer = 0;

  function toast(msg, type) {
    const box = $('toast');
    if (!box) {
      return;
    }
    box.textContent = msg;
    box.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      box.className = 'toast';
    }, 2200);
  }

  function errText(e) {
    return (e && e.message) ? e.message : '未知错误';
  }

  /**
   * 致命错误：挂横幅，并把整个设置表单锁死。
   * 只挂横幅是不够的——表单看着一切正常但一个 change 监听都没绑，用户把「写入模式」
   * 点成「允许写回云效」会以为切换成功了，实际 prefs 从没写进去（反之亦然，更危险）。
   */
  function fatal(msg) {
    const box = $('fatal');
    box.textContent = msg + ' 请到 chrome://extensions 重新加载本插件后再试；在此之前下面的设置不会被保存。';
    box.hidden = false;
    disableForm();
  }

  function disableForm() {
    const scopes = ['general'];
    scopes.forEach(function (id) {
      const root = document.getElementById(id);
      if (!root) {
        return;
      }
      root.classList.add('is-disabled');
      const nodes = root.querySelectorAll('input,select,textarea,button');
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].disabled = true;
      }
    });
    ['btn-redetect', 'btn-clear'].forEach(function (id) {
      const b = document.getElementById(id);
      if (b) {
        b.disabled = true;
      }
    });
  }

  // ---------- 确认弹窗 ----------

  function confirmDialog(opts) {
    const o = opts || {};
    const mask = $('mask');
    const ok = $('m-ok');
    const cancel = $('m-cancel');

    $('m-title').textContent = o.title || '确认操作';
    $('m-body').textContent = o.body || '';
    ok.textContent = o.okText || '确定';
    cancel.textContent = o.cancelText || '取消';
    ok.className = 'btn ' + (o.danger ? 'danger' : 'primary');
    mask.hidden = false;
    // 破坏性操作（清除映射 / 清除全部本地数据）的初始焦点必须落在「取消」上：
    // 焦点预置在红色按钮上时，顺手一个回车或空格就把通讯录和手动字段映射删干净了，
    // 而且没有撤销。与 src/ui.js 的 confirmDialog 保持一致。
    const prevActive = document.activeElement;
    const initial = o.danger ? cancel : ok;
    try { initial.focus(); } catch (e) { /* 忽略 */ }

    return new Promise(function (resolve) {
      let settled = false;
      const finish = function (val) {
        if (settled) {
          return;
        }
        settled = true;
        mask.hidden = true;
        ok.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        mask.removeEventListener('mousedown', onMask);
        document.removeEventListener('keydown', onKey, true);
        // 焦点还给触发弹窗的那个按钮，键盘用户不会掉到页面开头
        if (prevActive && typeof prevActive.focus === 'function') {
          try { prevActive.focus(); } catch (e) { /* 忽略 */ }
        }
        resolve(val);
      };
      const onOk = function () { finish(true); };
      const onCancel = function () { finish(false); };
      const onMask = function (ev) { if (ev.target === mask) { finish(false); } };
      const onKey = function (ev) {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          finish(false);
          return;
        }
        // 焦点圈：Tab 只在「取消 / 确定」之间转，跑不到弹窗背后仍可点击的表单控件上
        if (ev.key === 'Tab') {
          const list = [cancel, ok];
          let idx = list.indexOf(document.activeElement);
          if (idx < 0) { idx = 0; }
          idx = ev.shiftKey ? idx - 1 : idx + 1;
          if (idx < 0) { idx = list.length - 1; }
          if (idx >= list.length) { idx = 0; }
          ev.preventDefault();
          try { list[idx].focus(); } catch (e) { /* 忽略 */ }
        }
      };
      ok.addEventListener('click', onOk);
      cancel.addEventListener('click', onCancel);
      mask.addEventListener('mousedown', onMask);
      document.addEventListener('keydown', onKey, true);
    });
  }

  // ---------- 常规设置 ----------

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function savePrefs(patch) {
    return store.setPrefs(patch).then(function (cfg) {
      state.cfg = cfg;
      toast('已保存', 'success');
      return cfg;
    }, function (e) {
      toast('保存失败：' + errText(e), 'error');
      return null;
    });
  }

  function setWriteMode(dryRun) {
    const radios = document.querySelectorAll('input[name="writeMode"]');
    Array.prototype.forEach.call(radios, function (r) {
      r.checked = (r.value === 'live') ? !dryRun : !!dryRun;
    });
    $('live-warn').hidden = !!dryRun;
  }

  function fillGeneral(cfg) {
    const p = cfg.prefs;
    $('dailyTargetHours').value = String(p.dailyTargetHours);
    $('dateBasis').value = p.dateBasis;
    $('defaultRange').value = p.defaultRange;
    $('theme').value = p.theme;
    $('excludeCancelled').checked = !!p.excludeCancelled;
    $('warnMissingEst').checked = p.warnMissingEst !== false;
    $('showSummaryBar').checked = !!p.showSummaryBar;
    setWriteMode(p.dryRun !== false);
  }

  function bindGeneral() {
    $('dailyTargetHours').addEventListener('change', function () {
      let v = parseFloat(this.value);
      if (!isFinite(v) || v < 0) {
        v = 0;
      }
      if (v > 24) {
        v = 24;
      }
      v = Math.round(v * 100) / 100;
      this.value = String(v);
      savePrefs({ dailyTargetHours: v });
    });

    $('dateBasis').addEventListener('change', function () {
      savePrefs({ dateBasis: this.value });
    });
    $('defaultRange').addEventListener('change', function () {
      savePrefs({ defaultRange: this.value });
    });
    $('theme').addEventListener('change', function () {
      applyTheme(this.value);
      savePrefs({ theme: this.value });
    });
    $('excludeCancelled').addEventListener('change', function () {
      savePrefs({ excludeCancelled: this.checked });
    });
    $('warnMissingEst').addEventListener('change', function () {
      savePrefs({ warnMissingEst: this.checked });
    });
    $('showSummaryBar').addEventListener('change', function () {
      savePrefs({ showSummaryBar: this.checked });
    });

    const radios = document.querySelectorAll('input[name="writeMode"]');
    Array.prototype.forEach.call(radios, function (r) {
      r.addEventListener('change', function () {
        if (!this.checked) {
          return;
        }
        const dryRun = this.value !== 'live';
        $('live-warn').hidden = dryRun;
        savePrefs({ dryRun: dryRun });
      });
    });
  }

  // ---------- 工时字段映射 ----------

  function fmtTime(ts) {
    if (typeof ts !== 'number' || !isFinite(ts) || ts <= 0) {
      return '';
    }
    const d = new Date(ts);
    const p = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function fieldMapCard(orgId, map) {
    const m = map || {};
    const inputs = {};
    const rows = FIELD_ROWS.map(function (row) {
      const cur = m[row.key] || null;
      const idIn = el('input', {
        type: 'text',
        value: cur && cur.id ? String(cur.id) : '',
        placeholder: '字段 identifier，留空表示未识别',
        spellcheck: 'false',
        class: 'mono'
      });
      const nameIn = el('input', {
        type: 'text',
        value: cur && cur.name ? String(cur.name) : '',
        placeholder: '字段名称（仅用于显示）'
      });
      inputs[row.key] = { id: idIn, name: nameIn };
      return el('div', { class: 'fm-row' }, [
        el('div', { class: 'k' }, [row.label, el('small', { text: row.hint })]),
        idIn,
        nameIn
      ]);
    });

    const badge = m.manual
      ? el('span', { class: 'tag on', text: '手动指定' })
      : el('span', { class: 'tag', text: m.lowConfidence ? '自动探测 · 低置信' : '自动探测' });

    const saveBtn = el('button', { class: 'btn primary', type: 'button', text: '保存映射' });
    const clearBtn = el('button', { class: 'btn sm', type: 'button', text: '清除' });

    saveBtn.addEventListener('click', function () {
      const next = { detectedAt: Date.now(), manual: true };
      FIELD_ROWS.forEach(function (row) {
        const id = inputs[row.key].id.value.trim();
        const nm = inputs[row.key].name.value.trim();
        next[row.key] = id ? { id: id, name: nm || row.label } : null;
      });
      // 预计 / 实际指向同一个字段是粘贴时最容易犯的错。面板两列都能编辑，
      // 真写回时会对同一个字段连写两次、后写的静默覆盖先写的，所以直接拒绝保存。
      if (next.estimated && next.actual && next.estimated.id === next.actual.id) {
        toast('「预计工时」和「实际工时」不能填同一个字段 identifier，请检查后重新保存', 'error');
        return;
      }
      saveBtn.disabled = true;
      store.setFieldMap(orgId, next).then(function () {
        return store.get();
      }).then(function (cfg) {
        state.cfg = cfg;
        state.fieldMapSig = JSON.stringify(cfg.fieldMap || {});
        saveBtn.disabled = false;
        badge.className = 'tag on';
        badge.textContent = '手动指定';
        toast('已保存', 'success');
      }, function (e) {
        saveBtn.disabled = false;
        toast('保存失败：' + errText(e), 'error');
      });
    });

    clearBtn.addEventListener('click', function () {
      confirmDialog({
        title: '清除该组织的字段映射？',
        body: '清除后需要重新探测。手动指定过的映射会阻止自动探测覆盖，改错了就用这个按钮清掉重来。',
        okText: '清除',
        danger: true
      }).then(function (ok) {
        if (!ok) {
          return null;
        }
        return store.setFieldMap(orgId, null).then(function () {
          return store.get();
        }).then(function (cfg) {
          state.cfg = cfg;
          renderFieldMaps(cfg);
          toast('已清除', 'success');
          return null;
        }, function (e) {
          toast('清除失败：' + errText(e), 'error');
          return null;
        });
      });
    });

    const detected = fmtTime(m.detectedAt);
    const head = el('div', { class: 'org-hd' }, [
      el('span', { class: 'oid mono', text: '组织 ' + orgId }),
      badge,
      detected ? el('span', { class: 'tag', text: '更新于 ' + detected }) : null,
      el('span', { class: 'sp' }, [clearBtn])
    ]);

    const foot = el('div', { class: 'fm-foot' }, [
      saveBtn,
      el('span', { class: 'note', text: '保存后标记为手动指定，自动探测不再覆盖' })
    ]);

    return el('div', { class: 'org' }, [head].concat(rows, [foot]));
  }

  function renderFieldMaps(cfg) {
    const wrap = $('fieldmaps');
    const all = cfg.fieldMap || {};
    const orgIds = Object.keys(all);
    state.fieldMapSig = JSON.stringify(all);
    wrap.textContent = '';
    if (!orgIds.length) {
      wrap.appendChild(el('div', { class: 'empty' }, [
        '还没有缓存到字段映射。打开一个云效页面用一次统计面板，或点上面的「重新探测」。'
      ]));
      return;
    }
    orgIds.forEach(function (orgId) {
      wrap.appendChild(fieldMapCard(orgId, all[orgId]));
    });
  }

  // 找出所有云效标签页；url 过滤依赖 host_permissions，拿不到就退回全量再自己筛
  function queryYunxiaoTabs() {
    return new Promise(function (resolve) {
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
        resolve([]);
        return;
      }
      const pick = function (tabs) {
        const list = (tabs || []).filter(function (t) {
          return t && typeof t.id === 'number' && t.id >= 0 &&
            typeof t.url === 'string' && t.url.indexOf(YX_PREFIX) === 0;
        });
        // 活动标签页优先，通常就是用户刚才在看的那个
        list.sort(function (a, b) {
          return (b.active ? 1 : 0) - (a.active ? 1 : 0);
        });
        return list;
      };
      const queryAll = function () {
        try {
          chrome.tabs.query({}, function (all) {
            void chrome.runtime.lastError;
            resolve(pick(all));
          });
        } catch (e) {
          resolve([]);
        }
      };
      try {
        chrome.tabs.query({ url: YX_MATCH }, function (tabs) {
          void chrome.runtime.lastError;
          const hit = pick(tabs);
          if (hit.length) {
            resolve(hit);
            return;
          }
          queryAll();
        });
      } catch (e) {
        queryAll();
      }
    });
  }

  // 只有「对面没有接收者」才算失败要换下一个标签页；
  // 「端口提前关闭」说明消息送到了但对方没回响应，按送达处理（结果走 storage 变化回来）
  function sendToTab(tabId, msg) {
    return new Promise(function (resolve, reject) {
      chrome.tabs.sendMessage(tabId, msg, function (res) {
        const err = chrome.runtime.lastError;
        if (err) {
          const text = err.message || '';
          if (/Receiving end does not exist|Could not establish connection|no tab with id/i.test(text)) {
            reject(new Error(text || '云效页面未加载插件'));
            return;
          }
          resolve(undefined);
          return;
        }
        resolve(res);
      });
    });
  }

  function redetect() {
    const btn = $('btn-redetect');
    btn.disabled = true;
    btn.textContent = '探测中…';

    const done = function () {
      btn.disabled = false;
      btn.textContent = '重新探测';
    };

    queryYunxiaoTabs().then(function (tabs) {
      if (!tabs.length) {
        toast('请先打开一个云效页面（devops.aliyun.com）再重新探测', 'error');
        done();
        return;
      }
      // 逐个试：老标签页可能还没注入 content script
      const tryNext = function (i, lastErr) {
        if (i >= tabs.length) {
          toast('云效页面还没加载插件，请刷新那个标签页后重试' +
            (lastErr ? '（' + errText(lastErr) + '）' : ''), 'error');
          done();
          return;
        }
        sendToTab(tabs[i].id, { type: 'YXWT_REDETECT_FIELDS' }).then(function (res) {
          if (res && res.ok === false) {
            toast('探测失败：' + (res.error || '未知原因'), 'error');
          } else if (res && (res.map || res.ok === true)) {
            toast('探测完成，已更新字段映射', 'success');
          } else {
            // content script 收到了但没回响应，结果会通过 storage 变化自动刷新到本页
            toast('已通知云效页面重新探测，结果会自动刷新到这里', 'info');
          }
          done();
        }, function (e) {
          tryNext(i + 1, e);
        });
      };
      tryNext(0, null);
    }, function (e) {
      toast('重新探测失败：' + errText(e), 'error');
      done();
    });
  }

  // ---------- 通讯录 ----------

  /**
   * 通讯录头像一律用首字母占位块。
   * 云效返回的 avatar 是阿里的头像 CDN（img.alicdn.com / *.aliyuncs.com 之类），
   * 不是 devops.aliyun.com。把它塞进 <img src> 会让这个 chrome-extension:// 页面
   * 向第三方主机发请求，和 PRIVACY.md / README「所有网络请求只发往 devops.aliyun.com、
   * 不含任何远程资源」的声明冲突。avatar 只当元数据存着，不渲染。
   */
  function avatarNode(user) {
    const name = user.name || user.id || '';
    const initial = name ? name.trim().charAt(0) : '?';
    return el('span', { class: 'avatar', text: initial });
  }

  function personNode(orgId, user) {
    const del = el('button', { class: 'btn link', type: 'button', title: '从通讯录删除', text: '删除' });
    del.addEventListener('click', function () {
      del.disabled = true;
      store.removeContact(orgId, user.id).then(function () {
        return store.get();
      }).then(function (cfg) {
        state.cfg = cfg;
        renderContacts(cfg);
        toast('已删除', 'success');
      }, function (e) {
        del.disabled = false;
        toast('删除失败：' + errText(e), 'error');
      });
    });

    return el('div', { class: 'person' }, [
      avatarNode(user),
      el('div', { class: 'who' }, [
        el('div', { class: 'nm', text: user.name || '(未命名)' }),
        el('div', { class: 'uid mono', title: user.id, text: user.id })
      ]),
      del
    ]);
  }

  function renderContacts(cfg) {
    const wrap = $('contacts');
    const all = cfg.contacts || {};
    state.contactsSig = JSON.stringify(all);
    wrap.textContent = '';

    const orgIds = Object.keys(all).filter(function (orgId) {
      const book = all[orgId];
      return book && typeof book === 'object' && Object.keys(book).length > 0;
    });

    if (!orgIds.length) {
      wrap.appendChild(el('div', { class: 'empty' }, [
        '通讯录还是空的。在统计面板里点「从当前视图导入同事」就会把当前列表里的负责人存进来。'
      ]));
      return;
    }

    orgIds.forEach(function (orgId) {
      const book = all[orgId];
      const ids = Object.keys(book).sort(function (a, b) {
        const na = (book[a] && book[a].name) || '';
        const nb = (book[b] && book[b].name) || '';
        return na.localeCompare(nb, 'zh-Hans-CN');
      });
      const people = el('div', { class: 'people' }, ids.map(function (uid) {
        const u = book[uid] || {};
        return personNode(orgId, { id: String(u.id || uid), name: u.name || '', avatar: u.avatar || '' });
      }));
      wrap.appendChild(el('div', { class: 'org' }, [
        el('div', { class: 'org-hd' }, [
          el('span', { class: 'oid mono', text: '组织 ' + orgId }),
          el('span', { class: 'tag', text: ids.length + ' 人' })
        ]),
        people
      ]));
    });
  }

  // ---------- 危险区 ----------

  function clearAll() {
    confirmDialog({
      title: '清除全部本地数据？',
      body: '将删除字段映射、通讯录和所有偏好设置，且不可撤销。云效上的数据不受影响。',
      okText: '确认清除',
      danger: true
    }).then(function (ok) {
      if (!ok) {
        return null;
      }
      return store.clear().then(function () {
        return store.get();
      }).then(function (cfg) {
        state.cfg = cfg;
        applyTheme(cfg.prefs.theme);
        fillGeneral(cfg);
        renderFieldMaps(cfg);
        renderContacts(cfg);
        toast('已清除全部本地数据', 'success');
        return null;
      }, function (e) {
        toast('清除失败：' + errText(e), 'error');
        return null;
      });
    });
  }

  // ---------- 外部改动同步 ----------

  function isEditingIn(selector) {
    const host = document.querySelector(selector);
    const active = document.activeElement;
    if (!host || !active || !host.contains(active)) {
      return false;
    }
    return active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA';
  }

  function onExternalChange(cfg) {
    state.cfg = cfg;
    applyTheme(cfg.prefs.theme);
    if (!isEditingIn('#general')) {
      fillGeneral(cfg);
    }
    if (JSON.stringify(cfg.fieldMap || {}) !== state.fieldMapSig && !isEditingIn('#fieldmaps')) {
      renderFieldMaps(cfg);
    }
    if (JSON.stringify(cfg.contacts || {}) !== state.contactsSig) {
      renderContacts(cfg);
    }
  }

  // ---------- 启动 ----------

  function init() {
    let version = '';
    try {
      version = chrome.runtime.getManifest().version || '';
    } catch (e) {
      version = '';
    }
    $('ver').textContent = version ? 'v' + version : '';
    $('foot-ver').textContent = '云效工时统计' + (version ? ' v' + version : '') + ' · 数据只存在本地，无埋点无上传';

    fillSelect($('dateBasis'), BASIS_OPTIONS);
    fillSelect($('defaultRange'), RANGE_OPTIONS);
    fillSelect($('theme'), THEME_OPTIONS);

    if (!store) {
      fatal('本地存储模块加载失败，设置页无法工作。请在 chrome://extensions 里重新加载本插件。');
      return;
    }

    $('btn-redetect').addEventListener('click', redetect);
    $('btn-clear').addEventListener('click', clearAll);

    store.get().then(function (cfg) {
      state.cfg = cfg;
      applyTheme(cfg.prefs.theme);
      fillGeneral(cfg);
      bindGeneral();
      renderFieldMaps(cfg);
      renderContacts(cfg);
      store.onChange(onExternalChange);
    }, function (e) {
      fatal('读取本地设置失败：' + errText(e));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
