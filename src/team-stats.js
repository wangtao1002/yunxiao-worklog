/**
 * YXWT.teamStats —— 自定义小组的成员工时、小组总工时与排名。
 * 只汇总传入的小组成员；工作项和成员名单由调用方按同一区间准备。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  function idOf(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function toHours(value) {
    const n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function bySelectedHours(a, b, field) {
    if (b[field] !== a[field]) return b[field] - a[field];
    if (b.count !== a.count) return b.count - a.count;
    return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
  }

  /**
   * @param groups [{id, name, memberIds}]
   * @param members 本次实际请求的成员名单 [{id, name}]
   * @param rows stats.normalize() 生成的工作项
   * @param options {basis:'est'|'act', memberErrors:[{id,name,error}], truncated:boolean}
   *
   * 未加载成功的成员、未请求的成员和截断结果不能作为 0 工时参加正式排名。
   * 同一成员可以属于多个组，各组分别累计；调用方不应把各组总量相加成组织总量。
   */
  function aggregate(groups, members, rows, options) {
    const opts = options || {};
    const field = opts.basis === 'act' ? 'act' : 'est';
    const roster = Object.create(null);
    (Array.isArray(members) ? members : []).forEach(function (member) {
      const id = idOf(member && member.id);
      if (!id) return;
      roster[id] = { id: id, name: idOf(member.name) || id };
    });

    const totals = Object.create(null);
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      const id = idOf(row && row.assigneeId);
      if (!id || !roster[id]) return;
      if (!totals[id]) totals[id] = { count: 0, est: 0, act: 0 };
      totals[id].count += 1;
      totals[id].est += toHours(row.est);
      totals[id].act += toHours(row.act);
    });

    const failures = Object.create(null);
    let unknownFailure = false;
    (Array.isArray(opts.memberErrors) ? opts.memberErrors : []).forEach(function (failure) {
      const error = idOf(failure && failure.error) || '加载失败';
      const id = idOf(failure && failure.id);
      if (id) {
        failures[id] = error;
        return;
      }
      // 兼容旧快照只有姓名的错误项。同名时全部标记不完整，不能误判为 0 工时。
      const name = idOf(failure && failure.name);
      const matched = Object.keys(roster).filter(function (memberId) {
        return roster[memberId].name === name;
      });
      if (!matched.length) unknownFailure = true;
      matched.forEach(function (memberId) { failures[memberId] = error; });
    });

    const truncated = opts.truncated === true;
    const result = (Array.isArray(groups) ? groups : []).map(function (group) {
      const ids = [];
      const seen = Object.create(null);
      (Array.isArray(group && group.memberIds) ? group.memberIds : []).forEach(function (rawId) {
        const id = idOf(rawId);
        if (!id || seen[id]) return;
        seen[id] = true;
        ids.push(id);
      });
      const people = ids.map(function (id) {
        const found = roster[id];
        const sum = totals[id] || { count: 0, est: 0, act: 0 };
        const error = failures[id] || (!found ? '成员未参与本次查询' : '');
        return {
          id: id,
          name: found ? found.name : id,
          count: sum.count,
          est: round2(sum.est),
          act: round2(sum.act),
          complete: !error && !truncated && !unknownFailure,
          error: error
        };
      });
      people.sort(function (a, b) { return bySelectedHours(a, b, field); });
      const failedMemberIds = people.filter(function (member) {
        return !!member.error;
      }).map(function (member) { return member.id; });
      const est = round2(people.reduce(function (total, member) { return total + member.est; }, 0));
      const act = round2(people.reduce(function (total, member) { return total + member.act; }, 0));
      return {
        id: idOf(group && group.id),
        name: idOf(group && group.name),
        memberIds: ids,
        members: people,
        count: people.reduce(function (total, member) { return total + member.count; }, 0),
        est: est,
        act: act,
        complete: ids.length > 0 && failedMemberIds.length === 0 && !truncated && !unknownFailure,
        rank: null,
        failedMemberIds: failedMemberIds
      };
    });

    result.sort(function (a, b) {
      if (a.complete !== b.complete) return a.complete ? -1 : 1;
      return bySelectedHours(a, b, field);
    });
    let rankableCount = 0;
    let previousHours = null;
    let currentRank = 0;
    result.forEach(function (group) {
      if (!group.complete) return;
      rankableCount += 1;
      const value = group[field];
      if (previousHours === null || value !== previousHours) currentRank = rankableCount;
      group.rank = currentRank;
      previousHours = value;
    });
    return {
      groups: result,
      rankableCount: rankableCount,
      incompleteCount: result.length - rankableCount
    };
  }

  NS.teamStats = { aggregate: aggregate };
})();
