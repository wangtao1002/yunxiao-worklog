/**
 * 离线预览用的假数据。结构严格照抄 docs/API-RESEARCH.md 2.1 的真实工作项 JSON，
 * 字段 id 故意用 900xxx / 7x 这种「非本组织」的值，顺便反证代码不依赖固定 id。
 */
(function () {
  const EST = '900123';
  const ACT = '900124';
  const PS = '71';
  const PE = '72';

  const PROJECTS = [
    ['p1', '示例省机关'], ['p2', '示例国际学校'], ['p3', '腾云标准版'],
    ['p4', '示例饮品集团'], ['p5', '日常售后处理'], ['p6', '示例医科大学附属医院项目'],
    ['p7', '示例运营商-机关食堂']
  ];
  const PEOPLE = [
    ['u-me', '陈默'], ['u-2', '李维'], ['u-3', '周舟']
  ];
  const STATUSES = [
    ['已完成', '正常结束', 4, true],
    ['开发完成', '开发阶段', 11, false],
    ['待处理', '确认阶段', 1, false],
    ['测试中', '测试阶段', 12, false],
    ['已取消', '正常结束', 4, false]
  ];
  const TITLES = [
    '移动端增加订餐备注和「剩余次数」展示', '小程序扫码下单流程简化',
    '1.20.12 升级至 1.20.16', 'H5 余额页去掉最低余额限制',
    '后台反馈模块支持权限控制', '结算流程中账户余额不足的交互优化',
    '移动端适配：管理页新增支付方式开关', '标准版接入积分商城 - 移动端前端',
    '新增「申请后支付」结算方式', '订单详情：优惠字段展示口径调整'
  ];

  // 固定种子的伪随机，保证每次预览数据一致，方便对照
  let seed = 20260822;
  function rnd() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }

  function makeItem(i, opts) {
    const o = opts || {};
    const [pid, pname] = o.project || pick(PROJECTS);
    const [uid, uname] = o.person || pick(PEOPLE);
    const [sname, stage, stageId, done] = o.status || pick(STATUSES);
    const day = o.day !== undefined ? o.day : Math.floor(rnd() * 7);
    const base = new Date(2026, 7, 17);            // 2026-08-17，周一
    const due = new Date(base.getFullYear(), base.getMonth(), base.getDate() + day);
    const est = o.est !== undefined ? o.est : [0, 0.5, 1, 1, 2, 2, 3, 4, 6][Math.floor(rnd() * 9)];
    const act = o.act !== undefined ? o.act : (rnd() > 0.75 ? est : 0);

    const cf = [
      { fieldIdentifier: PE, fieldFormat: 'input', fieldClassName: 'date', value: ymd(due) + ' 00:00:00' },
      { fieldIdentifier: PS, fieldFormat: 'input', fieldClassName: 'date', value: ymd(base) + ' 00:00:00' }
    ];
    // 云效里没值的字段是整条缺失，不是 value:null —— 预览数据也照这个来
    if (est) cf.push({ fieldIdentifier: EST, fieldFormat: 'input', fieldClassName: 'float', value: String(est) });
    if (act) cf.push({ fieldIdentifier: ACT, fieldFormat: 'input', fieldClassName: 'float', value: String(act) });

    return {
      identifier: 'wi' + i,
      serialNumber: ['HZFS', 'SRXC', 'TZJY', 'MVCX', 'QCGY'][i % 5] + '-' + (100 + i),
      subject: TITLES[i % TITLES.length],
      gmtCreate: base.getTime(),
      finishTime: done ? due.getTime() - (rnd() > 0.6 ? -86400000 : 0) : null,
      categoryIdentifier: i % 9 === 0 ? 'Bug' : 'Task',
      category: { identifier: i % 9 === 0 ? 'Bug' : 'Task', name: i % 9 === 0 ? '缺陷' : '任务' },
      status: { identifier: 's' + stageId, name: sname, stageId: stageId },
      statusStage: { id: stageId, name: stage },
      spaceIdentifier: pid,
      space: { identifier: pid, name: pname, type: 'Project' },
      assignedTo: { identifier: uid, realName: uname, displayName: uname, avatar: '' },
      creator: { identifier: 'u-9', realName: '孙岚', displayName: '孙岚' },
      customFields: cf
    };
  }

  function build(mode) {
    if (mode === 'empty') return [];
    if (mode === 'single') {
      return [0, 1, 2, 3].map((i) => makeItem(i, { day: 2, project: PROJECTS[0], person: PEOPLE[0] }));
    }
    if (mode === 'huge') {
      const out = [];
      for (let i = 0; i < 400; i++) out.push(makeItem(i));
      return out;
    }
    const out = [];
    for (let i = 0; i < 40; i++) out.push(makeItem(i));
    return out;
  }

  const CONTEXT = {
    userId: 'u-me', name: '陈默', avatar: '',
    orgId: 'preview-org', orgName: '（离线预览）示例科技有限公司'
  };

  const FIELD_MAP = {
    estimated: { id: EST, name: '预计工时' },
    actual: { id: ACT, name: '实际工时' },
    planStart: { id: PS, name: '计划开始时间' },
    planEnd: { id: PE, name: '计划完成时间' },
    lowConfidence: false, detectedAt: Date.now(), manual: false
  };

  window.YXWT_FIXTURES = {
    context: function (mode) {
      if (mode === 'error') return Promise.reject(new Error('YXWT_NOT_LOGGED_IN'));
      return Promise.resolve(CONTEXT);
    },
    fieldMap: function (mode) {
      if (mode === 'nofields') return Promise.resolve(null);
      if (mode === 'error') return Promise.reject(new Error('网络请求失败：Failed to fetch'));
      return Promise.resolve(FIELD_MAP);
    },
    listWorkitems: function (mode, opts) {
      if (mode === 'error') return Promise.reject(new Error('云效接口 500：系统异常'));
      seed = 20260822;                                  // 每次重建都用同一颗种子
      const items = build(mode);
      // 团队模式下按 spaceIdentifier（也就是被查的那个人）过滤，模拟真实权限行为
      const who = opts && opts.spaceIdentifier;
      const mine = who && who !== 'u-me'
        ? items.filter(function (it) { return it.assignedTo.identifier === who; })
        : items;
      if (opts && typeof opts.onProgress === 'function') opts.onProgress(mine.length, mine.length);
      return Promise.resolve({ items: mine, total: mine.length, truncated: false });
    },
    fieldValues: function () {
      return [{ fieldIdentifier: ACT, fieldClassName: 'float', value: '0' }];
    },
    view: function () {
      return {
        identifier: 'preview', name: '（离线预览）每日任务',
        spaceType: 'User', spaceIdentifier: 'u-me', scope: 'personal',
        filter: JSON.stringify([[
          { field: { className: 'user', format: 'list', identifier: 'assignedTo' },
            fieldIdentifier: 'assignedTo', operator: 'CONTAINS',
            value: [{ label: '陈默', value: 'u-me' }] }
        ]]),
        columns: '["subject","status","' + EST + '"]'
      };
    }
  };
})();
