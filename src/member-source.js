/**
 * YXWT.memberSource —— 从当前工作项视图收集负责人到本地通讯录。
 * 只能发现当前视图里有工作项的人，不能代表组织全员。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  async function currentPageQuery(ctx) {
    const project = /\/projex\/project\/([0-9a-zA-Z]+)/.exec(location.pathname || '');
    if (project) {
      return { spaceType: 'Project', spaceIdentifier: project[1], category: '', conditionGroups: [[]] };
    }
    const view = /viewIdentifier=([0-9a-zA-Z_-]+)/.exec(location.hash || '');
    if (!view) return null;
    const detail = await NS.api.getView(view[1]);
    if (!detail) return null;
    const space = NS.api.normalizeViewSpace(detail, ctx && ctx.userId);
    const query = {
      spaceType: space.spaceType,
      spaceIdentifier: space.spaceIdentifier,
      category: '',
      conditionGroups: NS.api.viewFilterToGroups(detail.filter)
    };
    if (space.scope !== undefined) query.scope = space.scope;
    return query;
  }

  async function importCurrentView(ctx) {
    const orgId = String((ctx && ctx.orgId) || '');
    if (!orgId) throw new Error('还没识别到当前组织');
    const pageRoute = (location.pathname || '') + (location.hash || '');
    const query = await currentPageQuery(ctx);
    if (!query) throw new Error('当前页面不是工作项列表页或项目页，先切到列表页再导入');
    const result = await NS.api.listWorkitems(Object.assign({ pageSize: 200, maxPages: 3 }, query));
    const current = await NS.detect.context(true);
    if ((current && current.stale) || String((current && current.orgId) || '') !== orgId ||
      pageRoute !== (location.pathname || '') + (location.hash || '')) {
      throw new Error('导入期间云效页面或组织已切换，请重新打开当前视图再导入');
    }
    const users = [];
    const seen = Object.create(null);
    (result.items || []).forEach(function (item) {
      const person = item && item.assignedTo;
      const id = person && person.identifier;
      if (!id || seen[id]) return;
      seen[id] = true;
      users.push(person);
    });
    if (users.length) await NS.store.addContacts(orgId, users);
    const selfId = String((ctx && ctx.userId) || '');
    return {
      colleagueCount: users.filter(function (person) {
        return String(person.identifier) !== selfId;
      }).length,
      totalCount: users.length,
      truncated: !!result.truncated
    };
  }

  NS.memberSource = { importCurrentView: importCurrentView };
})();
