/**
 * YXWT.panel —— 主面板：顶栏 / 筛选 / 概览卡 / 日历热力图 / 分组统计 / 明细表 / 底部工具条。
 * 依赖（均在本文件之前加载）：util、store、api、detect、stats、workcalendar、rangeData、ui。
 * 除 util 外一律在调用时才取 NS.xxx，避免某个模块加载失败时本文件在初始化阶段就炸掉。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});
  const U = NS.util;

  const HOST_ID = 'yxwt-panel';
  const MAX_RENDER_ROWS = 500;    // 明细表一次最多渲染多少行，防止 DOM 爆炸
  const GROUP_TOP = 15;

  // label 用于正文里引用口径名；optLabel 是下拉里的文案，可以更啰嗦一点
  const BASIS_OPTIONS = [
    { key: 'planEnd', label: '计划完成时间', optLabel: '计划完成时间（推荐）' },
    { key: 'finishTime', label: '实际完成时间', optLabel: '实际完成时间' },
    { key: 'planStart', label: '计划开始时间', optLabel: '计划开始时间' }
  ];

  const GROUP_TABS = [
    { key: 'project', label: '按项目' },
    { key: 'category', label: '按类别' },
    { key: 'status', label: '按状态' },
    { key: 'assignee', label: '按成员' }
  ];

  const COLUMNS = [
    { key: 'sn', label: '编号', cls: 'yxp-c-sn' },
    { key: 'subject', label: '标题', cls: 'yxp-c-subject' },
    { key: 'project', label: '项目', cls: 'yxp-c-project' },
    { key: 'status', label: '状态', cls: 'yxp-c-status' },
    { key: 'assignee', label: '负责人', cls: 'yxp-c-assignee' },
    { key: 'est', label: '预计', cls: 'yxp-c-num', editable: 'est' },
    { key: 'act', label: '实际', cls: 'yxp-c-num', editable: 'act' },
    { key: 'planEnd', label: '计划完成', cls: 'yxp-c-date' },
    { key: '__open', label: '打开', cls: 'yxp-c-open', sortable: false }
  ];

  const PANEL_CSS = [
    '.yxp-root{',
    '  --yxp-bg:#ffffff;--yxp-bg-sub:#f5f7fb;--yxp-bg-soft:#fafbfd;',
    '  --yxp-border:#e2e8f2;--yxp-border-strong:#cbd5e6;',
    '  --yxp-text:#182131;--yxp-text-dim:#5d6a7f;--yxp-text-faint:#8a97ab;',
    '  --yxp-primary:#2f6bff;--yxp-primary-weak:#eaf0ff;--yxp-primary-text:#ffffff;',
    '  --yxp-good:#0e9d68;--yxp-warn:#dd8400;--yxp-bad:#e04437;',
    '  --yxp-h0:#eef1f7;--yxp-h1:#d6e2ff;--yxp-h2:#a8c3ff;--yxp-h3:#6f9bff;--yxp-h4:#2f6bff;',
    '  --yxp-h4-text:#ffffff;--yxp-h3-text:#ffffff;',
    '  --yxp-edit:#fff6e2;--yxp-fail:#ffe9e6;',
    '  font-family:-apple-system,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;',
    '}',
    '@media (prefers-color-scheme:dark){',
    '  .yxp-root{',
    '    --yxp-bg:#161a21;--yxp-bg-sub:#1d222b;--yxp-bg-soft:#1a1f27;',
    '    --yxp-border:#2b323e;--yxp-border-strong:#3b4453;',
    '    --yxp-text:#e6ebf3;--yxp-text-dim:#9aa7bb;--yxp-text-faint:#77839a;',
    '    --yxp-primary:#5b8cff;--yxp-primary-weak:#1e2842;--yxp-primary-text:#0d1220;',
    '    --yxp-good:#3fc08c;--yxp-warn:#f0a53a;--yxp-bad:#ff6b5c;',
    '    --yxp-h0:#232833;--yxp-h1:#25355a;--yxp-h2:#2f4a86;--yxp-h3:#3b62b8;--yxp-h4:#5b8cff;',
    '    --yxp-h4-text:#0d1220;--yxp-h3-text:#eaf0ff;',
    '    --yxp-edit:#3a3018;--yxp-fail:#3d1f1c;',
    '  }',
    '}',
    // [data-theme] 显式覆盖，优先级高于系统偏好
    ':host([data-theme="light"]) .yxp-root{',
    '  --yxp-bg:#ffffff;--yxp-bg-sub:#f5f7fb;--yxp-bg-soft:#fafbfd;',
    '  --yxp-border:#e2e8f2;--yxp-border-strong:#cbd5e6;',
    '  --yxp-text:#182131;--yxp-text-dim:#5d6a7f;--yxp-text-faint:#8a97ab;',
    '  --yxp-primary:#2f6bff;--yxp-primary-weak:#eaf0ff;--yxp-primary-text:#ffffff;',
    '  --yxp-good:#0e9d68;--yxp-warn:#dd8400;--yxp-bad:#e04437;',
    '  --yxp-h0:#eef1f7;--yxp-h1:#d6e2ff;--yxp-h2:#a8c3ff;--yxp-h3:#6f9bff;--yxp-h4:#2f6bff;',
    '  --yxp-h4-text:#ffffff;--yxp-h3-text:#ffffff;',
    '  --yxp-edit:#fff6e2;--yxp-fail:#ffe9e6;',
    '}',
    ':host([data-theme="dark"]) .yxp-root{',
    '  --yxp-bg:#161a21;--yxp-bg-sub:#1d222b;--yxp-bg-soft:#1a1f27;',
    '  --yxp-border:#2b323e;--yxp-border-strong:#3b4453;',
    '  --yxp-text:#e6ebf3;--yxp-text-dim:#9aa7bb;--yxp-text-faint:#77839a;',
    '  --yxp-primary:#5b8cff;--yxp-primary-weak:#1e2842;--yxp-primary-text:#0d1220;',
    '  --yxp-good:#3fc08c;--yxp-warn:#f0a53a;--yxp-bad:#ff6b5c;',
    '  --yxp-h0:#232833;--yxp-h1:#25355a;--yxp-h2:#2f4a86;--yxp-h3:#3b62b8;--yxp-h4:#5b8cff;',
    '  --yxp-h4-text:#0d1220;--yxp-h3-text:#eaf0ff;',
    '  --yxp-edit:#3a3018;--yxp-fail:#3d1f1c;',
    '}',
    '.yxp-hidden{display:none !important;}',
    '.yxp-root *{box-sizing:border-box;}',
    '.yxp-overlay{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;',
    '  display:flex;align-items:center;justify-content:center;padding:20px;',
    '  background:rgba(10,15,25,.46);}',
    '.yxp-card{display:flex;flex-direction:column;width:96vw;max-width:1360px;max-height:92vh;',
    '  background:var(--yxp-bg);color:var(--yxp-text);border-radius:16px;overflow:hidden;',
    '  box-shadow:0 24px 70px rgba(8,14,26,.42);font-size:13px;line-height:1.5;}',
    '@media (min-width:1010px){.yxp-card{min-width:960px;}}',
    '.yxp-num{font-variant-numeric:tabular-nums;}',
    // 顶栏
    '.yxp-top{display:flex;align-items:center;gap:10px;padding:14px 18px;',
    '  border-bottom:1px solid var(--yxp-border);background:var(--yxp-bg-soft);}',
    '.yxp-logo{width:26px;height:26px;border-radius:8px;background:var(--yxp-primary);',
    '  color:var(--yxp-primary-text);display:flex;align-items:center;justify-content:center;',
    '  font-size:13px;font-weight:700;flex:none;}',
    '.yxp-title{font-size:15px;font-weight:600;letter-spacing:.2px;}',
    '.yxp-org{color:var(--yxp-text-dim);font-size:12px;padding:2px 8px;border-radius:20px;',
    '  background:var(--yxp-bg-sub);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.yxp-spacer{flex:1;}',
    '.yxp-x{width:28px;height:28px;border-radius:8px;border:1px solid transparent;',
    '  background:transparent;color:var(--yxp-text-dim);cursor:pointer;font-size:16px;line-height:1;}',
    '.yxp-x:hover{background:var(--yxp-bg-sub);color:var(--yxp-text);}',
    // 通用控件
    '.yxp-btn{border:1px solid var(--yxp-border-strong);background:var(--yxp-bg);color:var(--yxp-text);',
    '  border-radius:8px;padding:5px 11px;font-size:12px;cursor:pointer;font-family:inherit;}',
    '.yxp-btn:hover:not(:disabled){border-color:var(--yxp-primary);color:var(--yxp-primary);}',
    '.yxp-btn:disabled{opacity:.5;cursor:not-allowed;}',
    '.yxp-btn.primary{background:var(--yxp-primary);border-color:var(--yxp-primary);color:var(--yxp-primary-text);}',
    '.yxp-btn.primary:hover:not(:disabled){filter:brightness(1.06);color:var(--yxp-primary-text);}',
    '.yxp-btn.ghost{border-color:transparent;background:var(--yxp-bg-sub);}',
    '.yxp-input,.yxp-select{border:1px solid var(--yxp-border-strong);background:var(--yxp-bg);',
    '  color:var(--yxp-text);border-radius:8px;padding:5px 8px;font-size:12px;font-family:inherit;}',
    '.yxp-input:focus,.yxp-select:focus{outline:2px solid var(--yxp-primary-weak);border-color:var(--yxp-primary);}',
    // 筛选行
    '.yxp-filters{display:flex;flex-direction:column;gap:8px;padding:12px 18px;',
    '  border-bottom:1px solid var(--yxp-border);}',
    '.yxp-frow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
    '.yxp-flabel{color:var(--yxp-text-faint);font-size:12px;flex:none;}',
    '.yxp-presets{display:flex;gap:4px;flex-wrap:wrap;background:var(--yxp-bg-sub);padding:3px;border-radius:10px;}',
    '.yxp-preset{border:none;background:transparent;color:var(--yxp-text-dim);border-radius:7px;',
    '  padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;}',
    '.yxp-preset:hover{color:var(--yxp-text);}',
    '.yxp-preset.on{background:var(--yxp-bg);color:var(--yxp-primary);font-weight:600;',
    '  box-shadow:0 1px 3px rgba(20,30,50,.14);}',
    '.yxp-status{color:var(--yxp-text-dim);font-size:12px;}',
    '.yxp-note{color:var(--yxp-warn);font-size:12px;}',
    // 字段缺失 / 成员加载失败这类「数字看着正常但其实不全」的告警，要比脚注醒目
    '.yxp-warnnote,.yxp-badnote{display:flex;align-items:center;gap:8px;flex-wrap:wrap;',
    '  padding:6px 10px;border-radius:8px;line-height:1.5;}',
    '.yxp-warnnote{border:1px solid var(--yxp-warn);background:var(--yxp-edit);}',
    '.yxp-badnote{border:1px solid var(--yxp-bad);background:var(--yxp-fail);color:var(--yxp-bad);}',
    '.yxp-btn.yxp-tiny{padding:1px 8px;font-size:11px;}',
    '.yxp-inputbad{border-color:var(--yxp-bad)!important;}',
    '.yxp-hint{color:var(--yxp-text-faint);font-size:11px;}',
    '.yxp-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;',
    '  background:var(--yxp-primary-weak);color:var(--yxp-primary);font-size:12px;}',
    '.yxp-chip button{border:none;background:transparent;color:inherit;cursor:pointer;font-size:13px;padding:0;line-height:1;}',
    // 统计不含自己是个反常态，chip 换成警示色，扫一眼就知道口径变了
    '.yxp-chip-alt{background:var(--yxp-edit);color:var(--yxp-warn);}',
    '.yxp-memberbox{position:relative;}',
    '.yxp-picker{position:absolute;top:calc(100% + 6px);left:0;z-index:2147483001;width:320px;',
    '  max-height:340px;overflow:auto;background:var(--yxp-bg);border:1px solid var(--yxp-border-strong);',
    '  border-radius:12px;box-shadow:0 14px 36px rgba(8,14,26,.28);padding:10px;}',
    '.yxp-picker h4{margin:0 0 8px;font-size:12px;color:var(--yxp-text-dim);font-weight:600;}',
    '.yxp-plist{display:flex;flex-direction:column;gap:2px;max-height:260px;overflow-y:auto;overscroll-behavior:contain;}',
    '.yxp-pitem{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:8px;}',
    '.yxp-pitem:hover{background:var(--yxp-bg-sub);}',
    '.yxp-pitem label{flex:1;display:flex;align-items:center;gap:8px;cursor:pointer;min-width:0;}',
    '.yxp-pitem span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.yxp-pfoot{display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--yxp-border);}',
    // 主体
    '.yxp-body{flex:1;overflow:auto;padding:16px 18px 4px;background:var(--yxp-bg);}',
    '.yxp-sec{margin-bottom:18px;}',
    '.yxp-sechead{display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:13px;font-weight:600;}',
    '.yxp-sechead .yxp-sub{font-weight:400;color:var(--yxp-text-faint);font-size:12px;}',
    // 概览卡
    // auto-fill 会保留空轨道，让常规统计和第二行工时目标卡始终等宽对齐
    '.yxp-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;}',
    '.yxp-workcards{margin-top:10px;}',
    '@media (max-width:1080px){.yxp-cards{grid-template-columns:repeat(3,minmax(0,1fr));}}',
    '@media (max-width:640px){.yxp-cards{grid-template-columns:repeat(2,minmax(0,1fr));}}',
    '.yxp-cardbox{border:1px solid var(--yxp-border);border-radius:12px;padding:11px 12px;',
    '  background:var(--yxp-bg-soft);min-width:0;}',
    '.yxp-cardlabel{color:var(--yxp-text-faint);font-size:12px;}',
    '.yxp-cardval{font-size:22px;font-weight:650;margin-top:3px;font-variant-numeric:tabular-nums;',
    '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.yxp-cardval small{font-size:12px;font-weight:500;color:var(--yxp-text-faint);margin-left:2px;}',
    '.yxp-cardsub{color:var(--yxp-text-faint);font-size:11px;margin-top:2px;',
    '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.yxp-good{color:var(--yxp-good);}.yxp-warn{color:var(--yxp-warn);}.yxp-bad{color:var(--yxp-bad);}',
    // 可点的概览卡（目前只有「未填预计」）：是真 <button>，键盘和读屏都能用
    '.yxp-cardbtn{font-family:inherit;font-size:inherit;color:inherit;text-align:left;cursor:pointer;width:100%;}',
    '.yxp-cardbtn:hover{border-color:var(--yxp-bad);}',
    '.yxp-cardbtn.on{border-color:var(--yxp-bad);background:var(--yxp-fail);}',
    '.yxp-cardbtn:focus-visible{outline:2px solid var(--yxp-bad);outline-offset:1px;}',
    // 漏填预计工时的警示条：跟字段缺失告警同一套视觉，但带一个「只看这些」的出口
    '.yxp-missbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;}',
    // 热力图
    '.yxp-calwrap{overflow-x:auto;padding-bottom:4px;}',
    '.yxp-cal{display:grid;grid-template-columns:repeat(7,minmax(58px,1fr));gap:5px;min-width:460px;}',
    '.yxp-calhead{color:var(--yxp-text-faint);font-size:11px;text-align:center;padding-bottom:2px;}',
    '.yxp-day{border:1px solid transparent;border-radius:9px;padding:5px 6px;min-height:52px;',
    '  display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;text-align:left;',
    '  background:var(--yxp-h0);color:var(--yxp-text);font-family:inherit;font-size:11px;}',
    '.yxp-day.empty{background:transparent;cursor:default;border-color:transparent;}',
    '.yxp-day .d{color:var(--yxp-text-faint);}',
    '.yxp-day .h{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;}',
    '.yxp-day .h .yxp-unit{font-size:9px;font-weight:400;opacity:.7;margin-left:1px;}',
    '.yxp-day.lv1{background:var(--yxp-h1);}',
    '.yxp-day.lv2{background:var(--yxp-h2);}',
    '.yxp-day.lv3{background:var(--yxp-h3);color:var(--yxp-h3-text);}',
    '.yxp-day.lv3 .d{color:var(--yxp-h3-text);opacity:.75;}',
    '.yxp-day.lv4{background:var(--yxp-h4);color:var(--yxp-h4-text);}',
    '.yxp-day.lv4 .d{color:var(--yxp-h4-text);opacity:.75;}',
    '.yxp-day.weekend{opacity:.72;}',
    '.yxp-day.short{border-color:var(--yxp-warn);border-style:dashed;border-width:1.5px;}',
    '.yxp-day.on{outline:2px solid var(--yxp-primary);outline-offset:1px;}',
    '.yxp-legend{display:flex;align-items:center;gap:6px;color:var(--yxp-text-faint);font-size:11px;}',
    '.yxp-legend i{width:14px;height:14px;border-radius:4px;display:inline-block;}',
    // 分组
    '.yxp-tabs{display:flex;gap:4px;background:var(--yxp-bg-sub);padding:3px;border-radius:10px;}',
    '.yxp-tab{border:none;background:transparent;color:var(--yxp-text-dim);border-radius:7px;',
    '  padding:4px 12px;font-size:12px;cursor:pointer;font-family:inherit;}',
    '.yxp-tab.on{background:var(--yxp-bg);color:var(--yxp-primary);font-weight:600;}',
    '.yxp-bars{display:flex;flex-direction:column;gap:6px;}',
    '.yxp-bar{display:flex;align-items:center;gap:10px;}',
    '.yxp-barlabel{width:190px;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    '  color:var(--yxp-text-dim);}',
    '.yxp-bartrack{flex:1;height:16px;background:var(--yxp-bg-sub);border-radius:6px;overflow:hidden;min-width:60px;}',
    '.yxp-barfill{height:100%;background:var(--yxp-primary);border-radius:6px;min-width:2px;}',
    '.yxp-barval{width:150px;flex:none;text-align:right;color:var(--yxp-text-dim);font-size:12px;',
    '  font-variant-numeric:tabular-nums;}',
    // 明细表
    '.yxp-tbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}',
    // 有改动时要一直够得着「提交到云效」，否则 200 行滚下去就找不到了
    '.yxp-editbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 10px;',
    '  border:1px solid var(--yxp-warn);background:var(--yxp-edit);border-radius:10px;margin-bottom:8px;',
    '  position:sticky;top:0;z-index:3;}',
    // 必须给 wrap 定高：否则它自身永远不纵向溢出，th 的 sticky 偏移不触发，表头会随整页滚走
    '.yxp-tablewrap{overflow:auto;max-height:52vh;border:1px solid var(--yxp-border);border-radius:12px;}',
    '.yxp-table{border-collapse:collapse;width:100%;min-width:940px;font-size:12px;}',
    '.yxp-table th{position:sticky;top:0;z-index:1;background:var(--yxp-bg-sub);color:var(--yxp-text-dim);',
    '  font-weight:600;text-align:left;padding:8px 10px;white-space:nowrap;cursor:pointer;',
    '  border-bottom:1px solid var(--yxp-border);}',
    '.yxp-table th.nosort{cursor:default;}',
    '.yxp-table th:focus-visible{outline:2px solid var(--yxp-primary);outline-offset:-2px;}',
    '.yxp-table td{padding:6px 10px;border-bottom:1px solid var(--yxp-border);vertical-align:middle;}',
    '.yxp-table tbody tr:hover{background:var(--yxp-bg-soft);}',
    // 三种行态互斥（rowClass 只给一个 class）：失败 > 已改 > 未填预计
    '.yxp-table tbody tr.missing{background:var(--yxp-fail);box-shadow:inset 3px 0 0 var(--yxp-bad);}',
    '.yxp-table tbody tr.edited{background:var(--yxp-edit);}',
    '.yxp-table tbody tr.failed{background:var(--yxp-fail);}',
    '.yxp-c-sn{width:110px;color:var(--yxp-text-dim);font-variant-numeric:tabular-nums;}',
    '.yxp-c-subject{max-width:420px;}',
    '.yxp-c-subject div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:420px;}',
    '.yxp-c-project{width:170px;color:var(--yxp-text-dim);}',
    '.yxp-c-project div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px;}',
    '.yxp-c-status{width:96px;}',
    '.yxp-c-assignee{width:90px;color:var(--yxp-text-dim);}',
    '.yxp-c-num{width:78px;text-align:right;font-variant-numeric:tabular-nums;}',
    '.yxp-c-date{width:104px;color:var(--yxp-text-dim);font-variant-numeric:tabular-nums;}',
    '.yxp-c-open{width:56px;text-align:center;}',
    '.yxp-pill{display:inline-block;padding:1px 8px;border-radius:20px;background:var(--yxp-bg-sub);',
    '  color:var(--yxp-text-dim);font-size:11px;white-space:nowrap;}',
    '.yxp-actinput{width:66px;text-align:right;border:1px solid var(--yxp-border);background:var(--yxp-bg);',
    '  color:var(--yxp-text);border-radius:6px;padding:3px 5px;font-size:12px;font-family:inherit;',
    '  font-variant-numeric:tabular-nums;}',
    '.yxp-actinput:focus{outline:none;border-color:var(--yxp-primary);}',
    '.yxp-actinput.miss{border-color:var(--yxp-bad);color:var(--yxp-bad);font-weight:600;}',
    '.yxp-miss{color:var(--yxp-bad);font-weight:600;}',
    '.yxp-check{display:inline-flex;align-items:center;gap:5px;color:var(--yxp-text-dim);',
    '  font-size:12px;cursor:pointer;user-select:none;}',
    '.yxp-link{color:var(--yxp-primary);text-decoration:none;}',
    '.yxp-link:hover{text-decoration:underline;}',
    '.yxp-err{color:var(--yxp-bad);font-size:11px;}',
    // 状态块
    '.yxp-state{padding:46px 20px;text-align:center;color:var(--yxp-text-dim);}',
    '.yxp-state .big{font-size:15px;color:var(--yxp-text);margin-bottom:6px;font-weight:600;}',
    '.yxp-state .msg{max-width:560px;margin:0 auto 14px;word-break:break-word;}',
    '.yxp-state .acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;}',
    '.yxp-skel{border-radius:10px;background:linear-gradient(90deg,var(--yxp-bg-sub),var(--yxp-bg-soft),var(--yxp-bg-sub));',
    '  background-size:200% 100%;animation:yxp-sk 1.2s linear infinite;}',
    '@keyframes yxp-sk{0%{background-position:0 0;}100%{background-position:-200% 0;}}',
    '@media (prefers-reduced-motion:reduce){.yxp-skel{animation:none;}}',
    // 底部
    '.yxp-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 18px;',
    '  border-top:1px solid var(--yxp-border);background:var(--yxp-bg-soft);}',
    '.yxp-foot .yxp-status{margin-left:auto;}'
  ].join('\n');

  const state = {
    mounted: false,
    open: false,
    loading: false,
    booted: false,          // 是否已经成功加载过一次
    error: null,            // {message, kind:'login'|'field'|'other'}
    ctx: null,              // detect.context() 结果
    fieldMap: null,
    prefs: {},
    contacts: {},
    rangeKey: 'thisWeek',
    start: '',
    end: '',
    rangeError: '',         // 自定义区间起止颠倒时的提示
    dateBasis: 'planEnd',
    memberIds: [],          // 额外成员（不含自己），按 ctx.orgId 分桶存取
    includeSelf: true,      // 是否把自己算进统计。想「只看某个同事」就得能把自己摘掉
    memberOrgId: null,      // memberIds 当前对应的组织，换组织要重新读
    memberErrors: [],       // [{name, error}]
    dailyError: '',         // 跨日自动刷新本月失败时保留旧快照，并在底部提示
    fieldWarn: '',          // 工时字段缺失的提示文案（缺 estimated / actual 时非空）
    pickerOpen: false,
    rows: [],
    hasSnapshot: false,     // 当前精确区间是否已经加载并持久化
    snapshotKey: '',
    truncated: false,
    // 编辑状态按「行 + 字段」两级存，只放真正改过的字段（详见 numCell / setEdit 附近的说明）
    edits: {},              // {rowId: {est?: 新预计工时, act?: 新实际工时}}
    failed: {},             // {'rowId|est' / 'rowId|act': 错误文案}，键由 failKey() 拼
    sortKey: 'planEnd',
    sortDir: 'desc',
    search: '',
    dayFilter: null,
    heatField: null,        // both 口径下热力图当前看哪个字段（null=跟随设置）
    missingOnly: false,     // 明细只看「没填工时」的行
    missingTop: true,       // 把这些行置顶（跟着提醒开关走，可在明细工具条临时关掉）
    groupTab: 'project',
    groupExpanded: {},
    submitting: false,
    submitProgress: null,   // {done, total}
    progress: null,         // {done, total, loaded}
    reqSeq: 0,
    scrollLock: null
  };

  const refs = {};

  /* ---------------------------------------------------------------- 基础 DOM */

  /** 薄封装 ui.h：统一只用 class/text/dataset/on*，其余属性一律建好后再赋值，避免依赖 h 的实现细节 */
  function el(tag, cls, text) {
    return NS.ui.h(tag, { class: cls || '', text: text === null || text === undefined ? '' : String(text) });
  }

  function add(parent) {
    for (let i = 1; i < arguments.length; i++) {
      const c = arguments[i];
      if (c) parent.appendChild(c);
    }
    return parent;
  }

  function btn(cls, text, onclick) {
    const b = NS.ui.h('button', { class: cls, text: text, onclick: onclick });
    b.type = 'button';
    return b;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function toast(msg, type) {
    try {
      NS.ui.toast(refs.root, msg, type || 'info');
    } catch (e) {
      // toast 挂了也不能影响主流程
    }
  }

  function errMsg(e) {
    if (!e) return '未知错误';
    const m = e.message || String(e);
    return m === 'YXWT_NOT_LOGGED_IN' ? '未登录云效或登录已过期' : m;
  }

  function truncate(s, n) {
    const str = s === null || s === undefined ? '' : String(s);
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  function hours(n) {
    return U.fmtHours(Number(n) || 0);
  }

  /* ---------------------------------------------------------------- 挂载与开关 */

  function ensureMounted() {
    if (state.mounted) return;
    const m = NS.ui.mount(HOST_ID);
    refs.host = m.host;
    refs.root = m.root;

    const style = document.createElement('style');
    style.textContent = PANEL_CSS;
    refs.root.appendChild(style);

    buildShell();
    state.mounted = true;

    // Esc 关闭：捕获阶段拿，避免云效自己的处理器先吃掉
    refs.onKeydown = function (ev) {
      if (!state.open) return;
      if (ev.key === 'Escape' || ev.key === 'Esc') {
        // ui.confirmDialog 打开时 Esc 归它处理（它的监听在 shadow root 上，会被这里的捕获抢先）
        if (refs.root && refs.root.querySelector('.yx-dlgmask')) return;
        ev.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', refs.onKeydown, true);

    // 设置页改了偏好（尤其是「写入模式」这个唯一的安全开关）要立刻生效，
    // 不能等到面板重新 load()——面板 booted 之后关掉再打开是不会重读的
    try {
      NS.store.onChange(function (cfg) {
        const next = (cfg && cfg.prefs) || {};
        const before = state.prefs || {};
        state.prefs = next;
        applyTheme();
        if (before.defaultRange !== next.defaultRange) {
          state.start = '';
          state.end = '';
          state.booted = false;
          state.hasSnapshot = false;
          if (state.open && !state.loading) load({ preferCache: true });
          return;
        }
        if (!state.open) return;
        if (before.dryRun !== next.dryRun) renderEditBar();
        if (before.dailyTargetHours !== next.dailyTargetHours && state.booted) renderCalendar();
      });
    } catch (e) {
      // 订阅失败不影响主流程，只是失去实时同步
    }
  }

  function applyTheme() {
    const theme = state.prefs && state.prefs.theme;
    if (!refs.host) return;
    if (theme === 'light' || theme === 'dark') refs.host.setAttribute('data-theme', theme);
    else refs.host.removeAttribute('data-theme');
  }

  function lockScroll() {
    const de = document.documentElement;
    const bd = document.body;
    state.scrollLock = {
      html: de ? de.style.overflow : '',
      body: bd ? bd.style.overflow : ''
    };
    if (de) de.style.overflow = 'hidden';
    if (bd) bd.style.overflow = 'hidden';
  }

  function unlockScroll() {
    const lock = state.scrollLock;
    if (!lock) return;
    if (document.documentElement) document.documentElement.style.overflow = lock.html || '';
    if (document.body) document.body.style.overflow = lock.body || '';
    state.scrollLock = null;
  }

  function open() {
    ensureMounted();
    if (state.open) return;
    state.open = true;
    refs.overlay.classList.remove('yxp-hidden');
    lockScroll();
    if (!state.booted && !state.loading) {
      load({ preferCache: true });
    } else {
      // 重新打开时至少把 prefs 读新一遍，避免用的是上次打开时的写入模式
      ensureConfig().then(function () {
        if (state.open) renderAll();
      }, function () {
        if (state.open) renderAll();
      });
      renderAll();
    }
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    state.pickerOpen = false;
    if (refs.overlay) refs.overlay.classList.add('yxp-hidden');
    unlockScroll();
  }

  function toggle() {
    if (state.open) close();
    else open();
  }

  function isOpen() {
    return state.open === true;
  }

  /* ---------------------------------------------------------------- 骨架 */

  function buildShell() {
    const root = el('div', 'yxp-root');
    const overlay = el('div', 'yxp-overlay yxp-hidden');
    overlay.onclick = function (ev) {
      if (ev.target === overlay) close();
    };
    const card = el('div', 'yxp-card');

    // 顶栏
    const top = el('div', 'yxp-top');
    const org = el('div', 'yxp-org', '正在识别组织…');
    refs.org = org;
    add(top,
      el('div', 'yxp-logo', 'H'),
      el('div', 'yxp-title', '云效工时统计'),
      org,
      el('div', 'yxp-spacer'),
      btn('yxp-x', '✕', close)
    );

    // 筛选区
    const filters = el('div', 'yxp-filters');
    refs.filters = filters;

    // 主体
    const body = el('div', 'yxp-body');
    refs.body = body;
    refs.stateBox = el('div', 'yxp-state yxp-hidden');
    refs.sections = el('div', 'yxp-sections');

    refs.secOverview = el('section', 'yxp-sec');
    refs.secCalendar = el('section', 'yxp-sec');
    refs.secGroups = el('section', 'yxp-sec');
    refs.secTable = el('section', 'yxp-sec');
    add(refs.sections, refs.secOverview, refs.secCalendar, refs.secGroups, refs.secTable);
    add(body, refs.stateBox, refs.sections);

    // 底部
    const foot = el('div', 'yxp-foot');
    refs.footStatus = el('div', 'yxp-status', '');
    add(foot,
      btn('yxp-btn', '复制 Markdown', copyMarkdown),
      btn('yxp-btn', '导出 CSV', exportCsv),
      btn('yxp-btn ghost', '打开设置', openOptions),
      refs.footStatus
    );

    add(card, top, filters, body, foot);
    add(overlay, card);
    add(root, overlay);
    refs.root.appendChild(root);
    refs.overlay = overlay;

    renderFilters();
  }

  /* ---------------------------------------------------------------- 筛选行 */

  function renderFilters() {
    // 必须赶在 clear() 之前记：clear 把选择器从 DOM 摘下来的瞬间 scrollTop 就归零了
    if (refs.memberPicker) {
      const keepList = refs.memberPicker.querySelector('.yxp-plist');
      refs.memberPickerScroll = keepList ? keepList.scrollTop : 0;
    }
    const box = clear(refs.filters);
    const presets = U.rangePresets();

    // 第一行：时间范围
    const row1 = el('div', 'yxp-frow');
    const group = el('div', 'yxp-presets');
    presets.forEach(function (p) {
      const b = btn('yxp-preset' + (state.rangeKey === p.key ? ' on' : ''), p.label, function () {
        state.rangeKey = p.key;
        state.start = p.start;
        state.end = p.end;
        state.dayFilter = null;
        state.rangeError = '';
        renderFilters();
        load({ cacheOnly: true });
      });
      b.title = p.start + ' ~ ' + p.end;
      add(group, b);
    });

    // 用 onchange 而不是 oninput：手敲日期时 oninput 每按一位就会触发一次请求
    const dStart = el('input', 'yxp-input yxp-num');
    dStart.type = 'date';
    dStart.value = state.start;
    dStart.onchange = function () { onCustomRange(dStart.value, null); };
    const dEnd = el('input', 'yxp-input yxp-num');
    dEnd.type = 'date';
    dEnd.value = state.end;
    dEnd.onchange = function () { onCustomRange(null, dEnd.value); };

    if (state.rangeError) {
      dStart.classList.add('yxp-inputbad');
      dEnd.classList.add('yxp-inputbad');
    }
    add(row1, el('span', 'yxp-flabel', '时间范围'), group, dStart, el('span', 'yxp-flabel', '至'), dEnd);

    // 第二行：口径 + 成员 + 刷新 + 进度
    const row2 = el('div', 'yxp-frow');
    const sel = el('select', 'yxp-select');
    BASIS_OPTIONS.forEach(function (o) {
      const opt = el('option', '', o.optLabel || o.label);
      opt.value = o.key;
      if (o.key === state.dateBasis) opt.selected = true;
      add(sel, opt);
    });
    sel.onchange = function () {
      state.dateBasis = sel.value;
      state.dayFilter = null;
      NS.store.setPrefs({ dateBasis: sel.value }).catch(function () {});
      renderFilters();
      load({ cacheOnly: true });
    };

    const memberBox = el('div', 'yxp-memberbox yxp-frow');
    refs.memberChip = memberSummaryChip();
    add(memberBox, el('span', 'yxp-flabel', '成员'), refs.memberChip);
    const pickBtn = btn('yxp-btn', memberPickLabel(), function () {
      state.pickerOpen = !state.pickerOpen;
      renderFilters();
    });
    refs.memberPickBtn = pickBtn;
    add(memberBox, pickBtn);
    refs.memberBox = memberBox;
    if (state.pickerOpen) {
      // 复用已有的选择器节点：renderFilters 会被 load()、切口径等多处调用，
      // 每次重建会把 43 人列表的滚动位置弹回顶部、键盘焦点丢掉，连点多个人还会掉勾。
      // 只有通讯录本身变了（导入/删除）才通过 invalidateMemberPicker() 强制重建。
      if (!refs.memberPicker) refs.memberPicker = buildMemberPicker();
      // scrollTop 已在函数开头记下（clear 之前），这里挂好、末尾 restore 还回去
      add(memberBox, refs.memberPicker);
    } else {
      refs.memberPicker = null;
      refs.memberPickerScroll = 0;
    }

    const refreshBtn = btn('yxp-btn', state.loading ? '加载中…' : (state.hasSnapshot ? '刷新此区间' : '加载此区间'), function () {
      if (!state.loading) load({ force: true });
    });
    refreshBtn.disabled = !!state.loading;

    refs.status = el('div', 'yxp-status', '');
    const basisLabelEl = el('span', 'yxp-flabel', '归集口径');
    basisLabelEl.title = '一个工作项算到哪一天头上：按它的计划完成日 / 实际完成日 / 计划开始日';
    const basisHint = el('span', 'yxp-hint', '（一个任务算到哪一天）');
    add(row2, basisLabelEl, sel, basisHint, memberBox, refreshBtn, refs.status);

    add(box, row1, row2);

    if (state.rangeError) add(box, el('div', 'yxp-note yxp-badnote', state.rangeError));

    // 工时字段缺失告警：位置显眼，并直接给一个「打开设置」的出口
    if (state.fieldWarn) {
      const warnRow = el('div', 'yxp-note yxp-warnnote', state.fieldWarn + ' ');
      add(warnRow, btn('yxp-btn ghost yxp-tiny', '打开设置', openOptions));
      add(box, warnRow);
    }

    // 成员加载失败：概览卡照常出数，不在这里说一声用户根本发现不了统计缺人
    if (state.memberErrors.length) {
      const txt = state.memberErrors.map(function (m) {
        return m.name + '（' + m.error + '）';
      }).join('、');
      add(box, el('div', 'yxp-note yxp-badnote',
        '以下成员加载失败，本次统计不含他们的数据：' + txt + '。可点「刷新」重试。'));
    }

    // finishTime 口径的本地过滤提示（SPEC 7 明确要求这句文案）
    if (state.dateBasis === 'finishTime') {
      add(box, el('div', 'yxp-note',
        '实际完成口径为本地过滤：先按「计划完成时间」拉取前后各 ' + NS.rangeData.FINISH_PAD_DAYS + ' 天的数据再按实际完成时间筛选，区间外的任务可能不全。'));
    }
    restoreMemberPickerScroll();
    renderStatus();
  }

  function restoreMemberPickerScroll() {
    if (!refs.memberPicker || !refs.memberPickerScroll) return;
    const pl = refs.memberPicker.querySelector('.yxp-plist');
    if (pl) pl.scrollTop = refs.memberPickerScroll;
  }

  function memberSummaryChip() {
    const me = selfName();
    const n = state.memberIds.length;
    let txt;
    if (!state.includeSelf && !n) txt = '没有选中任何人';
    else if (!state.includeSelf) {
      // 不含自己是个反常态，文案要说破，否则用户会以为数字算漏了
      const only = n === 1 ? firstMemberName() : n + ' 人';
      txt = '不含我 · ' + only;
    } else if (!n) txt = '只看我（' + me + '）';
    else txt = me + ' 等 ' + (n + 1) + ' 人';
    return el('span', 'yxp-chip' + (state.includeSelf ? '' : ' yxp-chip-alt'), txt);
  }

  function firstMemberName() {
    const id = state.memberIds[0];
    const c = id && state.contacts[id];
    return (c && c.name) || id || '';
  }

  function buildMemberPicker() {
    const box = el('div', 'yxp-picker');
    box.onclick = function (ev) { ev.stopPropagation(); };
    add(box, el('h4', '', '通讯录（本地积累，云效没有可用的成员搜索接口）'));

    const list = el('div', 'yxp-plist');

    // 「我」也要有一个复选框：只加同事却摘不掉自己，就永远看不了「单看某个人」
    const selfItem = el('div', 'yxp-pitem');
    const selfLabel = el('label', '');
    const selfCb = el('input', '');
    selfCb.type = 'checkbox';
    selfCb.checked = !!state.includeSelf;
    selfCb.onchange = function () { onToggleSelf(selfCb.checked, selfCb); };
    add(selfLabel, selfCb, el('span', '', selfName() + '（我）'));
    add(selfItem, selfLabel);
    add(list, selfItem);

    const ids = Object.keys(state.contacts || {});
    ids.sort(function (a, b) {
      const na = (state.contacts[a] && state.contacts[a].name) || a;
      const nb = (state.contacts[b] && state.contacts[b].name) || b;
      return String(na).localeCompare(String(nb), 'zh-Hans-CN');
    });
    const selfId = state.ctx && state.ctx.userId;
    let shown = 0;
    ids.forEach(function (id) {
      if (id === selfId) return;
      shown++;
      const c = state.contacts[id] || {};
      const item = el('div', 'yxp-pitem');
      const label = el('label', '');
      const cb = el('input', '');
      cb.type = 'checkbox';
      cb.checked = state.memberIds.indexOf(id) >= 0;
      cb.onchange = function () { onToggleMember(id, cb.checked); };
      add(label, cb, el('span', '', c.name || id));
      const rm = btn('yxp-x', '✕', function () { onRemoveContact(id); });
      rm.title = '从通讯录移除';
      add(item, label, rm);
      add(list, item);
    });
    if (!shown) {
      add(list, el('div', 'yxp-status', '通讯录还是空的，先点下面的「从当前视图导入同事」。'));
    }
    add(box, list);

    const foot = el('div', 'yxp-pfoot');
    refs.importBtn = btn('yxp-btn', '从当前视图导入同事', importColleagues);
    if (state.importing) setImportBtnBusy(true);
    add(foot,
      refs.importBtn,
      btn('yxp-btn ghost', '只看我', function () {
        state.memberIds = [];
        state.includeSelf = true;
        saveMembers();
        invalidateMemberPicker();
        renderFilters();
        load();
      }),
      btn('yxp-btn ghost', '不含我', function () {
        if (!state.memberIds.length) {
          toast('先勾选至少一位同事，再把自己摘掉。', 'error');
          return;
        }
        state.includeSelf = false;
        saveMembers();
        invalidateMemberPicker();
        renderFilters();
        load();
      })
    );
    add(box, foot);
    return box;
  }

  function invalidateMemberPicker() {
    refs.memberPicker = null;
  }

  // 通讯录内容签名：只有真的增删了人才重建选择器
  function contactsSig(map) {
    return Object.keys(map || {}).sort().join(',');
  }

  function memberPickLabel() {
    const n = pickedCount();
    return n === 1 && state.includeSelf ? '+ 成员' : '成员 (' + n + ')';
  }

  // 勾选成员只刷新汇总文案，不重建选择器：通讯录可能有几十人，
  // 整块重绘会把滚动位置弹回顶部、键盘焦点也丢，连点多个人还会掉勾。
  function refreshMemberSummary() {
    if (refs.memberChip && refs.memberChip.parentNode) {
      const next = memberSummaryChip();
      refs.memberChip.parentNode.replaceChild(next, refs.memberChip);
      refs.memberChip = next;
    }
    if (refs.memberPickBtn) refs.memberPickBtn.textContent = memberPickLabel();
  }

  function onToggleMember(id, on) {
    const i = state.memberIds.indexOf(id);
    // 取消最后一个人、且自己也没勾上 —— 那就一个人都不剩了，拦下来
    if (!on && i >= 0 && state.memberIds.length === 1 && !state.includeSelf) {
      toast('至少要选一个人。想看自己的话，勾上「' + selfName() + '（我）」。', 'error');
      const cb = refs.memberPicker && refs.memberPicker.querySelector('input[type=checkbox]:not(:checked)');
      if (cb) cb.checked = true;
      invalidateMemberPicker();
      renderFilters();
      return;
    }
    if (on && i < 0) state.memberIds.push(id);
    if (!on && i >= 0) state.memberIds.splice(i, 1);
    saveMembers();
    refreshMemberSummary();
    load();
  }

  function onToggleSelf(on, cb) {
    if (!on && !state.memberIds.length) {
      toast('至少要选一个人。先勾一位同事，再把自己摘掉。', 'error');
      if (cb) cb.checked = true;                  // 勾回去，别让界面停在一个不成立的状态
      return;
    }
    state.includeSelf = !!on;
    saveMembers();
    refreshMemberSummary();
    // 成员变了就得重新拉：缓存是按「成员组合」存的，这里走 cacheOnly 会停在
    // 「加载此区间」等用户再点一次，对用户来说就是「取消了自己却没反应」。
    load();
  }

  function onRemoveContact(id) {
    const i = state.memberIds.indexOf(id);
    if (i >= 0) state.memberIds.splice(i, 1);
    delete state.contacts[id];
    Promise.resolve()
      .then(function () { return NS.store.removeContact(state.ctx.orgId, id); })
      .catch(function () {});
    // 删人必须重建列表，但把滚动位置还回去，否则删一个就弹回顶部
    const prev = refs.memberPicker ? refs.memberPicker.querySelector('.yxp-plist') : null;
    const top = prev ? prev.scrollTop : 0;
    state.contactsSig = contactsSig(state.contacts);
    invalidateMemberPicker();
    renderFilters();
    const next = refs.memberPicker ? refs.memberPicker.querySelector('.yxp-plist') : null;
    if (next && top) next.scrollTop = top;
  }

  function onCustomRange(start, end) {
    if (start) state.start = start;
    if (end) state.end = end;
    if (!state.start || !state.end) return;
    // 起止反了先不查，但必须说一声：否则页面毫无反应，用户以为插件卡死了
    if (state.start > state.end) {
      state.rangeError = '开始日期（' + state.start + '）晚于结束日期（' + state.end + '），调整后自动查询。';
      renderFilters();
      return;
    }
    state.rangeError = '';
    state.rangeKey = 'custom';
    state.dayFilter = null;
    renderFilters();
    load({ cacheOnly: true });
  }

  function renderStatus() {
    if (!refs.status) return;
    let txt = '';
    if (state.loading) {
      const p = state.progress;
      if (p && p.total) txt = (p.label || '加载中') + ' ' + p.done + '/' + p.total + ' 位成员 · 已取 ' + p.loaded + ' 条';
      else txt = '正在识别身份与工时字段…';
    } else if (state.error) {
      txt = '';
    } else if (state.booted && !state.hasSnapshot) {
      txt = state.start + ' ~ ' + state.end + ' · 未加载';
    } else if (state.booted) {
      const bits = [state.start + ' ~ ' + state.end, '共 ' + state.rows.length + ' 条'];
      if (state.truncated) bits.push('已达分页上限，数据可能不全');
      if (state.loadedAt) {
        const d = new Date(state.loadedAt);
        const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
        bits.push('最后刷新 ' + U.toYMD(d) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()));
      }
      txt = bits.join(' · ');
    }
    refs.status.textContent = txt;

    if (refs.footStatus) {
      const parts = [];
      if (state.fieldMap && state.fieldMap.lowConfidence) parts.push('工时字段为低置信匹配，可在设置页手动指定');
      // 详细的失败原因已经在筛选区那条醒目提示里了，这里只留一个计数，避免重复刷屏
      if (state.memberErrors.length) {
        parts.push(state.memberErrors.length + ' 位成员加载失败，统计不含其数据（见上方提示）');
      }
      if (state.dailyError) parts.push('本月自动刷新失败，当前显示上次快照：' + state.dailyError);
      refs.footStatus.textContent = parts.join(' · ');
      refs.footStatus.className = 'yxp-status' + (state.memberErrors.length || state.dailyError ? ' yxp-bad' : '');
    }
  }

  /* ---------------------------------------------------------------- 数据加载 */

  async function ensureConfig() {
    let cfg = null;
    try {
      cfg = await NS.store.get();
    } catch (e) {
      cfg = null;
    }
    state.prefs = (cfg && cfg.prefs) || {};
    // 只在首次启动时从存储取：setPrefs 是异步的，而 onToggleSelf 改完 state 立刻就 load()，
    // 这里若每次都读，会在写入落盘前读到旧值，把用户刚点的选择顶回去。
    if (!state.booted) state.includeSelf = state.prefs.includeSelf !== false;
    applyTheme();
    if (!state.booted && !state.start) {
      const key = state.prefs.defaultRange || 'thisWeek';
      const presets = U.rangePresets();
      let p = null;
      for (let i = 0; i < presets.length; i++) if (presets[i].key === key) p = presets[i];
      if (!p) p = presets[2];
      state.rangeKey = p.key;
      state.start = p.start;
      state.end = p.end;
      state.dateBasis = state.prefs.dateBasis || 'planEnd';
    }
    // 成员按组织分桶，在 rangeData.resolve() 识别组织后读取。
  }

  function saveMembers() {
    const orgId = state.ctx && state.ctx.orgId;
    if (!orgId) return;
    Promise.all([
      NS.store.setMembers(orgId, state.memberIds.slice()),
      NS.store.setPrefs({ includeSelf: !!state.includeSelf })
    ]).then(function () {
      if (NS.summarybar && typeof NS.summarybar.refresh === 'function') NS.summarybar.refresh();
    }).catch(function () {});
  }

  /** 选中的总人数（含自己）。为 0 时不该发查询——一个人都没选，拉回来必然是空表 */
  function pickedCount() {
    return (state.includeSelf ? 1 : 0) + state.memberIds.length;
  }

  function selfName() {
    return (state.ctx && state.ctx.name) || '我';
  }

  async function load(options) {
    const mode = options || {};
    ensureMounted();
    const seq = ++state.reqSeq;
    state.loading = true;
    state.error = null;
    state.memberErrors = [];
    state.dailyError = '';
    state.fieldWarn = '';
    state.progress = null;
    state.truncated = false;
    renderFilters();
    renderLoadingBody();

    try {
      await ensureConfig();
      // 把界面上的实时选择带进去，别让 resolve 回读存储把它覆盖掉（详见 rangeData.resolve 注释）。
      // state.booted 之前 state 里还是默认值，那时才该以存储为准。
      const scope = await NS.rangeData.resolve(state.prefs, state.booted ? {
        includeSelf: state.includeSelf,
        memberIds: state.memberIds
      } : null);
      if (seq !== state.reqSeq) return;
      state.ctx = scope.ctx;
      state.includeSelf = scope.includeSelf !== false;
      state.memberIds = scope.memberIds.slice();
      state.memberOrgId = String((scope.ctx && scope.ctx.orgId) || '');
      state.contacts = scope.contacts || {};
      if (refs.org) refs.org.textContent = (state.ctx && (state.ctx.orgName || state.ctx.orgId)) || '未知组织';
      const sig = contactsSig(state.contacts);
      if (sig !== state.contactsSig) {
        state.contactsSig = sig;
        invalidateMemberPicker();
      }
      state.fieldMap = scope.fieldMap;
      state.fieldWarn = scope.fieldWarn;

      const query = {
        start: state.start,
        end: state.end,
        dateBasis: state.dateBasis,
        excludeCancelled: state.prefs.excludeCancelled !== false
      };
      const monthRange = NS.rangeData.currentMonthRange();
      const isCurrentMonth = query.start === monthRange.start && query.end === monthRange.end;
      let daily = null;
      // 手动强刷本月本身已经是全量刷新，不再额外发一次“每日自动刷新”。
      if (!(mode.force && isCurrentMonth)) {
        daily = await NS.rangeData.refreshThisMonthIfNeeded(scope, state.prefs, {
          onProgress: function (p) {
            if (seq !== state.reqSeq) return;
            state.progress = Object.assign({ label: '自动刷新本月' }, p);
            renderStatus();
          }
        });
        if (seq !== state.reqSeq) return;
        if (daily.error) state.dailyError = errMsg(daily.error);
      }
      let snapshot = null;
      if (!mode.force && isCurrentMonth && daily && daily.snapshot) snapshot = daily.snapshot;
      if (!snapshot && !mode.force) snapshot = await NS.rangeData.readSnapshot(scope, query);
      if (!snapshot && isCurrentMonth && daily && daily.error) throw daily.error;
      if (seq !== state.reqSeq) return;
      if (!snapshot && mode.cacheOnly) {
        state.rows = [];
        state.hasSnapshot = false;
        state.snapshotKey = NS.rangeData.cacheKey(scope, query);
        state.loadedAt = null;
        state.booted = true;
        state.loading = false;
        state.progress = null;
        renderFilters();
        renderAll();
        return;
      }
      if (!snapshot) {
        state.rows = [];
        state.hasSnapshot = false;
        snapshot = await NS.rangeData.fetchSnapshot(scope, Object.assign({}, query, {
          onProgress: function (p) {
            if (seq !== state.reqSeq) return;
            state.progress = p;
            renderStatus();
          }
        }));
      }
      if (seq !== state.reqSeq) return;

      state.rows = snapshot.rows || [];
      state.hasSnapshot = true;
      state.snapshotKey = snapshot.cacheKey || NS.rangeData.cacheKey(scope, query);
      state.memberErrors = snapshot.memberErrors || [];
      state.truncated = !!snapshot.truncated;
      state.edits = {};
      state.failed = {};
      state.failedDetail = {};
      state.booted = true;
      state.loading = false;
      state.loadedAt = Number(snapshot.savedAt) || Date.now();
      state.progress = null;
      // 重新取数后仍停在旧的单日下钻上，很容易出现「明细 0 / N 条」而用户不知道为什么
      if (state.dayFilter && state.rows.every(function (r) { return r.date !== state.dayFilter; })) {
        state.dayFilter = null;
      }
      // 「只看未填预计」同理：新区间可能一条都不缺，留着筛选就是一张空表
      if (state.missingOnly && !countMissing(state.rows)) state.missingOnly = false;
      // 置顶开关跟着设置页的总开关走（面板里可临时取消勾选，重新取数时回到设置的值）
      state.missingTop = !(state.prefs && state.prefs.warnMissingEst === false);
      renderFilters();
      renderAll();
      if (mode.force && NS.summarybar && typeof NS.summarybar.refresh === 'function') {
        NS.summarybar.refresh();
      }
    } catch (e) {
      if (seq !== state.reqSeq) return;
      state.loading = false;
      const msg = errMsg(e);
      state.error = {
        message: msg,
        kind: e && e.__yxwtField ? 'field' : (msg.indexOf('未登录') >= 0 ? 'login' : 'other')
      };
      renderFilters();
      renderErrorBody();
    }
  }

  /* ---------------------------------------------------------------- 主体状态：加载中 / 出错 / 空 */

  function showStateBox() {
    refs.sections.classList.add('yxp-hidden');
    refs.stateBox.classList.remove('yxp-hidden');
    return clear(refs.stateBox);
  }

  function showSections() {
    refs.stateBox.classList.add('yxp-hidden');
    refs.sections.classList.remove('yxp-hidden');
  }

  function renderLoadingBody() {
    // 已经有数据时不清空，只在筛选行显示进度，避免刷新时界面闪烁
    if (state.booted && state.rows.length) return;
    const box = showStateBox();
    const cards = el('div', 'yxp-cards');
    for (let i = 0; i < 8; i++) {
      const s = el('div', 'yxp-skel');
      s.style.height = '68px';
      add(cards, s);
    }
    const bar = el('div', 'yxp-skel');
    bar.style.height = '150px';
    bar.style.marginTop = '12px';
    const table = el('div', 'yxp-skel');
    table.style.height = '220px';
    table.style.marginTop = '12px';
    add(box, cards, bar, table, el('div', 'yxp-status', '正在向云效拉取工作项…'));
    box.className = 'yxp-state';
    box.style.textAlign = 'left';
  }

  function renderErrorBody() {
    const box = showStateBox();
    box.className = 'yxp-state';
    box.style.textAlign = 'center';
    const kind = state.error.kind;
    add(box, el('div', 'big', kind === 'login' ? '需要先登录云效' : '统计失败'));
    add(box, el('div', 'msg', state.error.message));

    const acts = el('div', 'acts');
    add(acts, btn('yxp-btn primary', '重试', function () { load({ force: true }); }));
    if (kind === 'login') {
      const a = el('a', 'yxp-btn', '去登录云效');
      a.href = 'https://devops.aliyun.com/projex/workitem';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.textDecoration = 'none';
      add(acts, a);
    }
    if (kind === 'field') add(acts, btn('yxp-btn', '打开设置页手动指定字段', openOptions));
    add(box, acts);
  }

  function renderEmptyBody() {
    const box = showStateBox();
    box.className = 'yxp-state';
    box.style.textAlign = 'center';
    add(box, el('div', 'big', '这个区间没有查到工作项'));
    add(box, el('div', 'msg',
      '试试换个时间范围，或把归集口径从「' + basisLabel(state.dateBasis) + '」换成别的；' +
      '也可能是这些任务没填工时字段。'));
    const acts = el('div', 'acts');
    add(acts, btn('yxp-btn primary', '刷新此区间', function () { load({ force: true }); }));
    add(acts, btn('yxp-btn', '打开设置', openOptions));
    add(box, acts);
  }

  function renderNotLoadedBody() {
    const box = showStateBox();
    box.className = 'yxp-state';
    box.style.textAlign = 'center';
    add(box, el('div', 'big', '这个时间区间还没有加载数据'));
    add(box, el('div', 'msg', state.start + ' ~ ' + state.end +
      ' 尚无本地快照。只会加载当前所选区间，不会一次性拉取其它月份。'));
    const acts = el('div', 'acts');
    add(acts, btn('yxp-btn primary', '加载所选时间', function () { load({ force: true }); }));
    add(box, acts);
  }

  function basisLabel(key) {
    for (let i = 0; i < BASIS_OPTIONS.length; i++) if (BASIS_OPTIONS[i].key === key) return BASIS_OPTIONS[i].label;
    return key;
  }

  /* ---------------------------------------------------------------- 渲染：总入口 */

  function renderAll() {
    if (state.error) { renderErrorBody(); return; }
    if (state.loading && !state.rows.length) { renderLoadingBody(); return; }
    if (!state.hasSnapshot) { renderNotLoadedBody(); renderStatus(); return; }
    if (!state.rows.length) { renderEmptyBody(); return; }
    showSections();
    renderOverview();
    renderCalendar();
    renderGroups();
    renderTable();
    renderStatus();
  }

  /* -------------------------------------------------- 统计口径（预计 / 实际 / 两者） */

  /**
   * 单值指标（热力图着色、日均、工作日偏差、未填告警、分组排序）拿哪个字段当基准。
   * 天然双值的地方（预计/实际/偏差三张卡、明细两列、CSV）不受这里影响，它们本来就并排给。
   */
  function hoursBasis() {
    const b = state.prefs && state.prefs.hoursBasis;
    return b === 'actual' || b === 'both' ? b : 'estimated';
  }

  function usesEst() { const b = hoursBasis(); return b === 'estimated' || b === 'both'; }
  function usesAct() { const b = hoursBasis(); return b === 'actual' || b === 'both'; }

  /** 只能选一个字段的场景（热力图着色、分组排序）用它 —— both 时默认落在预计上 */
  function primaryField() { return hoursBasis() === 'actual' ? 'act' : 'est'; }

  /** stats.missingHours / isMissingHours 用的口径码 */
  function missingBasis() {
    const b = hoursBasis();
    return b === 'actual' ? 'act' : (b === 'both' ? 'both' : 'est');
  }

  /** 界面上叫什么：字段名是运行时探测的，能拿到真名就用真名 */
  function fieldLabel(which) {
    const fm = state.fieldMap || {};
    const f = which === 'act' ? fm.actual : fm.estimated;
    return (f && f.name) || (which === 'act' ? '实际工时' : '预计工时');
  }

  /* -------------------------------------------------- 未填工时的警示 */

  /**
   * 能不能提醒「没填预计工时」：
   * 字段没识别出来时全表 est 都是 0，一提醒就是整表标红——那是字段映射问题不是漏填，
   * 所以这种情况下整套提醒（标红 / 置顶 / 卡片 / 筛选）全部关掉，只留原有的字段告警。
   */
  function canWarnMissing() {
    if (state.prefs && state.prefs.warnMissingEst === false) return false;
    const fm = state.fieldMap || {};
    const hasEst = !!(fm.estimated && fm.estimated.id);
    const hasAct = !!(fm.actual && fm.actual.id);
    // 字段没识别出来时那一列全是 0，一提醒就是整表标红 —— 那是字段映射问题不是漏填
    if (hoursBasis() === 'actual') return hasAct;
    if (hoursBasis() === 'both') return hasEst || hasAct;
    return hasEst;
  }

  /**
   * 单行是否「没填工时」。用 effective 取值，用户在表里补完数字红色立刻消失。
   * both 口径下缺任一个都算 —— 两个字段都要用，缺哪个那套统计都会失真。
   * 但只对**识别出来的**字段做判定，免得把没映射的字段算成漏填。
   */
  function isMissing(r) {
    if (!r || r.isCancelled || !canWarnMissing()) return false;
    const fm = state.fieldMap || {};
    const hasEst = !!(fm.estimated && fm.estimated.id);
    const hasAct = !!(fm.actual && fm.actual.id);
    const estBad = hasEst && (Number(effective(r, 'est')) || 0) <= 0;
    const actBad = hasAct && (Number(effective(r, 'act')) || 0) <= 0;
    if (hoursBasis() === 'actual') return actBad;
    if (hoursBasis() === 'both') return estBad || actBad;
    return estBad;
  }

  function countMissing(rows) {
    let n = 0;
    (rows || []).forEach(function (r) { if (isMissing(r)) n += 1; });
    return n;
  }

  function missTitle(r) {
    const bits = [];
    const fm = state.fieldMap || {};
    if (fm.estimated && fm.estimated.id && usesEst() && (Number(effective(r, 'est')) || 0) <= 0) {
      bits.push(r && r.estMissing ? fieldLabel('est') + '没有值' : fieldLabel('est') + '填的是 0');
    }
    if (fm.actual && fm.actual.id && usesAct() && (Number(effective(r, 'act')) || 0) <= 0) {
      bits.push(fieldLabel('act') + '为 0');
    }
    return bits.length ? bits.join('、') + '，去云效里补一个' : '';
  }

  function toggleMissingOnly() {
    state.missingOnly = !state.missingOnly;
    renderOverview();
    renderGroups();
    renderTable();
  }

  /** 当前明细表可见的行（搜索 + 选中某天 + 只看未填） */
  function visibleRows() {
    const q = state.search.trim().toLowerCase();
    const missOnly = state.missingOnly && canWarnMissing();
    return state.rows.filter(function (r) {
      if (state.dayFilter && r.date !== state.dayFilter) return false;
      if (missOnly && !isMissing(r)) return false;
      if (!q) return true;
      return (
        String(r.sn || '').toLowerCase().indexOf(q) >= 0 ||
        String(r.subject || '').toLowerCase().indexOf(q) >= 0 ||
        String(r.project || '').toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function filterActive() {
    return !!(state.dayFilter || state.search.trim() || (state.missingOnly && canWarnMissing()));
  }

  /* ---------------------------------------------------------------- 概览卡 */

  function renderOverview() {
    const sec = clear(refs.secOverview);
    const rows = visibleRows();
    const s = NS.stats.summarize(rows) || { count: 0, est: 0, act: 0, diff: 0, days: 0, avgPerDay: 0 };
    const od = NS.stats.overdue(rows, Date.now()) || { total: 0, overdue: 0, rate: 0 };

    const head = el('h3', 'yxp-sechead', '概览');
    if (filterActive()) {
      const bits = [];
      if (state.dayFilter) bits.push(state.dayFilter);
      if (state.missingOnly && canWarnMissing()) bits.push('未填预计工时');
      if (state.search.trim()) bits.push('“' + truncate(state.search.trim(), 12) + '”');
      add(head, el('span', 'yxp-sub', '当前筛选：' + bits.join(' · ')));
    }
    add(sec, head);

    renderMissingBar(sec);

    const fm = state.fieldMap || {};
    const noEst = !(fm.estimated && fm.estimated.id);
    const noAct = !(fm.actual && fm.actual.id);

    const cards = el('div', 'yxp-cards');
    add(cards, card('任务数', String(s.count), '', ''));
    add(cards, card('预计工时', hours(s.est), 'h', noEst ? '字段未识别，按 0 计算' : '', noEst ? 'yxp-warn' : ''));
    add(cards, card('实际工时', hours(s.act), 'h', noAct ? '字段未识别，按 0 计算' : '', noAct ? 'yxp-warn' : ''));

    const diff = Number(s.diff) || 0;
    add(cards, card('偏差', (diff > 0 ? '+' : '') + hours(diff), 'h', '实际 − 预计',
      diff < 0 ? 'yxp-good' : (diff > 0 ? 'yxp-warn' : '')));

    const daysSub = (Number(s.days) || 0) + ' 个有效日';
    if (hoursBasis() === 'both') {
      add(cards, card('日均工时', hours(s.avgPerDay) + ' / ' + hours(s.avgPerDayAct), 'h',
        daysSub + ' · 预计 / 实际'));
    } else if (hoursBasis() === 'actual') {
      add(cards, card('日均工时', hours(s.avgPerDayAct), 'h', daysSub + ' · 按实际'));
    } else {
      add(cards, card('日均工时', hours(s.avgPerDay), 'h', daysSub));
    }

    const rate = Number(od.rate) || 0;
    add(cards, card('逾期率', hours(rate), '%', (od.overdue || 0) + '/' + (od.total || 0) + ' 逾期',
      rate > 20 ? 'yxp-bad' : ''));

    if (canWarnMissing()) {
      const miss = countMissing(rows);
      const label = hoursBasis() === 'actual' ? '未填实际'
        : (hoursBasis() === 'both' ? '未填工时' : '未填预计');
      add(cards, card(label, String(miss), '条',
        miss ? (state.missingOnly ? '点一下看全部' : '点一下只看这些') : '都填了',
        miss ? 'yxp-bad' : 'yxp-good',
        { onClick: (miss || state.missingOnly) ? toggleMissingOnly : null, active: state.missingOnly }));
    }

    add(sec, cards);

    // 工时目标统一从新的一行开始；所有范围都有总工时和总偏差，本周/本月再追加截止今日两项。
    const workCards = el('div', 'yxp-cards yxp-workcards');

    const calStart = state.dayFilter || state.start;
    const calEnd = state.dayFilter || state.end;
    const work = NS.workcalendar.summarize(calStart, calEnd, dailyTarget(), pickedCount());
    let workSub = work.workdays + ' 个工作日 × ' + hours(work.dailyHours) + 'h';
    if (work.memberCount > 1) workSub += ' × ' + work.memberCount + ' 人';
    if (work.unsupportedYears.length) {
      workSub = '仅按周一至周五 · 缺少 ' + work.unsupportedYears.join('、') + ' 年安排，请更新脚本';
    }
    add(workCards, card('工作日总工时', hours(work.hours), 'h', workSub,
      work.unsupportedYears.length ? 'yxp-warn' : ''));

    addWorkDiffCard(workCards, '工时偏差', s, work.hours, '工作日总工时');

    if (state.rangeKey === 'thisMonth' || state.rangeKey === 'thisWeek') {
      const today = U.toYMD(new Date());
      const throughEnd = today < state.end ? today : state.end;
      const through = NS.workcalendar.summarize(state.start, throughEnd, dailyTarget(), pickedCount());
      let throughSub = through.workdays + ' 个工作日 × ' + hours(through.dailyHours) + 'h';
      if (through.memberCount > 1) throughSub += ' × ' + through.memberCount + ' 人';
      if (through.unsupportedYears.length) {
        throughSub = '仅按周一至周五 · 缺少 ' + through.unsupportedYears.join('、') + ' 年安排，请更新脚本';
      }
      add(workCards, card('截止今日工时', hours(through.hours), 'h', throughSub,
        through.unsupportedYears.length ? 'yxp-warn' : ''));

      addWorkDiffCard(workCards, '截止今日工时偏差', s, through.hours, '截止今日工时');
    }

    add(sec, workCards);
  }

  /**
   * 「跟工作日目标比」的偏差卡。原来写死用实际工时，跟日均（用预计）不是一套口径，
   * 现在统一跟随设置：both 时一张卡里给两个数，不再额外加卡把概览撑爆。
   */
  function addWorkDiffCard(box, label, s, targetHours, targetName) {
    const est = (Number(s.est) || 0) - targetHours;
    const act = (Number(s.act) || 0) - targetHours;
    const sign = function (v) { return (v > 0 ? '+' : '') + hours(v); };
    const tone = function (v) { return v > 0 ? 'yxp-bad' : (v < 0 ? 'yxp-good' : ''); };
    if (hoursBasis() === 'both') {
      add(box, card(label, sign(est) + ' / ' + sign(act), 'h',
        '预计 / 实际 − ' + targetName, tone(act)));
      return;
    }
    const v = hoursBasis() === 'actual' ? act : est;
    const from = hoursBasis() === 'actual' ? '实际' : '预计';
    add(box, card(label, sign(v), 'h', from + ' − ' + targetName, tone(v)));
  }

  /**
   * 漏填工时的警示条。数字用的是**整个时间区间**（state.rows），不随下面的搜索 /
   * 单日下钻变化——它回答的是「这次查的这段时间里有没有漏记」，一点筛选就跳数会看不懂。
   */
  function renderMissingBar(sec) {
    if (!canWarnMissing()) return;
    const total = countMissing(state.rows);
    if (!total) return;
    const bar = el('div', 'yxp-note yxp-badnote yxp-missbar');
    let what = '「' + fieldLabel('est') + '」';
    if (hoursBasis() === 'actual') what = '「' + fieldLabel('act') + '」';
    else if (hoursBasis() === 'both') {
      // both 口径下分别报数，只说「没填全」用户会不知道该补哪一个
      const m = NS.stats.missingHours(state.rows, 'both');
      what = '工时（' + fieldLabel('est') + '缺 ' + m.est + ' 条、' + fieldLabel('act') + '缺 ' + m.act + ' 条）';
    }
    add(bar, el('span', '', '⚠ ' + state.start + ' ~ ' + state.end + ' 这段里有 ' + total +
      ' 条任务没填' + what + '，已在下方明细里标红并置顶。'));
    add(bar, btn('yxp-btn yxp-tiny', state.missingOnly ? '看全部' : '只看这 ' + total + ' 条', toggleMissingOnly));
    add(sec, bar);
  }

  function card(label, value, unit, sub, cls, opts) {
    const o = opts || {};
    const clickable = typeof o.onClick === 'function';
    const box = el(clickable ? 'button' : 'div', 'yxp-cardbox' +
      (clickable ? ' yxp-cardbtn' : '') + (clickable && o.active ? ' on' : ''));
    const val = el('div', 'yxp-cardval' + (cls ? ' ' + cls : ''), value);
    if (unit) add(val, el('small', '', unit));
    add(box, el('div', 'yxp-cardlabel', label), val);
    if (sub) add(box, el('div', 'yxp-cardsub', sub));
    if (clickable) {
      box.type = 'button';
      box.onclick = o.onClick;
      box.setAttribute('aria-pressed', o.active ? 'true' : 'false');
    }
    return box;
  }

  /* ---------------------------------------------------------------- 日历热力图 */

  function renderCalendar() {
    const sec = clear(refs.secCalendar);
    const target = dailyTarget();
    const days = NS.stats.byDay(state.rows, state.start, state.end, {
      dailyTargetHours: target,
      isWorkday: function (ymd) { return NS.workcalendar.classify(ymd).workday; }
    }) || [];

    // 一个格子只能有一种颜色，所以热力图必须落到单一字段上；both 口径给个切换让用户自己选
    const field = state.heatField === 'act' || state.heatField === 'est'
      ? state.heatField : primaryField();
    const fieldName = fieldLabel(field);

    const head = el('h3', 'yxp-sechead', '日历热力图');
    add(head, el('span', 'yxp-sub', '按「' + basisLabel(state.dateBasis) +
      '」归集 · 格子内为当日' + fieldName + '（h），色深同口径 · 点某天筛选下方明细'));
    add(head, el('div', 'yxp-spacer'));
    if (hoursBasis() === 'both') {
      const sw = el('div', 'yxp-tabs');
      [['est', fieldLabel('est')], ['act', fieldLabel('act')]].forEach(function (pair) {
        add(sw, btn('yxp-tab' + (field === pair[0] ? ' on' : ''), pair[1], function () {
          state.heatField = pair[0];
          renderCalendar();
        }));
      });
      add(head, sw);
    }
    add(head, legend());
    add(sec, head);

    if (!days.length) {
      add(sec, el('div', 'yxp-status', '区间无效或超过 ' + (U.MAX_DAYS || 400) + ' 天上限。'));
      return;
    }

    let max = 0;
    days.forEach(function (d) { const v = d[field]; if (v > max) max = v; });

    const wrap = el('div', 'yxp-calwrap');
    const grid = el('div', 'yxp-cal');
    ['一', '二', '三', '四', '五', '六', '日'].forEach(function (w) {
      add(grid, el('div', 'yxp-calhead', w));
    });

    // 首周补空：周一为一周之始，getDay() 里周日是 0，要换算成第 6 列
    const first = U.parseYMD(days[0].ymd);
    const lead = first ? (first.getDay() === 0 ? 6 : first.getDay() - 1) : 0;
    for (let i = 0; i < lead; i++) add(grid, el('div', 'yxp-day empty'));

    days.forEach(function (d) {
      const val = d[field];
      const lv = heatLevel(val, max);
      const cls = ['yxp-day', 'lv' + lv];
      if (!d.isWorkday) cls.push('weekend');
      if (d.isWorkday && d.target > 0 && val < d.target) cls.push('short');
      if (state.dayFilter === d.ymd) cls.push('on');
      const cell = btn(cls.join(' '), '', function () { onPickDay(d.ymd); });
      const dd = U.parseYMD(d.ymd);
      const dayNum = dd ? (dd.getDate() === 1 ? (dd.getMonth() + 1) + '/1' : String(dd.getDate())) : d.ymd;
      const hv = el('div', 'h', val ? hours(val) : '·');
      if (val) add(hv, el('small', 'yxp-unit', 'h'));
      add(cell, el('div', 'd', dayNum), hv);
      cell.title = d.ymd + ' · ' + d.count + ' 个任务 · ' + fieldLabel('est') + ' ' + hours(d.est) +
        'h / ' + fieldLabel('act') + ' ' + hours(d.act) + 'h' +
        (d.deficit > 0 ? ' · 缺 ' + hours(d.deficit) + 'h' : '');
      cell.dataset.ymd = d.ymd;
      add(grid, cell);
    });

    add(wrap, grid);
    add(sec, wrap);

    // daysBetween 到 MAX_DAYS 就截断，此时 days.length===400 走不到上面的空分支，
    // 概览/分组/明细仍是完整区间，只有日历少一截，不说明用户根本发现不了
    const maxDays = U.MAX_DAYS || 400;
    if (days.length >= maxDays) {
      add(sec, el('div', 'yxp-note',
        '区间超过 ' + maxDays + ' 天，热力图只画到 ' + days[days.length - 1].ymd +
        '；上方概览、分组与明细仍是完整区间的数据。'));
    }
  }

  function legend() {
    const box = el('div', 'yxp-legend');
    // 说明色阶量的是「预计工时」而不是任务数——格子里的大数字同口径
    add(box, el('span', '', '预计工时 少'));
    for (let i = 0; i <= 4; i++) {
      const i0 = el('i', '');
      i0.style.background = 'var(--yxp-h' + i + ')';
      add(box, i0);
    }
    add(box, el('span', '', '多'));

    // 每日标准工时设成 0 表示关掉缺口提醒，此时不该再画「不足」图例
    const t = dailyTarget();
    if (t > 0) {
      const warn = el('i', '');
      warn.style.background = 'transparent';
      warn.style.border = '1.5px dashed var(--yxp-warn)';
      add(box, warn, el('span', '', '工作日不足 ' + hours(t) + 'h'));
    }
    return box;
  }

  /**
   * 每日标准工时。0 是合法值（用户想关掉工作日缺口提醒），不能被 `|| 8` 顶回 8。
   * 判空口径与 stats.byDay 保持一致：只有 null/undefined/空串/非数才回落默认 8。
   */
  function dailyTarget() {
    const raw = state.prefs ? state.prefs.dailyTargetHours : undefined;
    if (raw === null || raw === undefined || raw === '') return 8;
    const n = Number(raw);
    return isFinite(n) && n >= 0 ? n : 8;
  }

  function heatLevel(est, max) {
    const v = Number(est) || 0;
    if (v <= 0) return 0;
    if (!(max > 0)) return 1;
    const r = v / max;
    if (r <= 0.25) return 1;
    if (r <= 0.5) return 2;
    if (r <= 0.75) return 3;
    return 4;
  }

  function onPickDay(ymd) {
    state.dayFilter = state.dayFilter === ymd ? null : ymd;
    renderCalendar();
    renderOverview();
    renderGroups();
    renderTable();
  }

  /* ---------------------------------------------------------------- 分组统计 */

  function renderGroups() {
    const sec = clear(refs.secGroups);
    const head = el('h3', 'yxp-sechead', '分组统计');
    const tabs = el('div', 'yxp-tabs');
    GROUP_TABS.forEach(function (t) {
      add(tabs, btn('yxp-tab' + (state.groupTab === t.key ? ' on' : ''), t.label, function () {
        state.groupTab = t.key;
        renderGroups();
      }));
    });
    add(head, tabs);
    add(sec, head);

    const rows = visibleRows();
    const groups = NS.stats.groupBy(rows, state.groupTab, primaryField()) || [];
    if (!groups.length) {
      add(sec, el('div', 'yxp-status', '没有可分组的数据。'));
      return;
    }

    // 条形长度按主口径的工时；该口径全是 0 时退回按条数，免得画出一排空条
    const pf = primaryField();
    let maxEst = 0;
    let maxCount = 0;
    groups.forEach(function (g) {
      if (g[pf] > maxEst) maxEst = g[pf];
      if (g.count > maxCount) maxCount = g.count;
    });
    const useEst = maxEst > 0;
    const max = useEst ? maxEst : maxCount;

    const bars = el('div', 'yxp-bars');
    const expanded = !!state.groupExpanded[state.groupTab];
    const shown = expanded ? groups : groups.slice(0, GROUP_TOP);
    shown.forEach(function (g) {
      const line = el('div', 'yxp-bar');
      const label = el('div', 'yxp-barlabel', g.label || g.key || '(空)');
      label.title = String(g.label || g.key || '');
      const track = el('div', 'yxp-bartrack');
      const fill = el('div', 'yxp-barfill');
      const metric = useEst ? g[primaryField()] : g.count;
      fill.style.width = Math.max(2, Math.round((metric / (max || 1)) * 100)) + '%';
      add(track, fill);
      const val = el('div', 'yxp-barval',
        g.count + ' 条 · 预计 ' + hours(g.est) + 'h · 实际 ' + hours(g.act) + 'h');
      add(line, label, track, val);
      add(bars, line);
    });
    add(sec, bars);

    if (groups.length > GROUP_TOP) {
      add(sec, btn('yxp-btn ghost', expanded ? '收起' : '其余 ' + (groups.length - GROUP_TOP) + ' 项', function () {
        state.groupExpanded[state.groupTab] = !expanded;
        renderGroups();
      }));
    }
  }

  /* ---------------------------------------------------------------- 明细表 */

  function renderTable() {
    const sec = clear(refs.secTable);
    // 「能不能编辑」现在是按列判断的（预计 / 实际各自看字段有没有识别出来）
    const canEditAct = canEditField('act');
    const canEdit = canEditAct || canEditField('est');

    const head = el('h3', 'yxp-sechead', '明细');
    refs.tableCount = el('span', 'yxp-sub', '');
    add(head, refs.tableCount);
    add(sec, head);

    // 工具条
    const bar = el('div', 'yxp-tbar');
    const search = el('input', 'yxp-input');
    search.type = 'search';
    search.placeholder = '搜索标题 / 编号 / 项目';
    search.value = state.search;
    search.style.width = '220px';
    // 搜索只重绘表体和统计，不重建工具条，否则输入框会被销毁、焦点丢失
    const onSearch = U.debounce(function () {
      state.search = search.value || '';
      renderTableBody();
      renderOverview();
      renderGroups();
    }, 220);
    search.oninput = onSearch;
    add(bar, search);

    if (state.dayFilter) {
      const chip = el('span', 'yxp-chip', '仅看 ' + state.dayFilter);
      add(chip, btn('', '✕', function () { onPickDay(state.dayFilter); }));
      add(bar, chip);
    }

    if (canWarnMissing()) {
      const missCount = countMissing(state.rows);
      if (missCount || state.missingOnly) {
        const only = btn('yxp-btn' + (state.missingOnly ? ' primary' : ''),
          state.missingOnly ? '✓ 只看未填预计（' + missCount + '）' : '只看未填预计（' + missCount + '）',
          toggleMissingOnly);
        only.title = '只显示没填「预计工时」的任务，再点一次看全部';
        add(bar, only);

        const lab = el('label', 'yxp-check');
        const cb = el('input', '');
        cb.type = 'checkbox';
        cb.checked = !!state.missingTop;
        cb.onchange = function () {
          state.missingTop = !!cb.checked;
          renderTableBody();
        };
        add(lab, cb, el('span', '', '未填置顶'));
        lab.title = '把没填预计工时的行排到最前面，不影响你选的排序列';
        add(bar, lab);
      }
    }

    if (canEditAct) {
      // 「按预计工时填充」写的是实际工时，所以只看实际字段识别没识别出来
      refs.fillBtn = btn('yxp-btn', '按预计工时一键填充', fillFromEstimated);
      syncFillBtn();
      add(bar, refs.fillBtn);
    } else {
      refs.fillBtn = null;
    }
    if (fieldIdConflict()) {
      add(bar, el('span', 'yxp-note',
        '「预计工时」和「实际工时」指向了同一个字段，已禁用「预计」列编辑（同时写会互相覆盖）。请到设置页修正映射。'));
    } else if (!canEdit) {
      add(bar, el('span', 'yxp-note', '未识别到工时字段，明细只读。可到设置页手动指定。'));
    } else if (!canEditAct) {
      add(bar, el('span', 'yxp-note', '未识别到「实际工时」字段，只有「预计」列可改。'));
    } else if (!canEditField('est')) {
      add(bar, el('span', 'yxp-note', '未识别到「预计工时」字段，只有「实际」列可改。'));
    }
    add(sec, bar);

    // 改动条
    refs.editBar = el('div', 'yxp-editbar yxp-hidden');
    add(sec, refs.editBar);

    const wrap = el('div', 'yxp-tablewrap');
    const table = el('table', 'yxp-table');
    const thead = el('thead', '');
    const tr = el('tr', '');
    COLUMNS.forEach(function (c) {
      const sortable = c.sortable !== false;
      const on = sortable && state.sortKey === c.key;
      const th = el('th', c.cls + (sortable ? '' : ' nosort'), c.label);
      // ✎ 只在这一列真的可编辑时才显示，字段没识别出来就不该给人错觉。
      // 它表达的是「这列能改」，不是列名的一部分：aria-hidden，也不进 th 的 title / 可访问名，
      // 否则排序按钮的可访问名会变成「实际 铅笔 降序」。
      if (c.editable && canEditField(c.editable)) {
        const mark = el('span', '', ' ✎');
        mark.setAttribute('aria-hidden', 'true');
        mark.title = '这一列可以直接编辑';
        add(th, mark);
      }
      if (on) {
        const arrow = el('span', '', state.sortDir === 'asc' ? ' ▲' : ' ▼');
        arrow.setAttribute('aria-hidden', 'true');   // 排序方向已经由 aria-sort 表达
        add(th, arrow);
      }
      if (sortable) {
        // 排序没有第二个入口，只挂 onclick 会让键盘/读屏用户完全用不了：
        // 补 tabindex + role + aria-sort，并接管 Enter/Space
        const doSort = function () {
          if (state.sortKey === c.key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          else { state.sortKey = c.key; state.sortDir = c.key === 'est' || c.key === 'act' ? 'desc' : 'asc'; }
          renderTable();
          const next = refs.tbody && refs.tbody.parentNode
            ? refs.tbody.parentNode.querySelector('th[data-sortkey="' + c.key + '"]')
            : null;
          if (next && next.focus) { try { next.focus(); } catch (e) { /* 忽略 */ } }
        };
        th.onclick = doSort;
        th.onkeydown = function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
            ev.preventDefault();
            doSort();
          }
        };
        th.tabIndex = 0;
        th.dataset.sortkey = c.key;
        th.setAttribute('role', 'columnheader');
        th.setAttribute('aria-sort', on ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
        th.title = '点击或按回车按「' + c.label + '」排序';
      }
      add(tr, th);
    });
    add(thead, tr);

    refs.tbody = el('tbody', '');
    add(table, thead, refs.tbody);
    add(wrap, table);
    add(sec, wrap);

    refs.tableNote = el('div', 'yxp-status yxp-hidden', '');
    add(sec, refs.tableNote);

    renderTableBody();
  }

  /** 填充按钮的文案/条数/禁用态跟着当前筛选走（搜索只重绘表体，也要同步） */
  function syncFillBtn() {
    const b = refs.fillBtn;
    if (!b) return;
    const fillable = visibleRows().filter(function (r) { return fillableFrom(r) > 0; }).length;
    b.textContent = filterActive() ? '按预计工时填充当前 ' + fillable + ' 条' : '按预计工时一键填充';
    b.title = '只填当前列表里「实际工时」为 0 且云效上已有预计工时的行（' + fillable +
      ' 条），仍需点「提交到云效」才会写回';
    b.disabled = !!state.submitting || !fillable;
  }

  /** 只重绘表体 + 行数文案 + 改动条，供搜索/编辑等高频操作调用 */
  function renderTableBody() {
    if (!refs.tbody) return;
    const rows = sortRows(visibleRows());
    const tbody = clear(refs.tbody);
    const limited = rows.slice(0, MAX_RENDER_ROWS);
    limited.forEach(function (r) { add(tbody, buildRow(r)); });

    if (refs.tableCount) refs.tableCount.textContent = rows.length + ' / ' + state.rows.length + ' 条';
    syncFillBtn();

    if (refs.tableNote) {
      if (rows.length > limited.length) {
        refs.tableNote.textContent = '为了不卡界面，只渲染了前 ' + MAX_RENDER_ROWS + ' 行，还有 ' +
          (rows.length - limited.length) + ' 行未显示；缩小时间范围或用搜索框过滤。';
        refs.tableNote.classList.remove('yxp-hidden');
      } else {
        refs.tableNote.textContent = '';
        refs.tableNote.classList.add('yxp-hidden');
      }
    }

    renderEditBar();
  }

  function buildRow(r) {
    const tr = el('tr', rowClass(r));
    tr.dataset.rid = r.id;

    add(tr, el('td', 'yxp-c-sn', r.sn || ''));

    const tdSubject = el('td', 'yxp-c-subject');
    const sub = el('div', '', r.subject || '(无标题)');
    sub.title = r.subject || '';
    add(tdSubject, sub);
    add(tr, tdSubject);

    const tdProject = el('td', 'yxp-c-project');
    const pj = el('div', '', r.project || '(无项目)');
    pj.title = r.project || '';
    add(tdProject, pj);
    add(tr, tdProject);

    const tdStatus = el('td', 'yxp-c-status');
    add(tdStatus, el('span', 'yxp-pill', r.status || '—'));
    add(tr, tdStatus);

    add(tr, el('td', 'yxp-c-assignee', r.assignee || '—'));
    add(tr, numCell(r, 'est', tr));
    add(tr, numCell(r, 'act', tr));

    add(tr, el('td', 'yxp-c-date', r.planEnd || '—'));

    const tdOpen = el('td', 'yxp-c-open');
    if (r.url) {
      const a = el('a', 'yxp-link', '↗');
      a.href = r.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = '在云效里打开';
      add(tdOpen, a);
    } else {
      tdOpen.textContent = '—';
    }
    add(tr, tdOpen);
    return tr;
  }

  /** 工时数值单元格：字段识别得出来就是可编辑输入框，否则只读 */
  function numCell(r, which, tr) {
    const td = el('td', 'yxp-c-num');
    const miss = which === 'est' && isMissing(r);
    if (!canEditField(which)) {
      if (miss) {
        const flag = el('span', 'yxp-miss', '未填');
        flag.title = missTitle(r);
        add(td, flag);
      } else {
        td.textContent = hours(r[which]);
      }
      return td;
    }
    const inp = el('input', 'yxp-actinput' + (miss ? ' miss' : ''));
    inp.type = 'number';
    inp.step = '0.5';
    inp.min = '0';
    inp.value = hours(effective(r, which));
    inp.disabled = !!state.submitting;
    const f = fieldOf(which);
    inp.title = (f ? f.name : which) + ' 原值 ' + hours(r[which]) + 'h' + (miss ? ' · ' + missTitle(r) : '');
    inp.placeholder = miss ? '未填' : '';
    inp.setAttribute('aria-label', (f ? f.name : which) + '（' + (r.sn || r.id) + '）');
    inp.oninput = function () { onValInput(r, which, inp, tr); };
    inp.onblur = function () { inp.value = hours(effective(r, which)); };
    add(td, inp);
    const err = state.failed[failKey(r.id, which)];
    if (err) add(td, el('div', 'yxp-err', truncate(err, 28)));
    return td;
  }

  // 编辑状态按「行 + 字段」两级存：state.edits[rowId] = { est?: 数值, act?: 数值 }
  // 只放真正改过的字段。失败原因按 rowId|字段 存，避免一行两个字段互相覆盖错误提示。
  const EDITABLE = [
    { which: 'est', mapKey: 'estimated', label: '预计工时' },
    { which: 'act', mapKey: 'actual', label: '实际工时' }
  ];

  function rawFieldOf(which) {
    const item = EDITABLE.filter(function (x) { return x.which === which; })[0];
    const fm = state.fieldMap || {};
    const f = item ? fm[item.mapKey] : null;
    return f && f.id ? { id: f.id, name: (f.name || item.label), label: item.label } : null;
  }

  // 预计 / 实际映射到了同一个字段 id：两列各自提交会对同一个字段连写两次，
  // api.saveWorkHours 每次只对自己那一次「读-写-复核」，两次都会报成功，
  // 云效上却只剩后写的那个值，先写的被静默吞掉。自动探测已经去过重（detect.js），
  // 这种错配只可能来自设置页手填，这里一律只保留「实际」列可编辑并给出提示。
  function fieldIdConflict() {
    const e = rawFieldOf('est');
    const a = rawFieldOf('act');
    return !!(e && a && e.id === a.id);
  }

  function fieldOf(which) {
    if (which === 'est' && fieldIdConflict()) return null;
    return rawFieldOf(which);
  }

  function canEditField(which) {
    return !!fieldOf(which);
  }

  function failKey(rowId, which) {
    return rowId + '|' + which;
  }

  function rowClass(r) {
    const anyFail = EDITABLE.some(function (x) { return state.failed[failKey(r.id, x.which)]; });
    if (anyFail) return 'failed';
    if (isDirty(r)) return 'edited';
    return isMissing(r) ? 'missing' : '';
  }

  function has(obj, k) {
    return Object.prototype.hasOwnProperty.call(obj, k);
  }

  function editsOf(r) {
    return has(state.edits, r.id) ? state.edits[r.id] : null;
  }

  function isDirty(r) {
    const e = editsOf(r);
    return !!e && Object.keys(e).length > 0;
  }

  function effective(r, which) {
    const e = editsOf(r);
    if (e && has(e, which)) return e[which];
    return Number(r[which]) || 0;
  }

  function setEdit(r, which, value) {
    let e = editsOf(r);
    if (value === null) {
      if (!e) return;
      delete e[which];
      if (!Object.keys(e).length) delete state.edits[r.id];
      return;
    }
    if (!e) { e = {}; state.edits[r.id] = e; }
    e[which] = value;
  }

  function onValInput(r, which, inp, tr) {
    const raw = String(inp.value || '').trim();
    if (raw === '') {
      setEdit(r, which, null);
    } else {
      const v = parseFloat(raw);
      if (!isFinite(v) || v < 0) return;          // 非法值先不记，失焦时会被回填
      // 存的精度必须和展示精度一致（hours() 只保留一位小数）：否则输入 1.25 会显示成
      // 1.3、确认弹窗也写 1.3，真正写进云效的却是 1.25，用户确认的和写入的不是同一个数。
      const rounded = Math.round(v * 10) / 10;
      const cur = Number(r[which]) || 0;
      // 实际工时只能加不能减（云效那边是登记记录累加，没有负登记）
      if (which === 'act' && rounded < cur) {
        toast('「实际工时」在云效里是工时登记的累加值，只能增加不能改小。要调小请到该工作项的「工时」页删掉对应的登记记录。', 'error');
        inp.value = hours(effective(r, which));
        return;
      }
      if (rounded === cur) setEdit(r, which, null);
      else setEdit(r, which, rounded);
    }
    delete state.failed[failKey(r.id, which)];
    // 失败提示是渲染时挂在这个单元格上的子节点，值一改就该跟着消失，
    // 否则用户改完还看着红字，会以为又失败了一次而重复提交
    const cell = inp.parentNode;
    const errNode = cell && cell.querySelector ? cell.querySelector('.yxp-err') : null;
    if (errNode && errNode.parentNode) errNode.parentNode.removeChild(errNode);
    tr.className = rowClass(r);
    // 补上预计工时后，「未填预计」卡片和警示条的数字要立刻跟着降
    if (which === 'est' && canWarnMissing()) renderOverview();
    renderEditBar();
    // fillable 的判据里有 effective(r,'act')，编辑单元格会直接改变可填条数，
    // 按钮的文案和禁用态必须跟着走（syncFillBtn 只改 textContent/title/disabled，不抢焦点）
    syncFillBtn();
  }

  function sortRows(rows) {
    const key = state.sortKey;
    const dir = state.sortDir === 'asc' ? 1 : -1;
    // 置顶只是分成「未填 / 已填」两段，各段内部仍按用户选的列排，不打乱排序语义
    const pinMissing = state.missingTop && canWarnMissing();
    const out = rows.slice();
    out.sort(function (a, b) {
      if (pinMissing) {
        const am = isMissing(a) ? 0 : 1;
        const bm = isMissing(b) ? 0 : 1;
        if (am !== bm) return am - bm;
      }
      const av = sortVal(a, key);
      const bv = sortVal(b, key);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'zh-Hans-CN') * dir;
    });
    return out;
  }

  function sortVal(r, key) {
    if (key === 'est') return effective(r, 'est');
    if (key === 'act') return effective(r, 'act');
    if (key === 'planEnd') return r.planEnd || '';
    return r[key] === null || r[key] === undefined ? '' : r[key];
  }

  /* ---------------------------------------------------------------- 改动条 / 提交 */

  function changedList() {
    const out = [];
    state.rows.forEach(function (r) {
      const e = editsOf(r);
      if (!e) return;
      EDITABLE.forEach(function (x) {
        if (!has(e, x.which)) return;
        const f = fieldOf(x.which);
        if (!f) return;                              // 字段没识别出来就不提交
        out.push({
          row: r, which: x.which, fieldId: f.id, fieldLabel: x.label,
          from: Number(r[x.which]) || 0, to: e[x.which]
        });
      });
    });
    return out;
  }

  /** 把所有写入失败的诊断信息整理成一段纯文本，方便直接贴给开发者定位 */
  function copyFailureReport() {
    const fm = state.fieldMap || {};
    const lines = [];
    lines.push('# 云效工时统计 · 写入失败诊断');
    lines.push('插件版本: ' + pluginVersion());
    lines.push('组织: ' + ((state.ctx && (state.ctx.orgName || state.ctx.orgId)) || '未知'));
    lines.push('字段映射: 预计=' + fieldSig(fm.estimated) + '  实际=' + fieldSig(fm.actual));
    lines.push('写入模式: ' + (isDryRun() ? '只读预演' : '真实写回'));
    lines.push('');
    Object.keys(state.failed).forEach(function (k) {
      const parts = String(k).split('|');
      const row = state.rows.filter(function (r) { return r.id === parts[0]; })[0];
      lines.push('- ' + (row ? (row.sn || row.id) : parts[0]) + '  [' + parts[1] + ']');
      lines.push('  ' + state.failed[k]);
      const detail = state.failedDetail && state.failedDetail[k];
      if (detail && detail.length) {
        detail.forEach(function (d) { lines.push('    · ' + d); });
      }
    });
    const text = lines.join('\n');
    U.copyText(text).then(function (okc) {
      if (okc) toast('失败详情已复制，可以直接粘贴发给开发者', 'success');
      else toast('复制失败，详情也打印在浏览器控制台里（F12 → Console）', 'error');
    });
  }

  function fieldSig(f) {
    return f && f.id ? (f.name || '?') + '#' + f.id : '（未识别）';
  }

  function pluginVersion() {
    try {
      return (chrome.runtime.getManifest() || {}).version || '?';
    } catch (e) {
      return '?';
    }
  }

  function renderEditBar() {
    if (!refs.editBar) return;
    const bar = clear(refs.editBar);
    const list = changedList();
    const failedCount = Object.keys(state.failed).length;

    if (!list.length && !failedCount && !state.submitting) {
      bar.classList.add('yxp-hidden');
      return;
    }
    bar.classList.remove('yxp-hidden');

    if (state.submitting) {
      const p = state.submitProgress || { done: 0, total: list.length };
      add(bar, el('span', '', '提交中 ' + p.done + '/' + p.total + '…'));
      return;
    }

    const dryRun = isDryRun();
    add(bar, el('strong', '', '已修改 ' + list.length + ' 条'));
    if (filterActive()) {
      const visibleIds = {};
      visibleRows().forEach(function (r) { visibleIds[r.id] = 1; });
      const hidden = list.filter(function (c) { return !visibleIds[c.row.id]; }).length;
      if (hidden) add(bar, el('span', 'yxp-status', '（其中 ' + hidden + ' 条不在当前筛选内，提交时一并写回）'));
    }
    if (failedCount) {
      add(bar, el('span', 'yxp-bad', '· ' + failedCount + ' 条提交失败'));
      // 写入端点是逆向出来的，失败时最有价值的就是云效原话和 traceId。
      // 让用户一键复制发出来，比让他去开 DevTools 现实得多。
      add(bar, btn('yxp-btn ghost yxp-tiny', '复制失败详情', copyFailureReport));
    }
    add(bar, el('span', 'yxp-status', dryRun
      ? (isStaleCtx()
        ? '· 身份是离线缓存，已强制只读预演（刷新确认组织后才能写回）'
        : '· 当前是只读预演模式（不会写回云效）')
      : '· 当前会真实写回云效'));
    add(bar, el('div', 'yxp-spacer'));
    const submitBtn = btn('yxp-btn primary', dryRun ? '提交（预演）' : '提交到云效', submitEdits);
    submitBtn.disabled = !list.length;
    add(bar, submitBtn);
    add(bar, btn('yxp-btn', '撤销全部', undoAll));
  }

  // 写入模式存在 prefs.dryRun（store.DEFAULTS 与设置页都用这个键），缺省一律按预演处理。
  // 另外：身份是降级缓存来的（ctx.stale）时一律按预演处理——那份 orgId 未必是当前页面的组织，
  // 字段 id 跨组织不通用，拿 A 组织的「实际工时」id 去写 B 组织的工作项会覆盖掉别的字段。
  function isDryRun() {
    if (state.ctx && state.ctx.stale) return true;
    return !state.prefs || state.prefs.dryRun !== false;
  }

  function isStaleCtx() {
    return !!(state.ctx && state.ctx.stale);
  }

  function undoAll() {
    state.edits = {};
    state.failed = {};
    renderTable();
  }

  /**
   * 一键填充的判据与来源值：实际工时（含本地未提交的改动）为 0，且云效上已经有预计工时。
   * 填充来源只认 r.est（云效上的现值），不认本地还没写回的预计工时——两个字段是各自
   * 独立提交的两次 saveWorkHours，没有事务关系，预计那条写失败时实际就会被填成一个
   * 从未落库的数（云效上变成「预计 0h、实际 8h」）。
   * 返回 0 表示这行不该填。
   */
  function fillableFrom(r) {
    const est = Number(r.est) || 0;
    if (est <= 0) return 0;
    if (effective(r, 'act') !== 0) return 0;
    return est;
  }

  function fillFromEstimated() {
    // 只填当前筛选下看得见的行。用 state.rows 会把用户根本看不到的行一起标脏并进入待提交列表，
    // 确认弹窗里滚几十行谁也不会逐条核对，真实写回是不可撤销的。
    const rows = visibleRows();
    let n = 0;
    let pendingEst = 0;   // 预计工时有本地未提交改动的候选行：填的是云效现值，不是屏幕上那个数
    rows.forEach(function (r) {
      const e = editsOf(r);
      const dirtyEst = !!(e && has(e, 'est'));
      const est = fillableFrom(r);
      if (!est) {
        if (dirtyEst && effective(r, 'act') === 0) pendingEst++;
        return;
      }
      if (dirtyEst) pendingEst++;
      setEdit(r, 'act', est);
      n++;
    });
    if (!n) {
      syncFillBtn();
      toast('没有需要填充的行（只填当前列表里实际工时为 0 且云效上已有预计工时的行）' +
        (pendingEst ? '；有 ' + pendingEst + ' 行的预计工时还没写回云效，不能当填充来源' : ''), 'info');
      return;
    }
    renderTable();
    toast('已按预计工时填充 ' + n + ' 条' + (filterActive() ? '（仅当前筛选）' : '') +
      '（本地改动，需要点「提交」才会写回）' +
      (pendingEst ? '；其中 ' + pendingEst + ' 行的预计工时有未提交改动，填的是云效上的现值' : ''), 'success');
  }

  /**
   * 确认弹窗里的「旧值 → 新值」。hours() 会四舍五入到一位小数，云效上的原值可能有更细的
   * 小数（别人写的 1.25），照 hours() 打会出现「1.3 → 1.3」这种看不出在改什么的行。
   * 只要任一边格式化后和真实数值对不上，就退回原始数值显示——弹窗里的数字必须就是要写的数字。
   */
  function changeText(from, to) {
    const a = hours(from);
    const b = hours(to);
    if (a === b || String(Number(from) || 0) !== a || String(Number(to) || 0) !== b) {
      return String(Number(from) || 0) + ' → ' + String(Number(to) || 0);
    }
    return a + ' → ' + b;
  }

  async function submitEdits() {
    const list = changedList();
    if (!list.length) return;
    // changedList 已经把「字段没识别出来」的改动过滤掉了，这里只做兜底
    if (!state.fieldMap) {
      toast('还没识别到工时字段，无法提交', 'error');
      return;
    }
    const dryRun = isDryRun();

    // 实际工时在云效里是「登记记录累加」，弹窗必须说清这次是「登记多少」，
    // 否则用户看到「0 → 7」会以为是赋值，下次改成 5 时预期完全错位。
    const actNote = list.some(function (c) { return c.which === 'act'; })
      ? '\n注意：「实际工时」在云效里是工时登记的累加值，这里会为你补登记差额（只能增加，不能改小）。'
      : '';
    const lines = list.map(function (c) {
      const base = '· ' + (c.row.sn || c.row.id) + ' ' + truncate(c.row.subject, 22) +
        '  [' + c.fieldLabel + '] ' + changeText(c.from, c.to);
      if (c.which !== 'act') return base;
      const d = Math.round((Number(c.to) - Number(c.from)) * 10) / 10;
      return base + '（登记 +' + hours(d) + 'h）';
    });
    const bodyText = '共 ' + list.length + ' 条改动，写入模式：' + (dryRun ? '只读预演（不会真正写回云效）' : '写回云效（不可撤销）') + '\n' + lines.join('\n') + actNote;

    // 标题必须说清这次到底要写哪几个字段：它是不可撤销写入前的第一眼信息，
    // 也是 confirmDialog 给读屏用的 aria-label（ui.js 用 title 当可访问名）。
    const labels = [];
    list.forEach(function (c) {
      if (labels.indexOf(c.fieldLabel) < 0) labels.push(c.fieldLabel);
    });
    const fieldsText = labels.join(' / ');

    let ok = false;
    try {
      ok = await NS.ui.confirmDialog(refs.root, {
        title: dryRun ? ('提交预演：' + fieldsText) : ('写回云效：' + fieldsText),
        body: bodyText,
        okText: dryRun ? '开始预演' : '确认写入',
        cancelText: '再想想',
        danger: !dryRun
      });
    } catch (e) {
      ok = false;
    }
    if (!ok) return;

    state.submitting = true;
    state.submitProgress = { done: 0, total: list.length };
    renderTable();

    let okCount = 0;
    let skipCount = 0;
    let failCount = 0;
    let unverifiedCount = 0;   // 写进去了但云效汇总还没刷新出来的条数
    const cachePatches = {};
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      let res = null;
      try {
        res = await NS.api.saveWorkHours(c.row.id, c.which, c.to, {
          dryRun: dryRun,
          fieldId: c.fieldId,                       // 只用于读原值与写后复核
          userId: state.ctx && state.ctx.userId
        });
      } catch (e) {
        res = { ok: false, error: errMsg(e) };
      }
      if (res && res.ok) {
        if (res.skipped) skipCount++;
        else okCount++;
        if (res.unverified) unverifiedCount++;
        delete state.failed[failKey(c.row.id, c.which)];
        // 预演不算真的写进去，改动要留在表里；真实写入才落地并只清掉这个字段的改动
        if (!dryRun && !res.dryRun) {
          c.row[c.which] = c.to;
          setEdit(c.row, c.which, null);
          const patch = cachePatches[c.row.id] || (cachePatches[c.row.id] = { id: c.row.id });
          patch[c.which] = c.to;
        }
      } else {
        failCount++;
        const fk = failKey(c.row.id, c.which);
        state.failed[fk] = (res && res.error) || '未知错误';
        if (!state.failedDetail) state.failedDetail = {};
        state.failedDetail[fk] = (res && res.attempts) || [];
      }
      state.submitProgress.done = i + 1;
      renderEditBar();
    }

    // 写回成功后同步所有包含这些工作项的本地快照。否则刷新页面会重新读到旧快照，
    // 用户还得再手动刷新一次才能看见刚刚由插件写入的值。
    const patchList = Object.keys(cachePatches).map(function (id) { return cachePatches[id]; });
    if (patchList.length) {
      try {
        await NS.store.patchRangeSnapshots(patchList);
        if (NS.summarybar && typeof NS.summarybar.refresh === 'function') NS.summarybar.refresh();
      } catch (e) {
        try { console.warn('[云效工时统计] 本地快照同步失败', e); } catch (ignored) {}
      }
    }

    state.submitting = false;
    state.submitProgress = null;
    renderTable();
    renderOverview();
    // 日历热力图的格子数字/色深/「工时不足」描边全部按 r.est 算，真实写入会就地改掉 r.est，
    // 不重绘就会出现「概览卡已经变了、日历还是旧数字」的同屏矛盾。
    renderCalendar();
    renderGroups();

    if (dryRun) {
      // 预演成功和真写成功长得太像，用户很容易以为已经写进去了，
      // 刷新后发现工时没了才回来问。所以：措辞先说「没写」，颜色也不用成功色，
      // 并且直接把「现在真写」这一步接上，不再打发人去设置页。
      await afterDryRun(okCount, skipCount, failCount);
    } else if (failCount) {
      toast('提交完成：成功 ' + okCount + ' 条，失败 ' + failCount + ' 条（失败的行已标红，可修改后重试）', 'error');
    } else if (unverifiedCount) {
      // 关键：这不是失败。云效工时汇总是异步算的，写完立刻读经常还是旧值。
      // 说成失败会诱导用户重试，而每重试一次就会在云效上多加一条工时记录。
      toast('已提交 ' + okCount + ' 条。其中 ' + unverifiedCount +
        ' 条云效的工时汇总还没刷新出来（这是云效的异步延迟，不是失败）。' +
        '过几秒刷新页面确认即可，千万不要重复提交——每提交一次就会多一条工时记录。', 'info');
    } else {
      toast('提交完成：成功 ' + okCount + ' 条' + (skipCount ? '，' + skipCount + ' 条值未变化' : ''), 'success');
    }
  }

  /**
   * 预演跑完之后的收尾：明确告诉用户「云效上什么都没变」，并给一个直接真写的出口。
   */
  async function afterDryRun(okCount, skipCount, failCount) {
    const parts = ['预演完成，**云效上的数据没有任何变化**。'];
    parts.push('可写入 ' + okCount + ' 条');
    if (skipCount) parts.push('无变化 ' + skipCount + ' 条');
    if (failCount) parts.push('失败 ' + failCount + ' 条');

    if (failCount || !okCount) {
      toast(parts.join(' · ') + (failCount ? '（失败的行已标红）' : ''), 'error');
      return;
    }

    // 身份是离线缓存时写入被强制禁用，这时候给「现在真写」按钮是骗人的
    if (isStaleCtx()) {
      toast('预演完成，未写入云效：当前身份是离线缓存，先点「刷新」确认组织后才能写回。', 'error');
      return;
    }

    let ok = false;
    try {
      ok = await NS.ui.confirmDialog(refs.root, {
        title: '预演通过 —— 但还没有写入云效',
        body: '刚才只是预演，云效上的工时一点都没改。\n\n' +
          '有 ' + okCount + ' 条可以写入。现在真正写回云效吗？\n' +
          '（写回后本次改动不可撤销；也可以到设置页把「写入模式」长期改成「允许写回云效」）',
        okText: '真正写回云效',
        cancelText: '先不写',
        danger: true
      });
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      toast('未写入云效。改动还留在表里，随时可以再提交。', 'info');
      return;
    }

    try {
      await NS.store.setPrefs({ dryRun: false });
      state.prefs = Object.assign({}, state.prefs, { dryRun: false });
    } catch (e) {
      toast('切换写入模式失败：' + errMsg(e), 'error');
      return;
    }
    // 改动还在 state.edits 里（预演不清空），这一次 isDryRun() 会返回 false，走真实写入
    await submitEdits();
  }

  /* ---------------------------------------------------------------- 底部工具条 */

  function copyMarkdown() {
    const rows = visibleRows();
    if (!rows.length) { toast('没有可复制的数据', 'info'); return; }
    let md = '';
    try {
      md = NS.stats.toMarkdown(rows, {
        groupKey: state.groupTab,
        start: state.start,
        end: state.end,
        title: '云效工时统计 ' + state.start + ' ~ ' + state.end
      });
    } catch (e) {
      toast('生成 Markdown 失败：' + errMsg(e), 'error');
      return;
    }
    U.copyText(md).then(function (okc) {
      if (okc) toast('已复制 ' + rows.length + ' 条（当前筛选）的 Markdown', 'success');
      else toast('复制失败，请手动选择内容复制', 'error');
    });
  }

  function exportCsv() {
    const rows = visibleRows();
    if (!rows.length) { toast('没有可导出的数据', 'info'); return; }
    try {
      const csv = NS.stats.toCsv(rows);
      U.downloadText('云效工时_' + state.start + '_' + state.end + '.csv', csv, 'text/csv;charset=utf-8');
      toast('已导出 ' + rows.length + ' 条', 'success');
    } catch (e) {
      toast('导出失败：' + errMsg(e), 'error');
    }
  }

  /**
   * content script 里 chrome.runtime.openOptionsPage 不一定存在（该 API 只在扩展页面暴露），
   * 所以按「直接调用 → 让 background 代开 → 兜底新窗口」三级降级。
   */
  function openOptions() {
    try {
      if (chrome && chrome.runtime && typeof chrome.runtime.openOptionsPage === 'function') {
        chrome.runtime.openOptionsPage();
        return;
      }
    } catch (e) { /* 继续降级 */ }
    try {
      const p = chrome.runtime.sendMessage({ type: 'YXWT_OPEN_OPTIONS' });
      if (p && typeof p.catch === 'function') p.catch(function () {});
      return;
    } catch (e) { /* 继续降级 */ }
    try {
      window.open(chrome.runtime.getURL('options.html'), '_blank', 'noopener');
    } catch (e) {
      toast('打不开设置页，请到扩展管理里手动打开', 'error');
    }
  }

  /* ---------------------------------------------------------------- 从当前视图导入同事 */

  // 视图 filter -> conditionGroups 统一走 api.viewFilterToGroups（曾经 panel/summarybar 各写一份，行为不一致）
  const viewFilterToGroups = function (f) { return NS.api.viewFilterToGroups(f); };

  async function currentPageQuery() {
    const pm = /\/projex\/project\/([0-9a-zA-Z]+)/.exec(location.pathname || '');
    if (pm) {
      return { spaceType: 'Project', spaceIdentifier: pm[1], category: '', conditionGroups: [[]] };
    }
    const vm = /viewIdentifier=([0-9a-zA-Z_-]+)/.exec(location.hash || '');
    if (vm) {
      const view = await NS.api.getView(vm[1]);
      if (!view) return null;
      // 内置视图（我负责的 / 近期我参与 / 待我验证…）的 spaceIdentifier 是字面量 'system'，
      // 原样拿去查会恒返回 0 条、然后提示「这一页没扫到负责人」。统一走 api.normalizeViewSpace
      // 回落到当前用户（summarybar 也用同一个函数，避免再漏第三处）。
      const space = NS.api.normalizeViewSpace(view, state.ctx && state.ctx.userId);
      const q = {
        spaceType: space.spaceType,
        spaceIdentifier: space.spaceIdentifier,
        category: '',
        conditionGroups: viewFilterToGroups(view.filter)
      };
      if (space.scope !== undefined) q.scope = space.scope;
      return q;
    }
    return null;
  }

  async function importColleagues() {
    // store 的通讯录按 orgId 分桶，orgId 为空时写不进去，别给用户一个假的成功提示
    if (!state.ctx || !state.ctx.orgId) { toast('还没识别到当前组织，先点刷新', 'error'); return; }
    if (state.importing) return;
    // 这一步要翻最多 3 页 × 200 条，实测十几秒。不给加载态用户会以为按钮没反应、反复猛点。
    state.importing = true;
    setImportBtnBusy(true);
    try {
      const q = await currentPageQuery();
      if (!q) {
        toast('当前页面不是工作项列表页或项目页，先切到列表页再导入', 'error');
        return;
      }
      const res = await NS.api.listWorkitems(Object.assign({ pageSize: 200, maxPages: 3 }, q));
      const users = [];
      const seen = {};
      (res.items || []).forEach(function (it) {
        const a = it && it.assignedTo;
        const id = a && a.identifier;
        if (!id || seen[id]) return;
        seen[id] = 1;
        users.push(a);
      });
      if (!users.length) {
        toast('这一页没扫到负责人', 'info');
        return;
      }
      // 通讯录里把自己也存着无妨，但成员选择器不展示自己（buildMemberPicker 会跳过 selfId），
      // 所以提示必须按「除我之外的人数」报，否则个人视图下会出现「已导入 1 位同事」+ 列表仍是空的
      const selfId = String((state.ctx && state.ctx.userId) || '');
      const others = users.filter(function (u) { return String(u && u.identifier) !== selfId; });
      await NS.store.addContacts(state.ctx.orgId, users);
      state.contacts = (await NS.store.getContacts(state.ctx.orgId)) || {};
      state.contactsSig = contactsSig(state.contacts);
      invalidateMemberPicker();
      renderFilters();
      if (!others.length) {
        toast('当前视图里只有你自己的工作项，没导入到同事。换成项目工作项列表页或含他人任务的视图再试。', 'info');
        return;
      }
      toast('已导入 ' + others.length + ' 位同事到通讯录', 'success');
    } catch (e) {
      toast('导入失败：' + errMsg(e), 'error');
    } finally {
      state.importing = false;
      setImportBtnBusy(false);
    }
  }

  function setImportBtnBusy(busy) {
    const b = refs.importBtn;
    if (!b) return;
    b.disabled = !!busy;
    b.textContent = busy ? '正在扫描当前视图…' : '从当前视图导入同事';
  }

  NS.panel = {
    toggle: toggle,
    open: open,
    close: close,
    isOpen: isOpen
  };
})();
