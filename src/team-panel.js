/**
 * YXWT.teamPanel —— 独立的小组工时统计模块。
 * 只查询用户自定义小组中的成员；没有小组时不发工时统计请求。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});
  const U = NS.util;
  const HOST_ID = 'yxwt-team-host';
  const CSS = [
    '.tmt-mask.yx-hide{display:none !important;}',
    '.tmt-panel{max-width:1200px;}',
    '.tmt-logo{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;',
    '  background:var(--yx-accent);color:var(--yx-on-accent);font-weight:700;}',
    '.tmt-org{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    '  padding:3px 9px;border-radius:20px;background:var(--yx-surface-2);color:var(--yx-text-dim);font-size:12px;}',
    '.tmt-filter{display:flex;flex-direction:column;gap:9px;padding:12px 16px;',
    '  background:var(--yx-surface);border-bottom:1px solid var(--yx-border);}',
    '.tmt-filter .yx-row{gap:7px;}',
    '.tmt-date{width:140px;}',
    '.tmt-layout{display:grid;grid-template-columns:290px minmax(0,1fr);gap:14px;align-items:start;}',
    '.tmt-side,.tmt-report{min-width:0;}',
    '.tmt-side{display:flex;flex-direction:column;gap:10px;}',
    '.tmt-sidehead,.tmt-reporthead{display:flex;align-items:center;gap:8px;justify-content:space-between;}',
    '.tmt-sidehead h2,.tmt-reporthead h2{font-size:14px;margin:0;}',
    '.tmt-groupitem{display:flex;align-items:center;gap:6px;padding:8px 0;',
    '  border-bottom:1px solid var(--yx-border);}',
    '.tmt-groupitem:last-child{border-bottom:0;}',
    '.tmt-groupname{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.tmt-sidehint{font-size:11px;color:var(--yx-text-dim);line-height:1.5;}',
    '.tmt-editor{display:flex;flex-direction:column;gap:9px;border-color:var(--yx-accent);}',
    '.tmt-editor h3{margin:0;font-size:13px;}',
    '.tmt-editor .yx-input{width:100%;}',
    '.tmt-people{max-height:230px;overflow:auto;border:1px solid var(--yx-border);',
    '  border-radius:8px;padding:3px 7px;}',
    '.tmt-person{display:flex;align-items:center;gap:7px;min-height:30px;padding:3px;',
    '  border-bottom:1px solid var(--yx-border);}',
    '.tmt-person:last-child{border-bottom:0;}',
    '.tmt-person label{min-width:0;display:flex;align-items:center;gap:7px;cursor:pointer;}',
    '.tmt-person span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.tmt-manual{display:grid;grid-template-columns:1fr 1fr;gap:6px;}',
    '.tmt-manual button{grid-column:1/-1;}',
    '.tmt-score{display:flex;flex-direction:column;gap:11px;}',
    '.tmt-scorecard{background:var(--yx-surface);border:1px solid var(--yx-border);',
    '  border-radius:10px;overflow:hidden;}',
    '.tmt-scoretop{display:grid;grid-template-columns:40px minmax(0,1fr) auto auto;',
    '  gap:10px;align-items:center;width:100%;padding:12px 14px;border:0;',
    '  background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}',
    '.tmt-scoretop:hover{background:var(--yx-surface-2);}',
    '.tmt-scoretop:focus-visible{outline:2px solid var(--yx-accent);outline-offset:-2px;}',
    '.tmt-scoretitle{display:block;}',
    '.tmt-reportactions{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap;}',
    '.tmt-expand{color:var(--yx-accent);font-size:12px;white-space:nowrap;}',
    '.tmt-rank{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;',
    '  color:var(--yx-accent);background:var(--yx-accent-soft);font-weight:700;}',
    '.tmt-rank.is-incomplete{color:var(--yx-warn);background:var(--yx-surface-2);}',
    '.tmt-scoretitle{font-weight:650;font-size:14px;}',
    '.tmt-metrics{display:flex;gap:14px;flex-wrap:wrap;justify-content:flex-end;font-size:12px;}',
    '.tmt-metrics strong{font-size:17px;color:var(--yx-text);font-variant-numeric:tabular-nums;}',
    '.tmt-metrics .is-main strong{color:var(--yx-accent);}',
    '.tmt-members{border-top:1px solid var(--yx-border);padding:3px 14px 8px;}',
    '.tmt-member{display:grid;grid-template-columns:minmax(0,1fr) 90px 90px 62px;',
    '  gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--yx-border);font-size:12px;}',
    '.tmt-member:last-child{border-bottom:0;}',
    '.tmt-member > :not(:first-child){text-align:right;font-variant-numeric:tabular-nums;}',
    '.tmt-member.is-head{color:var(--yx-text-dim);font-size:11px;}',
    '.tmt-member.is-failed{color:var(--yx-warn);}',
    '.tmt-note{font-size:12px;color:var(--yx-text-dim);line-height:1.55;}',
    '.tmt-alert{padding:9px 11px;border-radius:8px;background:var(--yx-surface-2);',
    '  color:var(--yx-warn);font-size:12px;}',
    '.tmt-empty{padding:44px 20px;text-align:center;display:flex;flex-direction:column;',
    '  align-items:center;gap:10px;color:var(--yx-text-dim);}',
    '.tmt-empty strong{font-size:16px;color:var(--yx-text);}',
    '.tmt-footmsg{font-size:12px;color:var(--yx-text-dim);}',
    '@media(max-width:820px){.tmt-layout{grid-template-columns:1fr;}.tmt-scoretop{grid-template-columns:40px minmax(0,1fr) auto;}',
    '  .tmt-metrics{grid-column:2;justify-content:flex-start;}.tmt-expand{grid-column:3;grid-row:1/3;}',
    '  .tmt-member{grid-template-columns:minmax(0,1fr) 70px 70px 45px;}}'
  ].join('\n');

  const state = {
    mounted: false,
    open: false,
    loading: false,
    importing: false,
    ctx: null,
    prefs: {},
    groups: [],
    expandedGroupIds: Object.create(null),
    contacts: {},
    rangeKey: '',
    start: '',
    end: '',
    dateBasis: 'planEnd',
    basis: 'est',
    scope: null,
    snapshot: null,
    error: '',
    rangeError: '',
    progress: null,
    editingId: null,
    editName: '',
    editIds: [],
    saving: false,
    memberSearch: '',
    initSeq: 0,
    reqSeq: 0,
    scrollLock: null
  };
  const refs = {};

  function el(tag, cls, value) {
    return NS.ui.h(tag, { class: cls || '', text: value == null ? '' : String(value) });
  }

  function add(parent) {
    for (let i = 1; i < arguments.length; i++) {
      if (arguments[i]) parent.appendChild(arguments[i]);
    }
    return parent;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function button(label, click, cls) {
    const b = el('button', 'yx-btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.onclick = click;
    return b;
  }

  function input(type, value, placeholder, cls) {
    const node = el('input', 'yx-input' + (cls ? ' ' + cls : ''));
    node.type = type;
    node.value = value || '';
    if (placeholder) node.placeholder = placeholder;
    return node;
  }

  function note(message, cls) {
    return el('div', cls || 'tmt-note', message);
  }

  function toast(message, type) {
    NS.ui.toast(refs.root, message, type || 'info');
  }

  function errorText(error) {
    const value = error && error.message ? String(error.message) : String(error || '未知错误');
    return value === 'YXWT_NOT_LOGGED_IN' ? '未登录云效或登录已过期' : value;
  }

  function hours(value) {
    return U.fmtHours(Number(value) || 0) + 'h';
  }

  function lockScroll() {
    const html = document.documentElement;
    const body = document.body;
    state.scrollLock = { html: html ? html.style.overflow : '', body: body ? body.style.overflow : '' };
    if (html) html.style.overflow = 'hidden';
    if (body) body.style.overflow = 'hidden';
  }

  function unlockScroll() {
    if (!state.scrollLock) return;
    if (document.documentElement) document.documentElement.style.overflow = state.scrollLock.html;
    if (document.body) document.body.style.overflow = state.scrollLock.body;
    state.scrollLock = null;
  }

  function ensureMounted() {
    if (state.mounted) return;
    const mounted = NS.ui.mount(HOST_ID);
    refs.root = mounted.root;
    refs.host = mounted.host;
    const style = document.createElement('style');
    style.textContent = CSS;
    refs.root.appendChild(style);
    const mask = el('div', 'yx-mask tmt-mask yx-hide');
    mask.onclick = function (event) { if (event.target === mask) close(); };
    const panel = el('div', 'yx-panel tmt-panel');
    const head = el('div', 'yx-head');
    refs.org = el('span', 'tmt-org', '正在识别组织…');
    add(head,
      el('span', 'tmt-logo', 'H'),
      el('h1', 'yx-title', '小组工时统计'),
      refs.org,
      el('span', 'yx-grow'),
      button('返回总览', backToOverview, 'is-ghost'),
      button('关闭', close, 'is-ghost')
    );
    refs.filters = el('div', 'tmt-filter');
    refs.body = el('div', 'yx-body');
    const foot = el('div', 'yx-foot');
    refs.foot = el('span', 'tmt-footmsg', '自定义小组只保存在本机当前浏览器。');
    add(foot, refs.foot);
    add(panel, head, refs.filters, refs.body, foot);
    add(mask, panel);
    refs.root.appendChild(mask);
    refs.mask = mask;
    refs.keydown = function (event) {
      if (!state.open || (event.key !== 'Escape' && event.key !== 'Esc')) return;
      if (refs.root.querySelector('.yx-dlgmask')) return;
      event.stopPropagation();
      close();
    };
    document.addEventListener('keydown', refs.keydown, true);
    state.mounted = true;
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    state.reqSeq++;
    state.initSeq++;
    state.saving = false;
    state.importing = false;
    refs.mask.classList.add('yx-hide');
    unlockScroll();
  }

  function showOrgChanged() {
    state.reqSeq++;
    state.initSeq++;
    state.loading = false;
    state.saving = false;
    state.importing = false;
    state.ctx = null;
    state.groups = [];
    state.contacts = {};
    state.scope = null;
    state.snapshot = null;
    state.editingId = null;
    state.error = '云效组织已切换，请重新打开小组统计以读取当前组织的小组。';
    refs.org.textContent = '组织已切换';
    render();
  }

  async function ensureCurrentOrg(orgId, token) {
    const current = await NS.detect.context(true);
    if (!state.open || token !== state.initSeq) return false;
    if (current && current.stale) throw new Error('当前组织身份暂不可验证，请稍后重试。');
    if (String((current && current.orgId) || '') === String(orgId || '')) return true;
    showOrgChanged();
    return false;
  }

  function backToOverview() {
    close();
    NS.panel.open();
  }

  function selectedIds() {
    const seen = Object.create(null);
    const ids = [];
    state.groups.forEach(function (group) {
      (group.memberIds || []).forEach(function (id) {
        const key = String(id || '');
        if (!key || seen[key]) return;
        seen[key] = true;
        ids.push(key);
      });
    });
    return ids.sort();
  }

  function selectedKey() {
    return JSON.stringify(selectedIds());
  }

  function applyRangePreset(key) {
    const preset = U.rangePresets().filter(function (item) { return item.key === key; })[0];
    if (!preset) return;
    state.rangeKey = key;
    state.start = preset.start;
    state.end = preset.end;
    state.rangeError = '';
    renderFilters();
    load(true);
  }

  function onCustomDate(start, end) {
    state.start = start;
    state.end = end;
    state.rangeKey = 'custom';
    if (!start || !end || start > end) {
      state.reqSeq++;
      state.loading = false;
      state.scope = null;
      state.snapshot = null;
      state.progress = null;
      state.rangeError = !start || !end ? '请选择完整的开始和结束日期。' : '开始日期不能晚于结束日期。';
      renderFilters();
      renderReport();
      renderFoot();
      return;
    }
    state.rangeError = '';
    renderFilters();
    load(true);
  }

  function renderFilters() {
    if (!refs.filters) return;
    const box = clear(refs.filters);
    const row1 = el('div', 'yx-row');
    add(row1, el('span', 'yx-label', '时间范围'));
    const presets = el('div', 'yx-seg');
    U.rangePresets().forEach(function (preset) {
      const b = el('button', state.rangeKey === preset.key ? 'is-on' : '', preset.label);
      b.type = 'button';
      b.onclick = function () { applyRangePreset(preset.key); };
      add(presets, b);
    });
    const start = input('date', state.start, '', 'tmt-date');
    const end = input('date', state.end, '', 'tmt-date');
    start.setAttribute('aria-label', '开始日期');
    end.setAttribute('aria-label', '结束日期');
    start.onchange = function () { onCustomDate(start.value, end.value); };
    end.onchange = function () { onCustomDate(start.value, end.value); };
    add(row1, presets, start, el('span', 'yx-label', '至'), end);

    const row2 = el('div', 'yx-row');
    add(row2, el('span', 'yx-label', '任务归集日期'));
    const dateBasis = el('select', 'yx-select');
    [
      ['planEnd', '计划完成时间'],
      ['finishTime', '实际完成时间'],
      ['planStart', '计划开始时间']
    ].forEach(function (pair) {
      const option = el('option', '', pair[1]);
      option.value = pair[0];
      add(dateBasis, option);
    });
    dateBasis.value = state.dateBasis;
    dateBasis.onchange = function () {
      state.dateBasis = dateBasis.value;
      load(true);
    };
    add(row2, dateBasis, el('span', 'yx-label', '排名按'));
    const basis = el('select', 'yx-select');
    [['est', '预计工时'], ['act', '实际工时']].forEach(function (pair) {
      const option = el('option', '', pair[1]);
      option.value = pair[0];
      add(basis, option);
    });
    basis.value = state.basis;
    basis.onchange = function () {
      state.basis = basis.value;
      renderReport();
    };
    const refresh = button('刷新这个区间', function () { load(false); });
    refresh.disabled = !state.groups.length || !selectedIds().length || state.loading ||
      !state.start || !state.end || !!state.rangeError;
    add(row2, basis, refresh);
    if (state.rangeError) add(row2, note(state.rangeError, 'tmt-alert'));
    add(box, row1, row2);
  }

  function render() {
    renderFilters();
    const body = clear(refs.body);
    const layout = el('div', 'tmt-layout');
    refs.side = el('div', 'tmt-side');
    refs.report = el('div', 'tmt-report');
    add(layout, refs.side, refs.report);
    add(body, layout);
    renderSide();
    renderReport();
    renderFoot();
  }

  function renderSide() {
    const side = clear(refs.side);
    const list = el('div', 'yx-card');
    const head = el('div', 'tmt-sidehead');
    add(head, el('h2', '', '我的小组'), button('＋ 新建', function () { startEdit(null); }, 'is-primary is-sm'));
    add(list, head);
    if (!state.groups.length) add(list, note('尚未创建小组。创建后才会查询成员工时。'));
    state.groups.forEach(function (group) {
      const item = el('div', 'tmt-groupitem');
      const name = el('span', 'tmt-groupname', group.name);
      name.title = group.name;
      add(item,
        name,
        el('span', 'yx-grow'),
        el('span', 'yx-sub', group.memberIds.length + ' 人'),
        button('编辑', function () { startEdit(group); }, 'is-sm'),
        button('删除', function () { deleteGroup(group); }, 'is-ghost is-sm')
      );
      add(list, item);
    });
    add(side, list);
    if (state.editingId !== null) renderEditor();
    add(side, note('成员可加入多个组；每组独立统计，组间有重叠时不要把各组总工时相加。', 'tmt-sidehint'));
  }

  function startEdit(group) {
    if (state.saving) return;
    state.editingId = group ? group.id : '';
    state.editName = group ? group.name : '';
    state.editIds = group ? group.memberIds.slice() : [];
    state.memberSearch = '';
    renderSide();
    if (refs.editNameInput) refs.editNameInput.focus();
  }

  function cancelEdit() {
    if (state.saving) return;
    state.editingId = null;
    state.editIds = [];
    renderSide();
  }

  function renderEditor() {
    const editor = el('div', 'yx-card tmt-editor');
    add(editor, el('h3', '', state.editingId ? '编辑小组' : '新建小组'));
    const name = input('text', state.editName, '小组名称，如研发一组');
    name.maxLength = 60;
    name.setAttribute('aria-label', '小组名称');
    name.oninput = function () { state.editName = name.value; };
    refs.editNameInput = name;
    add(editor, name);

    const search = input('search', state.memberSearch, '搜索姓名或成员 ID');
    search.setAttribute('aria-label', '搜索小组成员');
    add(editor, search);
    const list = el('div', 'tmt-people');
    const candidates = Object.create(null);
    Object.keys(state.contacts || {}).forEach(function (id) {
      candidates[id] = (state.contacts[id] && state.contacts[id].name) || id;
    });
    if (state.ctx && state.ctx.userId) candidates[String(state.ctx.userId)] = (state.ctx.name || '我') + '（我）';
    state.editIds.forEach(function (id) { if (!candidates[id]) candidates[id] = id; });
    const entries = [];
    Object.keys(candidates).sort(function (a, b) {
      return candidates[a].localeCompare(candidates[b], 'zh-Hans-CN');
    }).forEach(function (id) {
      const row = el('div', 'tmt-person');
      const label = el('label', '');
      const checkbox = el('input', '');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('aria-label', '选择' + candidates[id]);
      checkbox.checked = state.editIds.indexOf(id) >= 0;
      checkbox.onchange = function () {
        const index = state.editIds.indexOf(id);
        if (checkbox.checked && index < 0) state.editIds.push(id);
        if (!checkbox.checked && index >= 0) state.editIds.splice(index, 1);
        if (refs.editCount) refs.editCount.textContent = '已选 ' + state.editIds.length + ' 人';
      };
      add(label, checkbox, el('span', '', candidates[id]));
      label.title = id;
      add(row, label);
      add(list, row);
      entries.push({ node: row, text: (candidates[id] + ' ' + id).toLowerCase() });
    });
    if (!entries.length) add(list, note('通讯录为空。可从当前视图导入同事，或手动填写成员 ID。'));
    const noMatch = note('没有匹配的成员');
    noMatch.classList.add('yx-hide');
    add(list, noMatch);
    search.oninput = function () {
      state.memberSearch = search.value;
      const key = search.value.trim().toLowerCase();
      let shown = 0;
      entries.forEach(function (entry) {
        const visible = !key || entry.text.includes(key);
        entry.node.classList.toggle('yx-hide', !visible);
        if (visible) shown++;
      });
      noMatch.classList.toggle('yx-hide', !key || shown > 0);
      list.scrollTop = 0;
    };
    search.oninput();
    add(editor, list);
    refs.editCount = note('已选 ' + state.editIds.length + ' 人');
    add(editor, refs.editCount);
    const importBtn = button(state.importing ? '正在扫描视图…' : '从当前视图导入同事', importMembers, 'is-sm');
    importBtn.disabled = state.importing;
    importBtn.title = '扫描当前项目或视图最多 600 条工作项的负责人，不包含没有任务的成员';
    add(editor, importBtn);

    const manual = el('div', 'tmt-manual');
    const manualId = input('text', '', '成员 ID');
    const manualName = input('text', '', '姓名（可选）');
    manualId.maxLength = 128;
    manualName.maxLength = 80;
    add(manual, manualId, manualName, button('按成员 ID 添加', async function () {
      const token = state.initSeq;
      const orgId = state.ctx && state.ctx.orgId;
      const id = manualId.value.trim();
      if (!id || id.length > 128 || /\s|[\u0000-\u001f\u007f]/.test(id) ||
        id === '__proto__' || id === 'constructor' || id === 'prototype') {
        toast('请输入有效的成员 ID（不含空格或控制字符）。', 'error');
        return;
      }
      const displayName = manualName.value.trim() || id;
      try {
        if (!await ensureCurrentOrg(orgId, token)) return;
        await NS.store.addContacts(orgId, { identifier: id, displayName: displayName });
        const contacts = await NS.store.getContacts(orgId);
        if (!state.open || token !== state.initSeq) return;
        state.contacts = contacts;
        if (state.editIds.indexOf(id) < 0) state.editIds.push(id);
        renderSide();
      } catch (error) {
        if (state.open && token === state.initSeq) toast('添加成员失败：' + errorText(error), 'error');
      }
    }, 'is-sm'));
    add(editor, manual);
    const actions = el('div', 'yx-row');
    const save = button(state.saving ? '正在保存…' : '保存小组', saveGroup, 'is-primary');
    save.disabled = state.saving;
    add(actions, save, button('取消', cancelEdit, 'is-ghost'));
    add(editor, actions);
    add(refs.side, editor);
  }

  async function importMembers() {
    if (state.importing || !state.ctx) return;
    const token = state.initSeq;
    const ctx = state.ctx;
    state.importing = true;
    renderSide();
    try {
      if (!await ensureCurrentOrg(ctx.orgId, token)) return;
      const result = await NS.memberSource.importCurrentView(ctx);
      const contacts = await NS.store.getContacts(ctx.orgId);
      if (!state.open || token !== state.initSeq) return;
      state.contacts = contacts;
      renderSide();
      if (!result.totalCount) toast('当前视图没有扫到负责人', 'info');
      else if (!result.colleagueCount) toast('当前视图只有自己的工作项，请切换项目列表或其他视图。', 'info');
      else toast('导入 ' + result.colleagueCount + ' 位同事' +
        (result.truncated ? '；只扫描了前 600 条工作项' : ''), 'success');
    } catch (error) {
      if (state.open && token === state.initSeq) toast('导入失败：' + errorText(error), 'error');
    } finally {
      if (state.open && token === state.initSeq) {
        state.importing = false;
        renderSide();
      }
    }
  }

  async function saveGroup() {
    if (state.saving) return;
    const token = state.initSeq;
    const orgId = state.ctx && state.ctx.orgId;
    const name = state.editName.trim().replace(/\s+/g, ' ');
    if (!name) { toast('请填写小组名称。', 'error'); return; }
    if (!state.editIds.length) { toast('请至少选择一位成员。', 'error'); return; }
    if (state.groups.some(function (group) {
      return group.name === name && group.id !== state.editingId;
    })) { toast('已有同名小组，请换一个名称。', 'error'); return; }
    const before = selectedKey();
    const next = state.groups.map(function (group) {
      return group.id === state.editingId
        ? { id: group.id, name: name, memberIds: state.editIds.slice() }
        : group;
    });
    if (!state.editingId) {
      const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      next.push({ id: id, name: name, memberIds: state.editIds.slice() });
    }
    state.saving = true;
    renderSide();
    try {
      if (!await ensureCurrentOrg(orgId, token)) return;
      const groups = await NS.store.setGroups(orgId, next);
      if (!state.open || token !== state.initSeq) return;
      state.groups = groups;
      state.editingId = null;
      state.editIds = [];
      if (selectedKey() !== before) {
        state.scope = null;
        state.snapshot = null;
        state.error = '';
        render();
        load(true);
      } else {
        render();
      }
      toast('小组已保存', 'success');
    } catch (error) {
      if (state.open && token === state.initSeq) toast('保存小组失败：' + errorText(error), 'error');
    } finally {
      if (state.open && token === state.initSeq) {
        state.saving = false;
        renderSide();
      }
    }
  }

  async function deleteGroup(group) {
    if (state.saving) return;
    const token = state.initSeq;
    const orgId = state.ctx && state.ctx.orgId;
    const confirmed = await NS.ui.confirmDialog(refs.root, {
      title: '删除小组',
      body: '确定删除「' + group.name + '」吗？只会删除本地小组配置。',
      okText: '删除',
      danger: true
    });
    if (!confirmed || !state.open || token !== state.initSeq) return;
    const before = selectedKey();
    try {
      if (!await ensureCurrentOrg(orgId, token)) return;
      const groups = await NS.store.setGroups(orgId, state.groups.filter(function (item) {
        return item.id !== group.id;
      }));
      if (!state.open || token !== state.initSeq) return;
      state.groups = groups;
      if (state.editingId === group.id) state.editingId = null;
      if (selectedKey() !== before) {
        state.reqSeq++;
        state.scope = null;
        state.snapshot = null;
        state.error = '';
      }
      render();
      if (state.groups.length && selectedIds().length && selectedKey() !== before) load(true);
    } catch (error) {
      if (state.open && token === state.initSeq) toast('删除失败：' + errorText(error), 'error');
    }
  }

  function renderFoot() {
    if (!refs.foot) return;
    if (state.loading && state.progress) {
      refs.foot.textContent = '正在查询 ' + state.progress.done + '/' + state.progress.total +
        ' 位成员，已取 ' + state.progress.loaded + ' 条工作项…';
    } else if (state.rangeError) {
      refs.foot.textContent = '日期范围无效，未查询工时。';
    } else if (state.snapshot) {
      refs.foot.textContent = '本地快照：' + new Date(state.snapshot.savedAt).toLocaleString() +
        ' · 小组配置仅保存在本机当前浏览器';
    } else {
      refs.foot.textContent = '小组配置仅保存在本机当前浏览器；没有自定义小组时不查询工时。';
    }
  }

  function renderReport() {
    if (!refs.report) return;
    const report = clear(refs.report);
    const header = el('div', 'tmt-reporthead');
    const actions = el('div', 'tmt-reportactions');
    add(actions, el('span', 'yx-sub', state.start && state.end
      ? state.start + ' 至 ' + state.end : ''));
    add(header, el('h2', '', '小组排名'), actions);
    add(report, header);
    if (state.error && !state.ctx) {
      const failure = el('div', 'yx-card tmt-empty');
      add(failure, el('strong', '', '无法读取当前组织'), note(state.error),
        button('重试', function () { close(); open(); }, 'is-primary'));
      add(report, failure);
      return;
    }
    if (!state.groups.length) {
      const empty = el('div', 'yx-card tmt-empty');
      add(empty,
        el('strong', '', '还没有自定义小组'),
        note('新建小组并选入成员后，才会查询这些人的工时并生成排名。'),
        button('新建第一个小组', function () { startEdit(null); }, 'is-primary')
      );
      add(report, empty);
      return;
    }
    if (!selectedIds().length) {
      add(report, el('div', 'yx-card tmt-empty', '请先给小组添加成员。'));
      return;
    }
    if (state.rangeError) {
      add(report, el('div', 'yx-card tmt-empty', state.rangeError));
      return;
    }
    if (state.loading && !state.snapshot) {
      const loading = el('div', 'yx-card tmt-empty');
      add(loading, el('strong', '', '正在查询小组成员工时…'), note('每位成员分别查询，人数较多时需要一些时间。'));
      add(report, loading);
      return;
    }
    if (state.error) {
      const failure = el('div', 'yx-card tmt-empty');
      add(failure, el('strong', '', '统计未完成'), note(state.error), button('重新查询', function () {
        load(false);
      }, 'is-primary'));
      add(report, failure);
      return;
    }
    if (!state.snapshot || !state.scope) {
      add(report, el('div', 'yx-card tmt-empty', '等待加载工时数据…'));
      return;
    }
    const selectedField = state.basis === 'act' ? 'actual' : 'estimated';
    const fieldMissing = !state.scope.fieldMap || !state.scope.fieldMap[selectedField] ||
      !state.scope.fieldMap[selectedField].id;
    const rows = NS.stats.filterByTaskScope(state.snapshot.rows,
      state.prefs.taskScope === 'completed' ? 'completed' : 'all');
    const summary = NS.teamStats.aggregate(state.groups, state.scope.members, rows, {
      basis: state.basis,
      memberErrors: state.snapshot.memberErrors,
      truncated: state.snapshot.truncated || fieldMissing
    });
    add(report, note('按任务的' + ({ planEnd: '计划完成时间', finishTime: '实际完成时间', planStart: '计划开始时间' }[state.dateBasis]) +
      '归集整条预计/实际工时；这不是按每日工时登记记录统计。' +
      (state.prefs.taskScope === 'completed' ? '当前仅统计已完成任务。' : '当前统计全部任务。')));
    if (state.dateBasis === 'finishTime') add(report, note('实际完成口径先按计划完成时间扩展前后各 ' +
      NS.rangeData.FINISH_PAD_DAYS + ' 天查询，再按完成时间过滤；区间外任务可能遗漏。', 'tmt-alert'));
    if (state.scope.fieldWarn) add(report, note(state.scope.fieldWarn, 'tmt-alert'));
    if (fieldMissing) add(report, note('排名使用的工时字段未识别，暂不提供正式排名。', 'tmt-alert'));
    if (summary.incompleteCount) {
      add(report, note(summary.incompleteCount + ' 个小组数据不完整（成员加载失败、未查询、字段缺失或结果截断），暂不参与正式排名。', 'tmt-alert'));
    }
    const list = el('div', 'tmt-score');
    const scoreCards = [];
    function setExpanded(view, expanded) {
      view.people.hidden = !expanded;
      view.toggle.setAttribute('aria-expanded', String(expanded));
      view.hint.textContent = expanded ? '收起成员 ▲' : '展开成员 ▼';
      if (expanded) state.expandedGroupIds[view.id] = true;
      else delete state.expandedGroupIds[view.id];
    }
    add(actions,
      button('全部展开', function () {
        scoreCards.forEach(function (view) { setExpanded(view, true); });
      }),
      button('全部收起', function () {
        scoreCards.forEach(function (view) { setExpanded(view, false); });
      })
    );
    summary.groups.forEach(function (group, index) {
      const card = el('div', 'tmt-scorecard');
      const top = el('button', 'tmt-scoretop');
      top.type = 'button';
      const rank = el('span', 'tmt-rank' + (group.complete ? '' : ' is-incomplete'),
        group.complete ? String(group.rank) : '—');
      const name = el('span', '');
      add(name, el('span', 'tmt-scoretitle', group.name),
        el('span', 'yx-sub', group.members.length + ' 人 · ' + group.count + ' 条任务' +
          (group.complete ? '' : ' · 数据不完整')));
      const metrics = el('span', 'tmt-metrics');
      add(metrics,
        metric('预计', group.est, state.basis === 'est'),
        metric('实际', group.act, state.basis === 'act')
      );
      const hint = el('span', 'tmt-expand');
      add(top, rank, name, metrics, hint);
      add(card, top);
      const people = el('div', 'tmt-members');
      people.id = HOST_ID + '-members-' + index;
      top.setAttribute('aria-controls', people.id);
      const view = { id: group.id, toggle: top, hint: hint, people: people };
      setExpanded(view, !!state.expandedGroupIds[group.id]);
      top.onclick = function () { setExpanded(view, people.hidden); };
      scoreCards.push(view);
      const columns = el('div', 'tmt-member is-head');
      add(columns,
        el('span', '', '成员'),
        el('span', '', '预计工时'),
        el('span', '', '实际工时'),
        el('span', '', '任务')
      );
      add(people, columns);
      group.members.forEach(function (member) {
        const row = el('div', 'tmt-member' + (member.complete ? '' : ' is-failed'));
        const label = el('span', '', member.name + (member.error ? '（加载失败）' : ''));
        label.title = member.error || member.id;
        add(row,
          label,
          el('span', '', member.error ? '—' : hours(member.est)),
          el('span', '', member.error ? '—' : hours(member.act)),
          el('span', '', member.error ? '—' : member.count)
        );
        add(people, row);
      });
      add(card, people);
      add(list, card);
    });
    add(report, list);
  }

  function metric(label, value, main) {
    const box = el('span', main ? 'is-main' : '');
    add(box, el('span', 'yx-sub', label + ' '), el('strong', '', hours(value)));
    return box;
  }

  async function load(preferCache) {
    const seq = ++state.reqSeq;
    const token = state.initSeq;
    const ids = selectedIds();
    if (!state.groups.length || !ids.length || !state.ctx || !state.ctx.orgId) {
      state.loading = false;
      state.scope = null;
      state.snapshot = null;
      state.error = '';
      renderReport();
      renderFoot();
      return;
    }
    if (state.rangeError || !state.start || !state.end || state.start > state.end) return;
    state.loading = true;
    state.progress = null;
    state.error = '';
    state.scope = null;
    state.snapshot = null;
    renderFilters();
    renderReport();
    renderFoot();
    try {
      if (!await ensureCurrentOrg(state.ctx.orgId, token)) return;
      if (seq !== state.reqSeq) return;
      const selfId = String(state.ctx.userId || '');
      const orgId = String(state.ctx.orgId);
      const scope = await NS.rangeData.resolve(state.prefs, {
        includeSelf: ids.indexOf(selfId) >= 0,
        memberIds: ids.filter(function (id) { return id !== selfId; })
      });
      if (seq !== state.reqSeq || !state.open) return;
      if (scope.ctx && scope.ctx.stale) throw new Error('当前组织身份暂不可验证，请稍后重试。');
      if (String((scope.ctx && scope.ctx.orgId) || '') !== orgId) {
        showOrgChanged();
        return;
      }
      const query = {
        start: state.start,
        end: state.end,
        dateBasis: state.dateBasis,
        excludeCancelled: state.prefs.excludeCancelled !== false
      };
      let snapshot = preferCache ? await NS.rangeData.readSnapshot(scope, query) : null;
      if (seq !== state.reqSeq || !state.open) return;
      if (!snapshot) {
        snapshot = await NS.rangeData.fetchSnapshot(scope, Object.assign({}, query, {
          onProgress: function (progress) {
            if (seq !== state.reqSeq || !state.open) return;
            state.progress = progress;
            renderFoot();
          }
        }));
      }
      if (seq !== state.reqSeq || !state.open) return;
      state.scope = scope;
      state.snapshot = snapshot;
    } catch (error) {
      if (seq !== state.reqSeq || !state.open) return;
      state.error = errorText(error);
    } finally {
      if (seq === state.reqSeq && state.open) {
        state.loading = false;
        state.progress = null;
        renderFilters();
        renderReport();
        renderFoot();
      }
    }
  }

  async function open() {
    ensureMounted();
    if (state.open) return;
    const initSeq = ++state.initSeq;
    const previousOrgId = String((state.ctx && state.ctx.orgId) || '');
    state.open = true;
    refs.mask.classList.remove('yx-hide');
    lockScroll();
    state.error = '';
    state.scope = null;
    state.snapshot = null;
    state.ctx = null;
    state.groups = [];
    state.expandedGroupIds = Object.create(null);
    state.contacts = {};
    state.editingId = null;
    state.editIds = [];
    state.saving = false;
    state.importing = false;
    refs.org.textContent = '正在识别组织…';
    render();
    try {
      const config = await NS.store.get();
      const ctx = await NS.detect.context(true);
      if (!state.open || initSeq !== state.initSeq) return;
      if (!ctx || !ctx.orgId) throw new Error('无法识别当前组织');
      if (ctx.stale) throw new Error('当前组织身份暂不可验证，请稍后重试。');
      const orgChanged = previousOrgId !== String(ctx.orgId);
      const groups = await NS.store.getGroups(ctx.orgId);
      const contacts = await NS.store.getContacts(ctx.orgId);
      const current = await NS.detect.context(true);
      if (!state.open || initSeq !== state.initSeq) return;
      if (current && current.stale) throw new Error('当前组织身份暂不可验证，请稍后重试。');
      if (String((current && current.orgId) || '') !== String(ctx.orgId)) {
        showOrgChanged();
        return;
      }
      state.ctx = current;
      state.prefs = config.prefs || {};
      state.groups = groups;
      state.contacts = contacts;
      refs.org.textContent = current.orgName || current.orgId;
      NS.ui.setTheme(refs.host, state.prefs.theme);
      if (!state.rangeKey || orgChanged) {
        const preset = U.rangePresets().filter(function (item) {
          return item.key === state.prefs.defaultRange;
        })[0] || U.rangePresets()[2];
        state.rangeKey = preset.key;
        state.start = preset.start;
        state.end = preset.end;
        state.dateBasis = state.prefs.dateBasis || 'planEnd';
        state.basis = state.prefs.hoursBasis === 'actual' ? 'act' : 'est';
      }
      state.editingId = null;
      render();
      if (state.groups.length && selectedIds().length) load(true);
    } catch (error) {
      if (!state.open || initSeq !== state.initSeq) return;
      state.error = errorText(error);
      state.ctx = null;
      state.groups = [];
      render();
      toast(state.error, 'error');
    }
  }

  NS.teamPanel = { open: open, close: close, isOpen: function () { return state.open; } };
})();
