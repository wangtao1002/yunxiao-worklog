// ==UserScript==
// @name         云效工时统计
// @namespace    https://devops.aliyun.com/
// @version      0.3.2
// @description  在阿里云云效 Projex 里一键统计工时：列表合计、日历热力图、团队对比、导出日报周报。所有数据只在本地处理。
// @author       abner
// @license      MIT
// @match        https://devops.aliyun.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* 由 tools/build-userscript.py 从 Chrome 扩展源码生成，请勿直接编辑。
   改代码请改 src/ 下的文件，然后重新跑一次构建。 */

(function (chrome) {
  'use strict';

  window.YXWT = window.YXWT || {};
  window.YXWT.__version = "0.3.2";
  window.YXWT.__optionsHtml = "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><title>云效工时统计 · 设置<\/title><style>\n  *, *::before, *::after { box-sizing: border-box; }\n\n  :root {\n    --bg: #f4f6fa;\n    --bg-soft: #edf1f8;\n    --card: #ffffff;\n    --border: #e2e8f2;\n    --border-strong: #ccd6e6;\n    --text: #17202c;\n    --muted: #66738a;\n    --accent: #2f6bff;\n    --accent-ink: #ffffff;\n    --accent-soft: rgba(47, 107, 255, .10);\n    --danger: #cf3438;\n    --danger-soft: rgba(207, 52, 56, .09);\n    --ok: #1c8b52;\n    --shadow: 0 1px 2px rgba(16, 24, 40, .05), 0 10px 28px rgba(16, 24, 40, .06);\n    --radius: 12px;\n  }\n\n  @media (prefers-color-scheme: dark) {\n    :root:not([data-theme=\"light\"]) {\n      --bg: #0e1118;\n      --bg-soft: #151a24;\n      --card: #161b25;\n      --border: #262d3b;\n      --border-strong: #3a4457;\n      --text: #e7ecf4;\n      --muted: #8d99ad;\n      --accent: #6d9bff;\n      --accent-ink: #0e1118;\n      --accent-soft: rgba(109, 155, 255, .14);\n      --danger: #ff6f72;\n      --danger-soft: rgba(255, 111, 114, .13);\n      --ok: #4ecb8a;\n      --shadow: 0 1px 2px rgba(0, 0, 0, .45), 0 12px 32px rgba(0, 0, 0, .35);\n    }\n  }\n\n  :root[data-theme=\"dark\"] {\n    --bg: #0e1118;\n    --bg-soft: #151a24;\n    --card: #161b25;\n    --border: #262d3b;\n    --border-strong: #3a4457;\n    --text: #e7ecf4;\n    --muted: #8d99ad;\n    --accent: #6d9bff;\n    --accent-ink: #0e1118;\n    --accent-soft: rgba(109, 155, 255, .14);\n    --danger: #ff6f72;\n    --danger-soft: rgba(255, 111, 114, .13);\n    --ok: #4ecb8a;\n    --shadow: 0 1px 2px rgba(0, 0, 0, .45), 0 12px 32px rgba(0, 0, 0, .35);\n  }\n\n  html { color-scheme: light dark; }\n\n  body {\n    margin: 0;\n    background: var(--bg);\n    color: var(--text);\n    font-family: -apple-system, \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif;\n    font-size: 14px;\n    line-height: 1.55;\n    -webkit-font-smoothing: antialiased;\n  }\n\n  code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }\n  .num, input[type=\"number\"] { font-variant-numeric: tabular-nums; }\n\n  .wrap { max-width: 920px; margin: 0 auto; padding: 34px 20px 72px; }\n\n  /* 顶部 */\n  .hd { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }\n  .hd .logo { width: 42px; height: 42px; flex: none; border-radius: 11px; box-shadow: var(--shadow); }\n  .hd h1 { margin: 0; font-size: 19px; font-weight: 650; letter-spacing: .2px; }\n  .hd .sub { margin: 3px 0 0; font-size: 12.5px; color: var(--muted); }\n  .hd .ver {\n    margin-left: auto; font-size: 12px; color: var(--muted);\n    border: 1px solid var(--border); border-radius: 999px; padding: 3px 10px; background: var(--card);\n  }\n\n  /* 卡片 */\n  .card {\n    background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);\n    box-shadow: var(--shadow); padding: 6px 22px 20px; margin-bottom: 18px;\n  }\n  .card > h2 {\n    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;\n    margin: 0; padding: 16px 0 12px; font-size: 14.5px; font-weight: 650;\n  }\n  .card > h2 .tools { margin-left: auto; display: flex; gap: 8px; }\n  .card > h2::before {\n    content: \"\"; width: 3px; height: 14px; border-radius: 2px; background: var(--accent); flex: none;\n  }\n  .card.danger { border-color: color-mix(in srgb, var(--danger) 40%, var(--border)); }\n  .card.danger > h2::before { background: var(--danger); }\n  .hint { margin: 0 0 14px; font-size: 12.5px; color: var(--muted); }\n\n  /* 设置行 */\n  .row {\n    display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 18px;\n    align-items: center; padding: 13px 0; border-top: 1px solid var(--border);\n  }\n  .row.top { align-items: start; }\n  .lb { font-size: 13px; font-weight: 600; }\n  .lb small { display: block; margin-top: 3px; font-size: 12px; font-weight: 400; color: var(--muted); }\n\n  input[type=\"text\"], input[type=\"number\"], select {\n    width: 100%; max-width: 320px; padding: 7px 10px; font: inherit; font-size: 13px;\n    color: var(--text); background: var(--bg-soft);\n    border: 1px solid var(--border-strong); border-radius: 8px; outline: none;\n  }\n  input[type=\"number\"] { max-width: 130px; }\n  input[type=\"text\"]:focus, input[type=\"number\"]:focus, select:focus {\n    border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--card);\n  }\n  input[type=\"checkbox\"], input[type=\"radio\"] { accent-color: var(--accent); width: 15px; height: 15px; margin: 0; }\n  .check { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; }\n  .unit { margin-left: 8px; font-size: 12.5px; color: var(--muted); }\n  .field { display: flex; align-items: center; }\n\n  .metric-picks { display: flex; flex-wrap: wrap; gap: 8px; max-width: 620px; }\n  .metric-pick {\n    display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px;\n    border: 1px solid var(--border-strong); border-radius: 8px; background: var(--bg-soft);\n    font-size: 12.5px; cursor: pointer; user-select: none;\n  }\n  .metric-pick.on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }\n  .metric-pick.fixed { cursor: default; }\n  .metric-pick .required { font-size: 10.5px; color: var(--muted); }\n  .metric-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 9px; }\n  .metric-note { color: var(--muted); font-size: 12px; }\n\n  .radios { display: flex; flex-direction: column; gap: 9px; }\n  .radios label { display: inline-flex; align-items: flex-start; gap: 9px; cursor: pointer; font-size: 13px; }\n  .radios label span small { display: block; color: var(--muted); font-size: 12px; }\n  .warn {\n    margin-top: 4px; padding: 10px 12px; border: 1px solid var(--danger);\n    background: var(--danger-soft); color: var(--danger);\n    border-radius: 9px; font-size: 12.5px; line-height: 1.65;\n  }\n  .warn strong { font-weight: 650; }\n  /* 读取本地设置失败时整块表单锁死，避免呈现一个「看着能改、其实存不进去」的界面 */\n  .is-disabled { opacity: .5; }\n  [hidden] { display: none !important; }\n\n  /* 按钮 */\n  .btn {\n    font: inherit; font-size: 12.5px; padding: 6px 13px; border-radius: 8px; cursor: pointer;\n    border: 1px solid var(--border-strong); background: var(--card); color: var(--text);\n    transition: background .12s, border-color .12s, opacity .12s;\n  }\n  .btn:hover { border-color: var(--accent); color: var(--accent); }\n  .btn:disabled { opacity: .5; cursor: default; border-color: var(--border-strong); color: var(--muted); }\n  .btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }\n  .btn.primary:hover { opacity: .88; color: var(--accent-ink); }\n  .btn.danger { border-color: var(--danger); color: var(--danger); background: transparent; }\n  .btn.danger:hover { background: var(--danger-soft); }\n  .btn.sm { padding: 3px 9px; font-size: 12px; border-radius: 7px; }\n  .btn.link { border: 0; background: none; color: var(--muted); padding: 3px 6px; }\n  .btn.link:hover { color: var(--danger); }\n\n  /* 组织块（字段映射 / 通讯录共用） */\n  .org { border: 1px solid var(--border); border-radius: 10px; background: var(--bg-soft); padding: 14px 16px; margin-bottom: 14px; }\n  .org:last-child { margin-bottom: 0; }\n  .org-hd { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-bottom: 12px; }\n  .org-hd .oid { font-size: 12px; color: var(--muted); word-break: break-all; }\n  .tag {\n    font-size: 11px; padding: 1px 8px; border-radius: 999px;\n    border: 1px solid var(--border-strong); color: var(--muted); background: var(--card); white-space: nowrap;\n  }\n  .tag.on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }\n  .org-hd .sp { margin-left: auto; display: flex; gap: 8px; }\n\n  .fm-row { display: grid; grid-template-columns: 116px minmax(0, 1fr) minmax(0, 1fr); gap: 10px; align-items: center; margin-bottom: 8px; }\n  .fm-row .k { font-size: 12.5px; font-weight: 600; }\n  .fm-row .k small { display: block; font-weight: 400; font-size: 11.5px; color: var(--muted); }\n  .fm-row input { max-width: none; background: var(--card); }\n  .fm-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; }\n  .fm-foot .note { font-size: 12px; color: var(--muted); }\n\n  .people { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; }\n  .person { display: flex; align-items: center; gap: 10px; padding: 7px 9px; border: 1px solid var(--border); border-radius: 10px; background: var(--card); }\n  .avatar {\n    width: 28px; height: 28px; flex: none; border-radius: 50%; object-fit: cover;\n    background: var(--accent-soft); color: var(--accent);\n    display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 650;\n  }\n  .person .who { min-width: 0; flex: 1; }\n  .person .nm { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n  .person .uid { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n\n  .empty {\n    padding: 18px; border: 1px dashed var(--border-strong); border-radius: 10px;\n    color: var(--muted); font-size: 12.5px; text-align: center;\n  }\n\n  /* 页脚 */\n  .foot { margin-top: 26px; font-size: 12px; color: var(--muted); }\n  .foot details { margin-top: 8px; border: 1px solid var(--border); border-radius: 10px; background: var(--card); padding: 0 14px; }\n  .foot summary { cursor: pointer; padding: 10px 0; font-size: 12.5px; color: var(--text); }\n  .foot details p { margin: 0 0 12px; line-height: 1.7; }\n\n  /* toast */\n  .toast {\n    position: fixed; left: 50%; bottom: 26px; transform: translate(-50%, 14px);\n    padding: 9px 18px; border-radius: 999px; font-size: 13px;\n    background: var(--card); color: var(--text); border: 1px solid var(--border-strong);\n    box-shadow: var(--shadow); opacity: 0; pointer-events: none;\n    transition: opacity .16s ease, transform .16s ease; z-index: 2147483000;\n  }\n  .toast.show { opacity: 1; transform: translate(-50%, 0); }\n  .toast.success { border-color: var(--ok); color: var(--ok); }\n  .toast.error { border-color: var(--danger); color: var(--danger); }\n\n  /* 确认弹窗 */\n  .mask {\n    position: fixed; inset: 0; background: rgba(9, 12, 18, .48);\n    display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 2147483001;\n  }\n  .dialog {\n    width: 100%; max-width: 400px; background: var(--card); color: var(--text);\n    border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px;\n  }\n  .dialog h3 { margin: 0 0 8px; font-size: 15px; font-weight: 650; }\n  .dialog p { margin: 0 0 18px; font-size: 13px; color: var(--muted); line-height: 1.65; }\n  .dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }\n\n  @media (max-width: 680px) {\n    .row { grid-template-columns: 1fr; gap: 8px; }\n    .fm-row { grid-template-columns: 1fr; }\n    .fm-row .k { margin-top: 4px; }\n  }\n<\/style><\/head><body>\n<div class=\"wrap\">\n\n  <header class=\"hd\">\n    <svg class=\"logo\" viewBox=\"0 0 48 48\" aria-hidden=\"true\">\n      <defs>\n        <linearGradient id=\"lg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#4d84ff\"/>\n          <stop offset=\"1\" stop-color=\"#1b47cf\"/>\n        <\/linearGradient>\n      <\/defs>\n      <rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" rx=\"11\" fill=\"url(#lg)\"/>\n      <rect x=\"11\" y=\"27\" width=\"6\" height=\"11\" rx=\"2\" fill=\"#fff\" opacity=\".82\"/>\n      <rect x=\"21\" y=\"20\" width=\"6\" height=\"18\" rx=\"2\" fill=\"#fff\" opacity=\".92\"/>\n      <rect x=\"31\" y=\"12\" width=\"6\" height=\"26\" rx=\"2\" fill=\"#fff\"/>\n    <\/svg>\n    <div>\n      <h1>云效工时统计<\/h1>\n      <p class=\"sub\">本地设置 · 所有数据只保存在这台浏览器里<\/p>\n    <\/div>\n    <span class=\"ver\" id=\"ver\">v-<\/span>\n  <\/header>\n\n  <div class=\"warn\" id=\"fatal\" hidden><\/div>\n\n  <section class=\"card general\" id=\"general\">\n    <h2>常规设置<\/h2>\n\n    <div class=\"row\">\n      <div class=\"lb\">每日标准工时<small>用于日历热力图判断某天工时是否不足<\/small><\/div>\n      <div class=\"field\">\n        <input type=\"number\" id=\"dailyTargetHours\" min=\"0\" max=\"24\" step=\"0.5\" class=\"num\">\n        <span class=\"unit\">小时 / 天<\/span>\n      <\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">默认归集口径<small>把一个工作项算到哪一天头上<\/small><\/div>\n      <div><select id=\"dateBasis\"><\/select><\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">任务状态范围<small>全部任务，或仅统计云效已标记完成的任务<\/small><\/div>\n      <div><select id=\"taskScope\"><\/select><\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">达标工时口径<small>“工时偏差”和“截止今日工时偏差”拿哪组工时与工作日目标比较<\/small><\/div>\n      <div>\n        <select id=\"workDiffBasis\"><\/select>\n        <div class=\"hint\" id=\"workDiffBasisHint\"><\/div>\n      <\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">默认时间范围<small>悬浮统计和打开面板时默认使用的区间<\/small><\/div>\n      <div><select id=\"defaultRange\"><\/select><\/div>\n    <\/div>\n\n    <div class=\"row top\">\n      <div class=\"lb\">悬浮条显示项<small>不选择时沿用当前默认样式；自定义后「范围」固定显示<\/small><\/div>\n      <div>\n        <div class=\"metric-picks\" id=\"summaryBarItems\"><\/div>\n        <div class=\"metric-foot\">\n          <span class=\"metric-note\" id=\"summaryBarItemsNote\"><\/span>\n          <button class=\"btn sm\" id=\"summaryBarItemsReset\" type=\"button\" hidden>恢复默认显示<\/button>\n        <\/div>\n      <\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">排除已取消<small>状态名里带「取消」的工作项不计入统计<\/small><\/div>\n      <div><label class=\"check\"><input type=\"checkbox\" id=\"excludeCancelled\"><span>统计时排除已取消的工作项<\/span><\/label><\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">统计展示口径<small>热力图、日均工时、未填提醒和分组排序拿哪个字段当基准<\/small><\/div>\n      <div>\n        <select id=\"hoursBasis\"><\/select>\n        <div class=\"hint\" id=\"hoursBasisHint\"><\/div>\n      <\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">未填工时提醒<small>统计范围里没填工时的任务标红、置顶，合计条上也会显示条数<\/small><\/div>\n      <div><label class=\"check\"><input type=\"checkbox\" id=\"warnMissingEst\"><span>提醒没填工时的任务（按上面的统计展示口径）<\/span><\/label><\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">列表页合计条<small>在云效工作项列表页底部常驻一条合计<\/small><\/div>\n      <div><label class=\"check\"><input type=\"checkbox\" id=\"showSummaryBar\"><span>显示列表页合计条<\/span><\/label><\/div>\n    <\/div>\n\n    <div class=\"row\">\n      <div class=\"lb\">主题<\/div>\n      <div><select id=\"theme\"><\/select><\/div>\n    <\/div>\n\n    <div class=\"row top\">\n      <div class=\"lb\">写入模式<small>面板里批量修改工时（「预计工时」/「实际工时」两列）时如何处理<\/small><\/div>\n      <div class=\"radios\">\n        <label>\n          <input type=\"radio\" name=\"writeMode\" value=\"dryRun\">\n          <span>只读预演（dry-run）<small>只显示「旧值 → 新值」，不向云效发送任何写请求。推荐。<\/small><\/span>\n        <\/label>\n        <label>\n          <input type=\"radio\" name=\"writeMode\" value=\"live\">\n          <span>允许写回云效<small>确认后逐条写入云效的工作项字段。<\/small><\/span>\n        <\/label>\n        <div class=\"warn\" id=\"live-warn\" hidden>\n          <strong>注意：写回云效不可撤销。<\/strong>\n          云效的字段写入接口是从前端脚本里扫出来的，官方未公开，行为可能随云效改版变化。\n          插件会「先读原值 → 写入 → 再读复核」并逐条列出改动，但仍请先在少量工作项上验证，\n          确认无误后再批量提交。误写的值需要你自己在云效里改回来。\n        <\/div>\n      <\/div>\n    <\/div>\n  <\/section>\n\n  <section class=\"card\">\n    <h2>\n      工时字段映射\n      <span class=\"tools\"><button class=\"btn\" id=\"btn-redetect\" type=\"button\">重新探测<\/button><\/span>\n    <\/h2>\n    <p class=\"hint\">\n      工时字段的 identifier 每个企业都不一样，插件会在云效页面里自动探测并缓存到本地。\n      本页是扩展页面，无法直接访问云效接口，所以这里只展示已缓存的结果；\n      「重新探测」会通知一个已打开的云效标签页重新探测。手动保存后的映射标记为「手动」，自动探测不会再覆盖它。\n    <\/p>\n    <div id=\"fieldmaps\"><\/div>\n  <\/section>\n\n  <section class=\"card\">\n    <h2>通讯录<\/h2>\n    <p class=\"hint\">\n      云效没有可用的成员搜索接口，团队统计的同事名单靠面板里的「从当前视图导入同事」逐步积累。\n      这里可以删掉不再需要的人。\n    <\/p>\n    <div id=\"contacts\"><\/div>\n  <\/section>\n\n  <section class=\"card danger\">\n    <h2>危险区<\/h2>\n    <p class=\"hint\">清除后字段映射需要重新探测，通讯录需要重新积累，偏好设置回到默认值。云效上的数据不受影响。<\/p>\n    <button class=\"btn danger\" id=\"btn-clear\" type=\"button\">清除全部本地数据<\/button>\n  <\/section>\n\n  <footer class=\"foot\">\n    <span id=\"foot-ver\">云效工时统计<\/span>\n    <details>\n      <summary>隐私说明<\/summary>\n      <p>\n        本插件不收集、不上传任何数据，也没有任何埋点或远程配置。\n        所有统计都在你的浏览器里完成，网络请求只发往你正在使用的云效（devops.aliyun.com）；\n        设置、字段映射和通讯录只保存在浏览器本地的 chrome.storage.local 里，\n        随时可以用上面的「清除全部本地数据」删掉。插件不含任何第三方脚本或远程资源。\n      <\/p>\n    <\/details>\n  <\/footer>\n\n<\/div>\n\n<div class=\"toast\" id=\"toast\" role=\"status\" aria-live=\"polite\"><\/div>\n\n<div class=\"mask\" id=\"mask\" hidden>\n  <div class=\"dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"m-title\">\n    <h3 id=\"m-title\"><\/h3>\n    <p id=\"m-body\"><\/p>\n    <div class=\"dlg-actions\">\n      <button class=\"btn\" id=\"m-cancel\" type=\"button\">取消<\/button>\n      <button class=\"btn primary\" id=\"m-ok\" type=\"button\">确定<\/button>\n    <\/div>\n  <\/div>\n<\/div>\n\n\n\n\n<\/body><\/html>";

  // ---- options.js（原文照搬，只把 window / document 从全局改成形参）----
  window.YXWT.__optionsApp = function (window, document) {

  'use strict';

  const store = window.YXWT && window.YXWT.store;
  const summaryItems = window.YXWT && window.YXWT.summaryItems;

  const YX_PREFIX = 'https://devops.aliyun.com/';
  const YX_MATCH = 'https://devops.aliyun.com/*';

  const BASIS_OPTIONS = [
    ['planEnd', '计划完成时间'],
    ['finishTime', '实际完成时间'],
    ['planStart', '计划开始时间']
  ];
  const TASK_SCOPE_OPTIONS = [
    ['all', '全部任务（默认）'],
    ['completed', '仅已完成']
  ];
  const WORK_DIFF_BASIS_OPTIONS = [
    ['max', '预计 / 实际逐任务取较大值（默认）'],
    ['estimated', '预计工时'],
    ['actual', '实际工时']
  ];
  const WORK_DIFF_BASIS_HINTS = {
    max: '每个任务分别比较预计和实际工时，取较大值后再合计；适合两种工时并非每条都同时填写的情况。',
    estimated: '只用预计工时合计值与工作日目标比较。',
    actual: '只用实际工时合计值与工作日目标比较。'
  };
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
  // 注意：fillSelect 吃的是 [value, label] 数组对，不是对象 —— 写成对象会渲染出一排空白选项
  const HOURS_BASIS_OPTIONS = [
    ['estimated', '预计工时（默认）'],
    ['actual', '实际工时'],
    ['both', '两者都看']
  ];

  // 「实际工时」在云效里是工时登记的累加值，团队不用工时登记的话这一列全是 0，
  // 选了会比不选还难看 —— 这句必须写在设置页上，别让人选完才发现。
  const BASIS_HINTS = {
    estimated: '按「预计工时」字段统计。适合排期驱动、靠计划工时管理进度的团队。',
    actual: '按「实际工时」字段统计。注意：云效里它是工时登记的累加值，团队没在用工时登记的话这一列会全是 0。',
    both: '两个字段都要用。日均会显示两个数，未填提醒只要缺一个就标红；工作日偏差由“达标工时口径”单独控制。'
  };

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

  function renderSummaryBarItems(prefs) {
    const p = prefs || {};
    const box = $('summaryBarItems');
    if (!box || !summaryItems) return;
    box.textContent = '';

    const selected = summaryItems.normalize(p.summaryBarItems, p.defaultRange, p.hoursBasis);
    const chosen = Object.create(null);
    selected.forEach(function (key) { chosen[key] = true; });

    summaryItems.available(p.defaultRange, p.hoursBasis).forEach(function (item) {
      const input = el('input', { type: 'checkbox', value: item.key });
      input.checked = !!chosen[item.key];
      const fixed = item.key === 'range' && selected.length > 0;
      input.disabled = fixed;

      const label = el('label', { class: 'metric-pick' + (input.checked ? ' on' : '') + (fixed ? ' fixed' : '') });
      label.appendChild(input);
      label.appendChild(el('span', { text: item.label }));
      if (fixed) label.appendChild(el('span', { class: 'required', text: '必显' }));
      box.appendChild(label);

      input.addEventListener('change', function () {
        const values = [];
        const nodes = box.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < nodes.length; i++) if (nodes[i].checked) values.push(nodes[i].value);
        const next = summaryItems.normalize(values, p.defaultRange, p.hoursBasis);
        savePrefs({ summaryBarItems: next }).then(function (cfg) {
          renderSummaryBarItems((cfg || state.cfg).prefs);
        });
      });
    });

    const reset = $('summaryBarItemsReset');
    const note = $('summaryBarItemsNote');
    if (reset) reset.hidden = selected.length === 0;
    if (note) {
      note.textContent = selected.length
        ? '已自定义显示 ' + selected.length + ' 项；范围为必显项。'
        : '未选择：沿用当前统计展示口径对应的默认样式。';
    }
  }

  function fillGeneral(cfg) {
    const p = cfg.prefs;
    $('dailyTargetHours').value = String(p.dailyTargetHours);
    $('dateBasis').value = p.dateBasis;
    $('taskScope').value = p.taskScope === 'completed' ? 'completed' : 'all';
    $('workDiffBasis').value = p.workDiffBasis === 'estimated' || p.workDiffBasis === 'actual'
      ? p.workDiffBasis : 'max';
    $('workDiffBasisHint').textContent = WORK_DIFF_BASIS_HINTS[$('workDiffBasis').value] || '';
    $('defaultRange').value = p.defaultRange;
    $('theme').value = p.theme;
    $('excludeCancelled').checked = !!p.excludeCancelled;
    $('hoursBasis').value = p.hoursBasis || 'estimated';
    $('hoursBasisHint').textContent = BASIS_HINTS[$('hoursBasis').value] || '';
    $('warnMissingEst').checked = p.warnMissingEst !== false;
    $('showSummaryBar').checked = !!p.showSummaryBar;
    renderSummaryBarItems(p);
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
    $('taskScope').addEventListener('change', function () {
      savePrefs({ taskScope: this.value });
    });
    $('workDiffBasis').addEventListener('change', function () {
      $('workDiffBasisHint').textContent = WORK_DIFF_BASIS_HINTS[this.value] || '';
      savePrefs({ workDiffBasis: this.value });
    });
    $('defaultRange').addEventListener('change', function () {
      const select = this;
      const before = state.cfg && state.cfg.prefs ? state.cfg.prefs : {};
      const nextItems = summaryItems.normalize(before.summaryBarItems, select.value, before.hoursBasis);
      savePrefs({ defaultRange: select.value, summaryBarItems: nextItems }).then(function (cfg) {
        if (!cfg) select.value = before.defaultRange || 'thisWeek';
        renderSummaryBarItems((cfg || state.cfg).prefs);
      });
    });
    $('summaryBarItemsReset').addEventListener('click', function () {
      savePrefs({ summaryBarItems: [] }).then(function (cfg) {
        renderSummaryBarItems((cfg || state.cfg).prefs);
      });
    });
    $('theme').addEventListener('change', function () {
      applyTheme(this.value);
      savePrefs({ theme: this.value });
    });
    $('excludeCancelled').addEventListener('change', function () {
      savePrefs({ excludeCancelled: this.checked });
    });
    $('hoursBasis').addEventListener('change', function () {
      $('hoursBasisHint').textContent = BASIS_HINTS[this.value] || '';
      const next = this.value;
      const before = state.cfg && state.cfg.prefs ? state.cfg.prefs : {};
      const nextItems = summaryItems.normalize(before.summaryBarItems, before.defaultRange, next);
      savePrefs({ hoursBasis: next, summaryBarItems: nextItems }).then(function (cfg) {
        renderSummaryBarItems((cfg || state.cfg).prefs);
      });
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
    fillSelect($('taskScope'), TASK_SCOPE_OPTIONS);
    fillSelect($('workDiffBasis'), WORK_DIFF_BASIS_OPTIONS);
    fillSelect($('hoursBasis'), HOURS_BASIS_OPTIONS);
    fillSelect($('defaultRange'), RANGE_OPTIONS);
    fillSelect($('theme'), THEME_OPTIONS);

    if (!store || !summaryItems) {
      fatal('本地设置模块加载失败，设置页无法工作。请在 chrome://extensions 里重新加载本插件。');
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

  };

  /* ================= src/gm-shim.js ================= */
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


  /* ================= src/util.js ================= */
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


  /* ================= src/summary-items.js ================= */
/**
 * YXWT.summaryItems —— 悬浮统计可显示的概览指标目录与时间范围过滤规则。
 * 纯逻辑模块：设置页和悬浮条共用，避免两边各维护一份后逐渐不一致。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});
  const CURRENT_RANGES = { thisWeek: true, thisMonth: true };
  const ITEMS = [
    { key: 'range', label: '范围', shortLabel: '范围' },
    { key: 'count', label: '任务数', shortLabel: '条数' },
    // needs：这个指标依赖哪个工时字段。统计口径只用其中一个时，另一边的指标不该出现在浮标上
    { key: 'estimated', label: '预计工时', shortLabel: '预计', needs: 'est' },
    { key: 'actual', label: '实际工时', shortLabel: '实际', needs: 'act' },
    { key: 'diff', label: '偏差', shortLabel: '偏差', needs: 'both' },
    { key: 'avgPerDay', label: '日均工时', shortLabel: '日均' },
    { key: 'overdueRate', label: '逾期率', shortLabel: '逾期率' },
    // 名字跟着统计口径走：用实际工时统计的团队，「未填预计」对他们是另一回事
    { key: 'missingEst', label: '未填预计', shortLabel: '未填预计',
      labelByBasis: { actual: '未填实际', both: '未填工时' } },
    { key: 'workdayTotal', label: '工作日总工时', shortLabel: '工作日总工时' },
    { key: 'workdayDiff', label: '工时偏差', shortLabel: '工时偏差' },
    { key: 'throughToday', label: '截止今日工时', shortLabel: '截止今日工时', currentOnly: true },
    { key: 'throughTodayDiff', label: '截止今日工时偏差', shortLabel: '截止今日工时偏差', currentOnly: true }
  ];

  function basisAllows(item, basis) {
    if (!item.needs) return true;
    const b = basis === 'actual' || basis === 'both' ? basis : 'estimated';
    if (item.needs === 'both') return b === 'both';           // 偏差＝两者相减，只有都用时才成立
    if (item.needs === 'act') return b === 'actual' || b === 'both';
    return b === 'estimated' || b === 'both';
  }

  function available(rangeKey, basis) {
    const current = !!CURRENT_RANGES[String(rangeKey || '')];
    const b = basis === 'actual' || basis === 'both' ? basis : 'estimated';
    return ITEMS.filter(function (item) {
      return (!item.currentOnly || current) && basisAllows(item, b);
    }).map(function (item) {
      const alt = item.labelByBasis && item.labelByBasis[b];
      if (!alt) return item;
      // 复制一份再改名，别把模块级的 ITEMS 改脏（它同时被设置页和浮标读）
      const copy = {};
      Object.keys(item).forEach(function (k) { copy[k] = item[k]; });
      copy.label = alt;
      copy.shortLabel = alt;
      return copy;
    });
  }

  /**
   * 空数组表示兼容旧版默认显示；非空数组表示自定义显示，并强制包含 range。
   * 返回值按指标目录排序、去重，同时剔除当前时间范围不存在的指标。
   */
  function normalize(value, rangeKey, basis) {
    if (!Array.isArray(value) || !value.length) return [];
    const picked = Object.create(null);
    value.forEach(function (key) { picked[String(key || '')] = true; });
    const list = available(rangeKey, basis).filter(function (item) { return !!picked[item.key]; })
      .map(function (item) { return item.key; });
    if (!list.length) return [];
    if (list.indexOf('range') < 0) list.unshift('range');
    return list;
  }

  NS.summaryItems = {
    all: ITEMS.slice(),
    available: available,
    normalize: normalize
  };
})();


  /* ================= src/store.js ================= */
/**
 * YXWT.store —— chrome.storage.local 封装（SPEC 第 2 节）
 * content script 与 options 页面共用，因此不得依赖 DOM / 云效页面上下文。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  const DEFAULTS = {
    version: 1,
    fieldMap: {},        // { [orgId]: FieldMap }
    contacts: {},        // { [orgId]: { [userId]: {id, name, avatar} } }
    // 身份缓存，按组织分桶。不分桶会导致 me() 一次失败就把上个组织的身份/orgId 顶上来，
    // 进而用 A 组织的工时字段 id 去读写 B 组织的工作项（字段 id 跨组织不通用）。
    contextByOrg: {},    // { [orgId]: {userId, name, avatar, orgId, orgName} }
    context: null,       // 最后一次成功识别的身份，仅在推不出当前组织时作降级回退
    // 团队视图里额外纳入的 userId，同样必须按组织分桶：userId 只在本组织有意义
    membersByOrg: {},    // { [orgId]: [userId] }
    // 按“组织 + 成员 + 口径 + 起止日期”保存的统计快照。只留最近 12 份，避免撑爆 storage.local。
    rangeSnapshots: {},  // { [cacheKey]: {savedAt, rows, ...} }
    prefs: {
      dailyTargetHours: 8,
      dateBasis: 'planEnd',      // 'planEnd' | 'finishTime' | 'planStart'
      taskScope: 'all',          // 'all' | 'completed'，仅影响本地展示与统计，不改变区间快照
      // 工作日目标偏差采用的有效工时：逐任务取预计/实际较大值，或固定使用其中一列。
      workDiffBasis: 'max',      // 'max' | 'estimated' | 'actual'
      defaultRange: 'thisWeek',
      // 空数组保持旧版悬浮条样式；非空时按所选概览指标显示，range 由 summaryItems 强制保留。
      summaryBarItems: [],
      members: [],               // 【已废弃】旧的扁平成员数组，仅用于一次性迁移到 membersByOrg
      includeSelf: true,         // 统计里是否包含自己（想「只看某个同事」时可以关掉）
      // 展示指标（热力图 / 日均 / 未填告警 / 分组排序）拿哪个字段当基准。
      // 'estimated' | 'actual' | 'both'。默认预计——0.2.x 之前的行为就是这个。
      hoursBasis: 'estimated',
      showSummaryBar: true,
      excludeCancelled: true,    // 统计时是否排除「已取消」状态
      // 没填「预计工时」的任务是否标红置顶提醒（字段没识别出来时无论开关如何都不提醒）
      warnMissingEst: true,
      theme: 'auto',             // 'auto' | 'light' | 'dark'
      // 写入模式默认只读预演（SPEC 7/11：首次使用必须是 dry-run），
      // 显式给默认值，避免调用方读到 undefined 被当成 false 而真的写回云效。
      dryRun: true
    }
  };

  // 通讯录姓名字段的取值优先级（云效不同接口返回的字段名不一致）
  const NAME_KEYS = ['realName', 'displayName', 'nickName', 'name'];

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function clone(v) {
    if (Array.isArray(v)) {
      return v.map(clone);
    }
    if (isPlainObject(v)) {
      const out = {};
      Object.keys(v).forEach(function (k) {
        out[k] = clone(v[k]);
      });
      return out;
    }
    return v;
  }

  function deepFreeze(v) {
    if (Array.isArray(v) || isPlainObject(v)) {
      Object.keys(v).forEach(function (k) {
        deepFreeze(v[k]);
      });
      Object.freeze(v);
    }
    return v;
  }

  /**
   * 深合并：以 defaults 为骨架，stored 覆盖。
   * - stored 里 defaults 没有的键原样保留（例如 prefs._writeEndpoint）
   * - 结构不符（默认是对象/数组但存的是标量）时退回默认值，防止老脏数据把 UI 打崩
   */
  function deepMerge(defaults, stored) {
    const out = clone(defaults);
    if (!isPlainObject(stored)) {
      return out;
    }
    Object.keys(stored).forEach(function (k) {
      const dv = out[k];
      const sv = stored[k];
      if (sv === undefined) {
        return;
      }
      if (isPlainObject(dv) && isPlainObject(sv)) {
        out[k] = deepMerge(dv, sv);
      } else if (isPlainObject(dv) || (Array.isArray(dv) && !Array.isArray(sv))) {
        return;
      } else {
        out[k] = clone(sv);
      }
    });
    return out;
  }

  function localArea() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return null;
    }
    return chrome.storage.local;
  }

  // 传回调调用，MV3 的 Promise 形式和回调形式都能兼容；同时统一处理 lastError
  function callArea(method, arg) {
    const area = localArea();
    if (!area) {
      return Promise.reject(new Error('chrome.storage.local 不可用'));
    }
    return new Promise(function (resolve, reject) {
      let ret;
      const done = function (res) {
        const err = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message || '读写本地存储失败'));
          return;
        }
        resolve(res);
      };
      try {
        ret = arg === undefined ? area[method](done) : area[method](arg, done);
      } catch (e) {
        reject(e);
        return;
      }
      if (ret && typeof ret.then === 'function') {
        ret.then(resolve, reject);
      }
    });
  }

  function rawGet() {
    return callArea('get', null);
  }

  function rawSet(payload) {
    return callArea('set', payload);
  }

  // 读-改-写串行化，避免多个模块（detect / panel / summarybar / options）并发写互相覆盖
  let queue = Promise.resolve();

  function enqueue(task) {
    const next = queue.then(task, task);
    queue = next.then(function () {}, function () {});
    return next;
  }

  function get() {
    return rawGet().then(function (raw) {
      return deepMerge(DEFAULTS, raw);
    });
  }

  // 浅合并顶层 key（chrome.storage.set 本身就是顶层覆盖语义）
  function set(patch) {
    if (!isPlainObject(patch) || Object.keys(patch).length === 0) {
      return get();
    }
    const payload = {};
    Object.keys(patch).forEach(function (k) {
      payload[k] = clone(patch[k]);
    });
    return enqueue(function () {
      return rawSet(payload).then(get);
    });
  }

  function setPrefs(patch) {
    if (!isPlainObject(patch) || Object.keys(patch).length === 0) {
      return get();
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const prefs = Object.assign({}, cfg.prefs, clone(patch));
        return rawSet({ prefs: prefs }).then(function () {
          cfg.prefs = prefs;
          return cfg;
        });
      });
    });
  }

  function getFieldMap(orgId) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve(null);
    }
    return get().then(function (cfg) {
      const map = cfg.fieldMap[key];
      return isPlainObject(map) ? map : null;
    });
  }

  /**
   * 写入字段映射。
   * - map 为 null/undefined 表示清除该组织的映射（设置页「重新探测」前置动作）
   * - 已存的是 manual:true 时，非手动来源（探测结果）不得覆盖，直接返回已存的
   */
  function setFieldMap(orgId, map) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve(null);
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const all = cfg.fieldMap;
        const old = isPlainObject(all[key]) ? all[key] : null;

        if (map === null || map === undefined) {
          if (!old) {
            return null;
          }
          delete all[key];
          return rawSet({ fieldMap: all }).then(function () {
            return null;
          });
        }
        if (!isPlainObject(map)) {
          return old ? clone(old) : null;
        }
        if (old && old.manual === true && map.manual !== true) {
          return clone(old);
        }

        const next = clone(map);
        next.manual = map.manual === true;
        next.detectedAt = typeof map.detectedAt === 'number' ? map.detectedAt : Date.now();
        all[key] = next;
        return rawSet({ fieldMap: all }).then(function () {
          return clone(next);
        });
      });
    });
  }

  /**
   * 一次性迁移：把旧的扁平 prefs.members 拆进 membersByOrg。
   * 归属判据：成员只能通过成员选择器勾选，而选择器只列当前组织的通讯录，
   * 所以「属于组织 X 的成员」恰好等于 legacy ∩ keys(contacts[X])——按此拆分不会张冠李戴。
   * 返回 null 表示无需迁移。
   */
  function migrateMembers(cfg) {
    const legacy = Array.isArray(cfg.prefs.members) ? cfg.prefs.members : [];
    if (!legacy.length) {
      return null;
    }
    const byOrg = isPlainObject(cfg.membersByOrg) ? clone(cfg.membersByOrg) : {};
    Object.keys(cfg.contacts || {}).forEach(function (org) {
      const book = isPlainObject(cfg.contacts[org]) ? cfg.contacts[org] : {};
      const mine = legacy.filter(function (id) {
        return Object.prototype.hasOwnProperty.call(book, String(id));
      });
      if (!mine.length) {
        return;
      }
      const cur = Array.isArray(byOrg[org]) ? byOrg[org] : [];
      const merged = cur.slice();
      mine.forEach(function (id) {
        if (merged.indexOf(id) < 0) {
          merged.push(id);
        }
      });
      byOrg[org] = merged;
    });
    // 认不出归属的旧 id 直接丢弃：宁可让用户重勾一次，也不能把 A 组织的人算进 B 组织
    return { membersByOrg: byOrg, prefs: Object.assign({}, cfg.prefs, { members: [] }) };
  }

  function getMembers(orgId) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve([]);
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const patch = migrateMembers(cfg);
        if (!patch) {
          const cur = cfg.membersByOrg[key];
          return Array.isArray(cur) ? clone(cur) : [];
        }
        return rawSet(patch).then(function () {
          const cur = patch.membersByOrg[key];
          return Array.isArray(cur) ? clone(cur) : [];
        });
      });
    });
  }

  function setMembers(orgId, ids) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve([]);
    }
    const list = (Array.isArray(ids) ? ids : []).map(String).filter(Boolean);
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const patch = migrateMembers(cfg);
        const byOrg = patch ? patch.membersByOrg : clone(cfg.membersByOrg);
        byOrg[key] = list.slice();
        const payload = { membersByOrg: byOrg };
        if (patch) {
          payload.prefs = patch.prefs;
        }
        return rawSet(payload).then(function () {
          return list.slice();
        });
      });
    });
  }

  function getContext(orgId) {
    const key = String(orgId || '');
    return get().then(function (cfg) {
      if (key) {
        const hit = cfg.contextByOrg[key];
        if (isPlainObject(hit) && hit.userId) {
          return clone(hit);
        }
        return null;
      }
      // 不知道当前组织时才退回「最后一次成功的身份」，调用方必须把它当降级数据处理
      const last = cfg.context;
      return isPlainObject(last) && last.userId ? clone(last) : null;
    });
  }

  function setContext(ctx) {
    if (!isPlainObject(ctx) || !ctx.userId) {
      return Promise.resolve(null);
    }
    const key = String(ctx.orgId || '');
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const byOrg = clone(cfg.contextByOrg);
        if (key) {
          byOrg[key] = clone(ctx);
        }
        return rawSet({ context: clone(ctx), contextByOrg: byOrg }).then(function () {
          return clone(ctx);
        });
      });
    });
  }

  function getContacts(orgId) {
    const key = String(orgId || '');
    if (!key) {
      return Promise.resolve({});
    }
    return get().then(function (cfg) {
      const book = cfg.contacts[key];
      return isPlainObject(book) ? book : {};
    });
  }

  // 把云效各接口返回的人员对象归一成 {id, name, avatar}；不合格的返回 null
  function pickUser(u) {
    if (!isPlainObject(u)) {
      return null;
    }
    if (u.isDeleted === true || u.isDisabled === true) {
      return null;
    }
    const id = String(u.identifier || u.id || '').trim();
    if (!id) {
      return null;
    }
    let name = '';
    for (let i = 0; i < NAME_KEYS.length; i++) {
      const v = u[NAME_KEYS[i]];
      if (typeof v === 'string' && v.trim()) {
        name = v.trim();
        break;
      }
    }
    const avatarRaw = u.avatar || u.avatarUrl || '';
    return {
      id: id,
      name: name,
      avatar: typeof avatarRaw === 'string' ? avatarRaw.trim() : ''
    };
  }

  function addContacts(orgId, users) {
    const key = String(orgId || '');
    const list = Array.isArray(users) ? users : (users ? [users] : []);
    if (!key) {
      return Promise.resolve({});
    }
    if (!list.length) {
      return getContacts(key);
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const all = cfg.contacts;
        const book = isPlainObject(all[key]) ? all[key] : {};
        let changed = false;

        list.forEach(function (u) {
          const picked = pickUser(u);
          if (!picked) {
            return;
          }
          const old = isPlainObject(book[picked.id]) ? book[picked.id] : null;
          // 已有的 name/avatar 只有在新值非空时才被覆盖
          const merged = {
            id: picked.id,
            name: picked.name || (old && old.name) || '',
            avatar: picked.avatar || (old && old.avatar) || ''
          };
          if (!old || old.name !== merged.name || old.avatar !== merged.avatar) {
            changed = true;
          }
          book[picked.id] = merged;
        });

        if (!changed) {
          return clone(book);
        }
        all[key] = book;
        return rawSet({ contacts: all }).then(function () {
          return clone(book);
        });
      });
    });
  }

  function removeContact(orgId, userId) {
    const key = String(orgId || '');
    const uid = String(userId || '');
    if (!key || !uid) {
      return Promise.resolve({});
    }
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const all = cfg.contacts;
        const book = isPlainObject(all[key]) ? all[key] : {};
        if (!Object.prototype.hasOwnProperty.call(book, uid)) {
          return clone(book);
        }
        delete book[uid];
        all[key] = book;

        const payload = { contacts: all };
        // 顺手把团队视图里指向该人的选择清掉，免得留下查不到名字的悬空 id。
        // 只动 orgId 这一桶：在 B 组织删同事不该影响 A 组织已勾选的成员。
        const mig = migrateMembers(cfg);
        const byOrg = mig ? mig.membersByOrg : clone(cfg.membersByOrg);
        if (mig) {
          payload.prefs = mig.prefs;
        }
        const members = Array.isArray(byOrg[key]) ? byOrg[key] : [];
        const kept = members.filter(function (m) {
          return String(m) !== uid;
        });
        if (kept.length !== members.length || mig) {
          byOrg[key] = kept;
          payload.membersByOrg = byOrg;
        }
        return rawSet(payload).then(function () {
          return clone(book);
        });
      });
    });
  }

  function getRangeSnapshot(cacheKey) {
    const key = String(cacheKey || '');
    if (!key) return Promise.resolve(null);
    return get().then(function (cfg) {
      const hit = cfg.rangeSnapshots[key];
      return isPlainObject(hit) ? clone(hit) : null;
    });
  }

  function setRangeSnapshot(cacheKey, snapshot) {
    const key = String(cacheKey || '');
    if (!key || !isPlainObject(snapshot)) return Promise.resolve(null);
    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const all = clone(cfg.rangeSnapshots);
        const next = clone(snapshot);
        next.savedAt = typeof next.savedAt === 'number' ? next.savedAt : Date.now();
        all[key] = next;

        const keys = Object.keys(all).sort(function (a, b) {
          return (Number(all[b] && all[b].savedAt) || 0) - (Number(all[a] && all[a].savedAt) || 0);
        });
        keys.slice(12).forEach(function (oldKey) { delete all[oldKey]; });

        return rawSet({ rangeSnapshots: all }).then(function () { return clone(next); });
      });
    });
  }

  /**
   * 写回云效成功后，把已知的新工时同步进所有命中该工作项的本地快照。
   * 不改 savedAt：它表示整段数据最后一次从云效完整拉取的时间，不能被一次局部写回冒充成全量刷新。
   */
  function patchRangeSnapshots(patches) {
    const byId = {};
    (Array.isArray(patches) ? patches : []).forEach(function (patch) {
      const id = String(patch && patch.id || '');
      if (!id) return;
      const next = byId[id] || (byId[id] = { id: id });
      if (Object.prototype.hasOwnProperty.call(patch, 'est')) next.est = Number(patch.est) || 0;
      if (Object.prototype.hasOwnProperty.call(patch, 'act')) next.act = Number(patch.act) || 0;
    });
    if (!Object.keys(byId).length) return Promise.resolve({ snapshots: 0, rows: 0 });

    return enqueue(function () {
      return rawGet().then(function (raw) {
        const cfg = deepMerge(DEFAULTS, raw);
        const all = clone(cfg.rangeSnapshots);
        let snapshotCount = 0;
        let rowCount = 0;

        Object.keys(all).forEach(function (key) {
          const snapshot = all[key];
          if (!snapshot || !Array.isArray(snapshot.rows)) return;
          let touched = false;
          snapshot.rows.forEach(function (row) {
            const patch = byId[String(row && row.id || '')];
            if (!patch) return;
            if (Object.prototype.hasOwnProperty.call(patch, 'est')) row.est = patch.est;
            if (Object.prototype.hasOwnProperty.call(patch, 'act')) row.act = patch.act;
            touched = true;
            rowCount++;
          });
          if (touched) snapshotCount++;
        });

        if (!snapshotCount) return { snapshots: 0, rows: 0 };
        return rawSet({ rangeSnapshots: all }).then(function () {
          return { snapshots: snapshotCount, rows: rowCount };
        });
      });
    });
  }

  /**
   * 监听本地配置变化。cb(cfg, changes)，cfg 是合并后的完整配置。
   * 返回取消监听的函数。
   */
  function onChange(cb) {
    const noop = function () {};
    if (typeof cb !== 'function') {
      return noop;
    }
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
      return noop;
    }
    const handler = function (changes, areaName) {
      if (areaName !== 'local') {
        return;
      }
      get().then(function (cfg) {
        try {
          cb(cfg, changes);
        } catch (e) {
          console.warn('[YXWT.store] onChange 回调异常', e);
        }
      }, function (e) {
        console.warn('[YXWT.store] onChange 读取配置失败', e);
      });
    };
    chrome.storage.onChanged.addListener(handler);
    return function () {
      chrome.storage.onChanged.removeListener(handler);
    };
  }

  // 设置页「清除全部本地数据」用
  function clear() {
    return enqueue(function () {
      return callArea('clear').then(function () {
        return clone(DEFAULTS);
      });
    });
  }

  NS.store = {
    DEFAULTS: deepFreeze(clone(DEFAULTS)),
    get: get,
    set: set,
    setPrefs: setPrefs,
    getFieldMap: getFieldMap,
    setFieldMap: setFieldMap,
    getMembers: getMembers,
    setMembers: setMembers,
    getContext: getContext,
    setContext: setContext,
    getContacts: getContacts,
    addContacts: addContacts,
    removeContact: removeContact,
    getRangeSnapshot: getRangeSnapshot,
    setRangeSnapshot: setRangeSnapshot,
    patchRangeSnapshots: patchRangeSnapshots,
    onChange: onChange,
    clear: clear
  };
})();


  /* ================= src/api.js ================= */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  const PROJEX_BASE = '/projex/api';
  const CHARSET_KEY = '_input_charset';
  const NOT_LOGGED_IN = 'YXWT_NOT_LOGGED_IN';
  const MAX_PAGE_SIZE = 200;
  const DEFAULT_PAGE_SIZE = 200;
  const DEFAULT_MAX_PAGES = 20;
  const META_MAX_DEPTH = 12;
  const ORG_ID_RE = /[0-9a-f]{24}/i;

  /**
   * 工时写入端点（**已在真实云效上抓包实证**，不是猜的）。
   *
   * 关键认知：云效的工时**不走通用字段接口**。虽然「预计工时 / 实际工时」在
   * 工作项列表里以自定义字段（如 101586 / 101587）的形式读得到，但写入有专门的端点，
   * body 里还要带记录人、是否含休息日这些工时特有的参数。
   * 之前按 `field/value` 的形状写，云效一律回 400。
   *
   * 实测抓到的预计工时请求（2026-08-22，云效前端自己发的）：
   *   POST /projex/api/workitem/workitem/time/estimate?_input_charset=utf-8
   *   {"workitemIdentifier":"...","spentTime":3,"type":null,"description":"",
   *    "recordUserIdentifier":"<当前用户id>","forCreate":false,"containsRestDay":false}
   *
   * 注意 spentTime 是**数字**不是字符串。
   */
  const HOUR_WRITERS = {
    est: {
      key: 'timeEstimate',
      method: 'POST',
      path: '/workitem/workitem/time/estimate',
      body: function (workitemId, hours, ctx) {
        return {
          workitemIdentifier: String(workitemId),
          spentTime: hours,
          type: null,
          description: '',
          recordUserIdentifier: String((ctx && ctx.userId) || ''),
          // 该工作项之前没有预计工时时是「新建」，有值时是「更新」。
          // 判断错了云效会回 400，所以调用方会用相反的值再试一次。
          // 恒为 false。三次抓包（详情页改、列表就地改、有值/无值）云效**从来没发过 true**。
        // 曾经对「原来没值」的情况自作主张发 true，结果它去创建「工时登记记录」了，
        // 而不是设置工作项的预计工时字段 —— 工时明细里多出几条记录，
        // 列表里的「预计工时」列却始终是空的。forCreate 应该是指
        // 「是否在工作项创建时一并设置」，编辑已有工作项一律 false。
        forCreate: false,
          containsRestDay: false
        };
      }
    },
    act: {
      key: 'timeRecord',
      method: 'POST',
      path: '/workitem/workitem/time',
      // ⚠️ 语义与预计工时完全不同：这是「登记一条工时记录」，值是**累加**的，不是赋值。
      // 实测抓包（2026-08-22，云效前端自己发的）：
      //   POST /projex/api/workitem/workitem/time?_input_charset=utf-8
      //   {"workitemIdentifier":"...","type":null,"actualTime":3,"description":"",
      //    "recordUserIdentifier":"<用户id>","gmtStart":"2026-08-22T11:27:41+08:00",
      //    "gmtEnd":"2026-08-22T11:27:41+08:00","containsRestDay":false}
      // 所以调用方传进来的是「目标总量」，这里写的是「目标 − 当前」的增量。
      accumulative: true,
      body: function (workitemId, deltaHours, ctx) {
        const at = (ctx && ctx.at) || isoWithOffset(new Date());
        return {
          workitemIdentifier: String(workitemId),
          type: null,
          actualTime: deltaHours,
          description: (ctx && ctx.description) || '',
          recordUserIdentifier: String((ctx && ctx.userId) || ''),
          gmtStart: at,
          gmtEnd: at,
          containsRestDay: false
        };
      }
    }
  };

  /** 云效要的是带时区偏移的 ISO，比如 2026-08-22T11:27:41+08:00（不是 UTC 的 Z 结尾） */
  function isoWithOffset(d) {
    const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const oh = Math.floor(Math.abs(off) / 60);
    const om = Math.abs(off) % 60;
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) +
      'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) +
      sign + p2(oh) + ':' + p2(om);
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function apiError(message, code, traceId) {
    const err = new Error(message || '云效接口调用失败');
    err.code = code === undefined ? null : code;
    err.traceId = traceId || null;
    return err;
  }

  function notLoggedInError(httpStatus, traceId) {
    return apiError(NOT_LOGGED_IN, httpStatus === undefined ? null : httpStatus, traceId);
  }

  function isNotLoggedIn(err) {
    return !!err && err.message === NOT_LOGGED_IN;
  }

  // 拼 projex 接口地址：补 /projex/api 前缀 + 追加 _input_charset=utf-8（path 里可能已经带 ?）
  function buildProjexUrl(path) {
    let p = String(path || '');
    const hashAt = p.indexOf('#');
    let hash = '';
    if (hashAt >= 0) {
      hash = p.slice(hashAt);
      p = p.slice(0, hashAt);
    }
    if (p.charAt(0) !== '/') {
      p = '/' + p;
    }
    if (p.indexOf(PROJEX_BASE + '/') !== 0 && p !== PROJEX_BASE) {
      p = PROJEX_BASE + p;
    }
    if (!new RegExp('[?&]' + CHARSET_KEY + '=').test(p)) {
      p += (p.indexOf('?') >= 0 ? '&' : '?') + CHARSET_KEY + '=utf-8';
    }
    return p + hash;
  }

  // 云效有 HTTP 200 但 body 是 Spring 错误对象的坑，两种形状都要当失败处理
  function detectHttpShapedError(json) {
    const candidates = [json, json && json.result];
    for (let i = 0; i < candidates.length; i++) {
      const o = candidates[i];
      if (!o || typeof o !== 'object' || Array.isArray(o)) {
        continue;
      }
      const st = o.status;
      if (typeof st !== 'number' || st < 400) {
        continue;
      }
      // 工作项的 status 是对象，这里只认「数字 status + Spring 错误特征字段」
      const looksLikeSpring =
        hasOwn(o, 'error') || hasOwn(o, 'message') || hasOwn(o, 'path') ||
        hasOwn(o, 'timestamp') || hasOwn(o, 'exception');
      if (!looksLikeSpring) {
        continue;
      }
      const msg = (typeof o.error === 'string' && o.error) ||
        (typeof o.message === 'string' && o.message) || '';
      return { status: st, message: msg ? ('云效接口 ' + st + '：' + msg) : ('云效接口 ' + st) };
    }
    return null;
  }

  async function req(path, options) {
    const opts = options || {};
    const base = opts.base || 'projex';
    const method = (opts.method || 'GET').toUpperCase();
    const url = base === 'raw' ? String(path) : buildProjexUrl(path);

    const headers = Object.assign({ Accept: 'application/json, text/plain, */*' }, opts.headers || {});
    const init = { method: method, credentials: 'include', headers: headers };
    if (opts.signal) {
      init.signal = opts.signal;
    }
    if (opts.body !== undefined && opts.body !== null && method !== 'GET' && method !== 'HEAD') {
      if (typeof opts.body === 'string') {
        init.body = opts.body;
      } else {
        init.body = JSON.stringify(opts.body);
      }
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      if (e && e.name === 'AbortError') {
        throw e;
      }
      throw apiError('网络请求失败：' + ((e && e.message) || '未知错误'), 'YXWT_NETWORK', null);
    }

    if (res.status === 401 || res.status === 403) {
      throw notLoggedInError(res.status, res.headers.get('x-trace-id'));
    }
    // 被重定向到登录页时同样按未登录处理
    if (res.redirected && /\/(login|signin|passport)/i.test(res.url || '')) {
      throw notLoggedInError(res.status, null);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    let text;
    try {
      text = await res.text();
    } catch (e) {
      throw apiError('读取云效响应失败：' + ((e && e.message) || '未知错误'), res.status, null);
    }

    const trimmed = text.replace(/^\uFEFF/, '').trim();
    if (contentType.indexOf('text/html') >= 0 || trimmed.charAt(0) === '<') {
      throw notLoggedInError(res.status, null);
    }
    if (!trimmed) {
      if (!res.ok) {
        throw apiError('云效接口 HTTP ' + res.status, res.status, null);
      }
      throw apiError('云效接口返回空响应', res.status, null);
    }

    let json;
    try {
      json = JSON.parse(trimmed);
    } catch (e) {
      throw apiError('云效接口返回了无法解析的内容', res.status, null);
    }

    const traceId = (json && json.traceId) || res.headers.get('x-trace-id') || null;

    const shaped = detectHttpShapedError(json);
    if (shaped) {
      throw apiError(shaped.message, shaped.status, traceId);
    }

    const code = json && json.code;
    if (code !== undefined && code !== null && Number(code) !== 200) {
      const msg = (json && (json.errorMsg || json.msg)) || ('云效接口 ' + code);
      throw apiError(msg, code, traceId);
    }
    if (json && json.success === false) {
      const msg = (json.errorMsg || json.msg) || '云效接口返回失败';
      throw apiError(msg, code === undefined ? res.status : code, traceId);
    }
    if (!res.ok) {
      const msg = (json && (json.errorMsg || json.msg)) || ('云效接口 HTTP ' + res.status);
      throw apiError(msg, res.status, traceId);
    }

    return json;
  }

  // 从任意字符串里抠 organitionId（阿里把 organization 拼错了，两种拼写都兼容）
  function orgIdFromUrl(str) {
    if (!str || typeof str !== 'string') {
      return null;
    }
    const m = str.match(/[?&]organi(?:ti|zati)onId=([0-9a-zA-Z]+)/);
    if (m && m[1]) {
      return m[1];
    }
    const m2 = str.match(/\/organization\/([0-9a-f]{24})(?:[/?#]|$)/i);
    return m2 ? m2[1] : null;
  }

  function orgIdFromDom() {
    if (typeof document === 'undefined') {
      return null;
    }
    const fromLocation = orgIdFromUrl(location.href);
    if (fromLocation) {
      return fromLocation;
    }
    let nodes = [];
    try {
      nodes = document.querySelectorAll('a[href*="organization/"], [data-organization-id], [href*="organitionId"]');
    } catch (e) {
      nodes = [];
    }
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const dataId = el.getAttribute && el.getAttribute('data-organization-id');
      if (dataId && ORG_ID_RE.test(dataId)) {
        return dataId;
      }
      const href = (el.getAttribute && el.getAttribute('href')) || '';
      const hit = orgIdFromUrl(href);
      if (hit) {
        return hit;
      }
    }
    return null;
  }

  // 注：这里曾经有一级 uiless-devops.aliyun.com/api/sdk/preferences/lastWorkspace 的跨域兜底。
  // 它不在 manifest 的 host_permissions 里，也和 PRIVACY.md / README「只发往 devops.aliyun.com」
  // 的承诺冲突（请求即便被 CORS 拦掉也已经带着 Cookie 离开浏览器），所以整级删掉。
  // orgId 现在只靠同源的三级兜底：sdkConfigs.appUrl → 深搜 sdkConfigs → 扫 DOM。

  function deepFindOrgId(node, depth, seen) {
    if (!node || depth > 4) {
      return null;
    }
    if (typeof node === 'string') {
      return orgIdFromUrl(node);
    }
    if (typeof node !== 'object' || seen.has(node)) {
      return null;
    }
    seen.add(node);
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = node[k];
      if (typeof v === 'string' && /^organi(ti|zati)onId$/i.test(k) && v) {
        return v;
      }
      const hit = deepFindOrgId(v, depth + 1, seen);
      if (hit) {
        return hit;
      }
    }
    return null;
  }

  async function me() {
    const json = await req('/uiless/api/sdk/users/me', { base: 'raw' });
    const result = (json && json.result) || {};
    const user = result.user || {};
    const userId = user.id || user.identifier || null;
    if (!userId) {
      throw apiError(NOT_LOGGED_IN, json && json.code, json && json.traceId);
    }

    let orgId = orgIdFromUrl((result.sdkConfigs && result.sdkConfigs.appUrl) || '');
    if (!orgId) {
      orgId = deepFindOrgId(result.sdkConfigs, 0, new WeakSet());
    }
    if (!orgId) {
      orgId = orgIdFromDom();
    }

    return {
      userId: String(userId),
      name: user.name || user.realName || user.displayName || user.nickName || '',
      avatar: user.avatarUrl || user.avatar || '',
      email: user.email || '',
      orgId: orgId || null
    };
  }

  async function getUser(userId) {
    const json = await req('/common/user/' + encodeURIComponent(userId));
    const r = (json && json.result) || {};
    return {
      id: String(r.identifier || userId),
      name: r.displayName || r.realName || r.nickName || '',
      avatar: r.avatar || ''
    };
  }

  async function getOrg(orgId) {
    const json = await req('/common/organization/' + encodeURIComponent(orgId));
    const r = (json && json.result) || {};
    return {
      id: String(r.identifier || orgId),
      name: r.name || '',
      logo: r.logo || ''
    };
  }

  async function getView(viewId) {
    const json = await req('/workitem/view/' + encodeURIComponent(viewId));
    return (json && json.result) || null;
  }

  // 云效实体 id 都是 24 位 hex；内置视图（我负责的 / 近期我参与 / 待我验证…）返回的
  // spaceIdentifier 是字面量 'system'，直接拿去查 workitem/list 会恒返回 0 条。
  const REAL_ID_RE = /^[0-9a-f]{24}$/i;

  /**
   * 把 getView 的结果收敛成能直接用来查询的 {spaceType, spaceIdentifier, scope}。
   * 非法 spaceIdentifier（'system' 等）一律回落到 meUserId，避免恒 0 条。
   * 见 docs/API-VERIFY.md「修正一（必现 bug）」。
   */
  /**
   * 视图的 filter 是 JSON 字符串（二维数组），转成 workitem/list 要的 conditionGroups。
   *
   * 这段逻辑很容易写错而且**错了不报错、只是静默返回 0 条**，所以只留这一份实现，
   * panel 和 summarybar 都调它（曾经各写过一份，行为还不一致）。三个必须踩准的点：
   *   1. value 是空数组的条件表示「未启用」，必须整条丢掉，否则查不出东西；
   *   2. value 的元素形如 {label, value}，必须 unwrap 成裸值——实测传对象进去返回 0 条；
   *   3. className / format 藏在 c.field 里，不在 c 上。
   */
  function viewFilterToGroups(filter) {
    let raw = filter;
    if (typeof raw === 'string') {
      if (!raw.trim()) return [[]];
      try { raw = JSON.parse(raw); } catch (e) { return [[]]; }
    }
    if (!Array.isArray(raw) || !raw.length) return [[]];

    const groups = Array.isArray(raw[0]) ? raw : [raw];
    const out = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!Array.isArray(g)) continue;
      const conds = [];
      for (let j = 0; j < g.length; j++) {
        const c = viewConditionToCond(g[j]);
        if (c) conds.push(c);
      }
      if (conds.length) out.push(conds);
    }
    return out.length ? out : [[]];
  }

  function viewPickValue(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') {
      // 嵌套对象直接塞进去会静默查不到东西，所以只接受标量的 value / identifier
      if (v.value !== null && v.value !== undefined && typeof v.value !== 'object') return String(v.value);
      if (v.identifier !== null && v.identifier !== undefined && typeof v.identifier !== 'object') {
        return String(v.identifier);
      }
      return null;
    }
    return String(v);
  }

  function viewConditionToCond(c) {
    if (!c || typeof c !== 'object') return null;
    const field = c.field && typeof c.field === 'object' ? c.field : null;
    const fid = c.fieldIdentifier || (field ? field.identifier : '');
    if (!fid) return null;

    const rawValues = Array.isArray(c.value)
      ? c.value
      : (c.value === null || c.value === undefined || c.value === '' ? [] : [c.value]);
    const values = [];
    for (let i = 0; i < rawValues.length; i++) {
      const v = viewPickValue(rawValues[i]);
      if (v !== null && v !== '') values.push(v);
    }
    if (!values.length) return null;   // 未启用的条件

    const cond = {
      fieldIdentifier: String(fid),
      operator: c.operator || 'CONTAINS',
      value: values,
      toValue: viewPickValue(c.toValue)
    };
    const className = (field && field.className) || c.className;
    const format = (field && field.format) || c.format;
    if (className) cond.className = String(className);
    if (format) cond.format = String(format);
    return cond;
  }

  function normalizeViewSpace(view, meUserId) {
    const v = view || {};
    const out = {
      spaceType: v.spaceType ? String(v.spaceType) : 'User',
      spaceIdentifier: '',
      scope: undefined
    };
    const raw = v.spaceIdentifier === null || v.spaceIdentifier === undefined ? '' : String(v.spaceIdentifier);
    out.spaceIdentifier = REAL_ID_RE.test(raw) ? raw : String(meUserId || '');
    if (out.spaceType === 'User') {
      out.scope = v.scope ? String(v.scope) : 'personal';
    }
    return out;
  }

  function toPositiveInt(v, fallback, max) {
    const n = parseInt(v, 10);
    if (!isFinite(n) || n <= 0) {
      return fallback;
    }
    return max && n > max ? max : n;
  }

  async function listWorkitems(opts) {
    const o = opts || {};
    const spaceType = o.spaceType || 'User';
    const pageSize = toPositiveInt(o.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const maxPages = toPositiveInt(o.maxPages, DEFAULT_MAX_PAGES);
    const onProgress = typeof o.onProgress === 'function' ? o.onProgress : null;

    // 外部传对象，这里统一 stringify；空条件也必须是 {"conditionGroups":[[]]}
    const groups = Array.isArray(o.conditionGroups) && o.conditionGroups.length ? o.conditionGroups : [[]];
    const conditions = JSON.stringify({ conditionGroups: groups });
    const orderBy = o.orderBy ? JSON.stringify(o.orderBy) : null;
    // 「按状态分组 / 按类别分组」那排标签选中哪一项，云效是靠这个独立参数发的，
    // 不在 conditions 里。不带它就等于统计整个视图（页面显示 25 条、插件显示 3307 条）。
    // 实证形状（2026-08-22 抓的云效自己的请求）：
    //   {"fieldIdentifier":"status","className":"status","format":"list",
    //    "value":["100005"],"operator":"EQUALS"}     ← value 是 identifier 不是名字
    const groupCondition = o.groupCondition ? JSON.stringify(o.groupCondition) : null;

    const items = [];
    let total = 0;
    let truncated = false;
    let page = 1;

    for (; page <= maxPages; page++) {
      const body = {
        spaceType: spaceType,
        spaceIdentifier: String(o.spaceIdentifier == null ? '' : o.spaceIdentifier),
        category: o.category || '',
        toPage: page,
        pageSize: pageSize,
        searchType: o.searchType || 'LIST',
        conditions: conditions
      };
      if (spaceType === 'User') {
        body.scope = o.scope || 'personal';
      } else if (o.scope) {
        body.scope = o.scope;
      }
      if (orderBy) {
        body.orderBy = orderBy;
      }
      if (groupCondition) {
        body.groupCondition = groupCondition;
      }

      const json = await req('/workitem/workitem/list', {
        method: 'POST',
        body: body,
        signal: o.signal
      });

      const arr = Array.isArray(json.result) ? json.result
        : (json.result && Array.isArray(json.result.data) ? json.result.data : []);
      const reported = Number(json.totalCount != null ? json.totalCount
        : (json.result && json.result.totalCount != null ? json.result.totalCount : NaN));
      for (let i = 0; i < arr.length; i++) {
        items.push(arr[i]);
      }
      total = isFinite(reported) ? reported : items.length;

      if (onProgress) {
        try {
          onProgress(items.length, total);
        } catch (e) {
          // 进度回调不该影响拉取
        }
      }

      if (!arr.length || items.length >= total || arr.length < pageSize) {
        break;
      }
    }

    if (page > maxPages && items.length < total) {
      truncated = true;
    }
    return { items: items, total: total, truncated: truncated };
  }

  // 递归收集所有同时具备 identifier 和 (displayName||name) 的对象
  function collectFieldMeta(node, out, seen, keys, depth) {
    if (!node || typeof node !== 'object' || depth > META_MAX_DEPTH || seen.has(node)) {
      return;
    }
    seen.add(node);

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        collectFieldMeta(node[i], out, seen, keys, depth + 1);
      }
      return;
    }

    const id = node.identifier != null ? String(node.identifier) : '';
    const name = (typeof node.displayName === 'string' && node.displayName) ||
      (typeof node.name === 'string' && node.name) || '';
    if (id && name) {
      const key = id + '\u0000' + name;
      if (!keys.has(key)) {
        keys.add(key);
        out.push({
          id: id,
          name: name,
          className: node.className || node.fieldClassName || '',
          format: node.format || node.fieldFormat || '',
          type: node.type || node.fieldType || ''
        });
      }
    }

    const props = Object.keys(node);
    for (let i = 0; i < props.length; i++) {
      collectFieldMeta(node[props[i]], out, seen, keys, depth + 1);
    }
  }

  /**
   * 取「按 X 分组」那排标签。返回 [{identifier, name, count}]。
   * 形状照抄云效自己的请求（首轮抓包记录见 docs/API-RESEARCH.md）：
   *   POST /projex/api/workitem/workitem/group/list
   *   {spaceType, spaceIdentifier, category:'Workitem', conditions, size:200,
   *    groupFieldInfo:'{"identifier":"status","className":"status"}', scope}
   */
  async function listGroups(opts) {
    const o = opts || {};
    if (!o.groupField || !o.groupField.identifier) return [];
    const groups = Array.isArray(o.conditionGroups) && o.conditionGroups.length ? o.conditionGroups : [[]];
    const body = {
      spaceType: o.spaceType || 'User',
      spaceIdentifier: String(o.spaceIdentifier == null ? '' : o.spaceIdentifier),
      category: o.category || 'Workitem',
      conditions: JSON.stringify({ conditionGroups: groups }),
      size: 200,
      groupFieldInfo: JSON.stringify({
        identifier: String(o.groupField.identifier),
        className: String(o.groupField.className || o.groupField.identifier)
      })
    };
    if ((o.spaceType || 'User') === 'User') body.scope = o.scope || 'personal';

    const json = await req('/workitem/workitem/group/list', {
      method: 'POST', body: body, signal: o.signal
    });
    const arr = Array.isArray(json.result) ? json.result
      : (json.result && Array.isArray(json.result.data) ? json.result.data : []);
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const g = arr[i] || {};
      // 云效在不同分组维度下键名不完全一致，几种都兜住
      const id = g.identifier != null ? g.identifier
        : (g.value != null ? g.value : (g.id != null ? g.id : null));
      const name = g.displayName || g.name || g.label || (id == null ? '' : String(id));
      if (id == null || id === '') continue;
      out.push({
        identifier: String(id),
        name: String(name),
        count: Number(g.count != null ? g.count : (g.total != null ? g.total : 0)) || 0
      });
    }
    return out;
  }

  /**
   * 按 identifier 重读单个工作项。
   *
   * 这是**云效自己**写完工时后用来刷新那一行的方式（抓包实证：time/estimate 前面
   * 紧跟着就是这个请求）。用它做写后复核，读到的就是列表和刷新页面后看到的同一份数据，
   * 比读 field/value 可靠——工时写进的是工时子系统，自定义字段只是那边同步过来的副本。
   */
  async function getWorkitemById(workitemId, opts) {
    const o = opts || {};
    const json = await req('/workitem/workitem/list', {
      method: 'POST',
      body: {
        toPage: 1,
        pageSize: 1,
        searchType: 'LIST',
        conditions: JSON.stringify({
          conditionGroups: [[{
            fieldIdentifier: 'identifier',
            operator: 'CONTAINS',
            value: [String(workitemId)],
            toValue: null,
            className: 'string',
            format: 'input'
          }]]
        })
      },
      signal: o.signal
    });
    const arr = Array.isArray(json.result) ? json.result
      : (json.result && Array.isArray(json.result.data) ? json.result.data : []);
    return arr[0] || null;
  }

  /** 从工作项对象里取某个自定义字段的值（没值的字段在 customFields 里整条缺失） */
  function customFieldValue(item, fieldId) {
    if (!item || !fieldId) return null;
    const list = Array.isArray(item.customFields) ? item.customFields : [];
    for (let i = 0; i < list.length; i++) {
      const cf = list[i];
      if (cf && String(cf.fieldIdentifier) === String(fieldId)) {
        return cf.value === undefined ? null : cf.value;
      }
    }
    return null;
  }

  async function getFieldMeta(workitemId) {
    const json = await req('/workitem/workitem/field/' + encodeURIComponent(workitemId));
    const out = [];
    collectFieldMeta(json && json.result, out, new WeakSet(), new Set(), 0);
    return out;
  }

  async function getFieldValues(workitemId) {
    const json = await req('/workitem/workitem/field/value/' + encodeURIComponent(workitemId));
    return (json && json.result) !== undefined ? json.result : null;
  }

  // 字段值容器形状不稳定（数组 / customFields / 直接映射），逐种试
  function pickFieldValue(result, fieldId) {
    const target = String(fieldId);
    const lists = [];
    if (Array.isArray(result)) {
      lists.push(result);
    } else if (result && typeof result === 'object') {
      ['customFields', 'fieldValues', 'values', 'fields', 'result'].forEach(function (k) {
        if (Array.isArray(result[k])) {
          lists.push(result[k]);
        }
      });
    }

    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      for (let j = 0; j < list.length; j++) {
        const it = list[j];
        if (!it || typeof it !== 'object') {
          continue;
        }
        const id = it.fieldIdentifier != null ? it.fieldIdentifier
          : (it.identifier != null ? it.identifier : it.fieldId);
        if (id == null || String(id) !== target) {
          continue;
        }
        if (it.value !== undefined && it.value !== null) {
          return it.value;
        }
        if (it.fieldValue !== undefined && it.fieldValue !== null) {
          return it.fieldValue;
        }
        if (it.objectValue !== undefined) {
          return it.objectValue;
        }
        return null;
      }
    }

    if (result && typeof result === 'object' && !Array.isArray(result) && hasOwn(result, target)) {
      const v = result[target];
      if (v === null || typeof v !== 'object') {
        return v;
      }
      if (hasOwn(v, 'value')) {
        return v.value;
      }
    }
    return null;
  }

  function normValue(v) {
    if (v === undefined || v === null) {
      return '';
    }
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch (e) {
        return String(v);
      }
    }
    return String(v).trim();
  }

  // '2' 和 '2.0' 要算相等，所以两边都是数字时按数值比
  function sameValue(a, b) {
    const sa = normValue(a);
    const sb = normValue(b);
    if (sa === sb) {
      return true;
    }
    if (sa !== '' && sb !== '') {
      const na = Number(sa);
      const nb = Number(sb);
      if (isFinite(na) && isFinite(nb)) {
        return na === nb;
      }
    }
    return false;
  }

  /**
   * 写工时。which = 'est'（预计工时）或 'act'（实际工时）。
   *
   * 流程（每一步都不能省，写错的是用户线上工作项）：
   *   1. dryRun（默认）→ 只读当前值返回「旧值 → 新值」，一个写请求都不发
   *   2. 读当前值
   *   3. 值没变就跳过，不写（也避免在云效操作日志里留无意义记录）
   *   4. 写。forCreate 判断错云效会回 400，所以失败时用相反的值再试一次
   *   5. 写完再读回来复核，不一致就报失败
   *
   * @param workitemId 工作项 identifier
   * @param which      'est' | 'act'
   * @param hours      数字（云效要的是数字，不是字符串）
   * @param options    {dryRun, fieldId, userId}
   *                   fieldId 只用于「读当前值」——读是按自定义字段读的，写不是
   */
  async function saveWorkHours(workitemId, which, hours, options) {
    const opts = options || {};
    const dryRun = opts.dryRun !== false;
    const writer = HOUR_WRITERS[which];
    const fieldId = opts.fieldId;

    if (!writer) {
      return { ok: false, error: '不支持的工时类型：' + which };
    }

    // 读当前值走「按 identifier 重读工作项」——和列表、和刷新页面后看到的是同一份数据。
    // 早期用 field/value 读，那是自定义字段的副本，可能和工时子系统不同步，
    // 会出现「复核通过、刷新后工时没了」的假成功。
    const readCurrent = async function () {
      if (!fieldId) return null;
      const item = await getWorkitemById(workitemId, { signal: opts.signal });
      return customFieldValue(item, fieldId);
    };

    const target = Number(hours);
    if (!isFinite(target) || target < 0) {
      return { ok: false, error: '工时必须是不小于 0 的数字' };
    }

    if (dryRun) {
      let from = null;
      try {
        from = await readCurrent();
      } catch (e) {
        if (isNotLoggedIn(e)) throw e;
        from = null;
      }
      return {
        ok: true, dryRun: true,
        would: { workitemId: workitemId, which: which, from: from, to: target }
      };
    }

    const before = await readCurrent();
    if (sameValue(before, target)) {
      return { ok: true, skipped: 'unchanged', from: before, to: target };
    }

    let userId = opts.userId;
    if (!userId) {
      try {
        userId = (await me()).userId;
      } catch (e) {
        if (isNotLoggedIn(e)) throw e;
        userId = '';
      }
    }

    const current = Number(before) || 0;

    // 实际工时在云效里是「登记记录之和」，接口是**追加一条记录**而不是赋值。
    // 所以这里写的是增量；而且没有「负的登记」，减少只能去云效删记录。
    let payloadValue = target;
    let delta = null;
    if (writer.accumulative) {
      delta = Math.round((target - current) * 10) / 10;
      if (delta < 0) {
        return {
          ok: false,
          error: '实际工时在云效里是「工时登记」的累加值，只能增加不能改小（当前 ' + current +
            'h，想改成 ' + target + 'h）。要调小请到该工作项的「工时」页删掉对应的登记记录。',
          from: before, to: target, needsManual: true
        };
      }
      payloadValue = delta;
    }

    const attemptErrors = [];
    let wrote = false;
    // ⚠️ 只发一次，**绝不重试**。
    // 云效的工时（预计和实际都是）本质是「一条条记录」，右边显示的数字是这些记录的和。
    // 重试一次就多一条记录、总量翻倍。实测就出过这个事故：
    // 复核误判失败 → 用户重试 → 同一个工作项上多了 3 条「1 小时」的预计工时。
    // forCreate 的判断依据：之前没值 = 新建一条，已有值 = 更新已有的那条。
    for (const forCreate of [false]) {
      const body = writer.body(workitemId, payloadValue, {
        userId: userId, forCreate: forCreate, description: opts.description
      });
      try {
        await req(writer.path, { method: writer.method, body: body });
        wrote = true;
        break;
      } catch (e) {
        if (isNotLoggedIn(e)) throw e;
        attemptErrors.push(writer.key +
          (forCreate === null ? '' : '(forCreate=' + forCreate + ')') + ' → ' +
          ((e && e.message) || '写入失败') +
          (e && e.code !== undefined && e.code !== null ? '（code ' + e.code + '）' : '') +
          (e && e.traceId ? ' traceId=' + e.traceId : ''));
        try {
          console.warn('[云效工时统计] 工时写入失败：', {
            which: which, endpoint: writer.key, path: writer.path, body: body,
            error: (e && e.message) || e, code: e && e.code, traceId: e && e.traceId
          });
        } catch (ignored) { /* 控制台不可用时静默 */ }
      }
    }

    if (!wrote) {
      return {
        ok: false,
        error: attemptErrors[attemptErrors.length - 1] || '写入失败',
        attempts: attemptErrors,
        from: before, to: target
      };
    }

    // 云效的工时汇总字段是异步算出来的，写完立刻回读经常还是旧值。
    // 所以要等一等、多读几次；**而且即使最后仍对不上也不能报失败**——
    // POST 已经 200 了，报失败会诱导用户重试，而重试会再加一条工时记录。
    let after = null;
    let verified = false;
    let verifyError = null;
    const waits = [300, 700, 1500, 2500];
    for (let i = 0; i < waits.length; i++) {
      try {
        after = await readCurrent();
      } catch (e) {
        if (isNotLoggedIn(e)) throw e;
        verifyError = (e && e.message) || '未知错误';
        break;
      }
      if (!fieldId || sameValue(after, target)) { verified = true; break; }
      if (i < waits.length - 1) await sleep(waits[i]);
    }

    if (!verified) {
      return {
        ok: true,
        unverified: true,
        error: verifyError
          ? '已提交，但复核时读不到最新值（' + verifyError + '）'
          : '已提交，但云效的工时汇总还没刷新出来（读到 ' + after + '）',
        hint: '云效的工时汇总是异步算的，通常几秒后才更新。请刷新页面确认，**不要重复提交**——每提交一次就会多一条工时记录。',
        from: before, to: target, delta: delta, endpoint: writer.key
      };
    }
    // 写入成功也留一条日志：万一出现「提示成功但刷新后没有」，
    // 这条能直接看出「写前是多少、写了多少、写后复核读回多少」，不用再猜。
    try {
      console.info('[云效工时统计] 工时已写入：', {
        workitemId: workitemId, which: which, endpoint: writer.key,
        before: before, target: target, delta: delta, verified: after
      });
    } catch (ignored) { /* 控制台不可用时静默 */ }
    return { ok: true, from: before, to: target, delta: delta, endpoint: writer.key };
  }

  function pickFieldValue(result, fieldId) {
    const target = String(fieldId);
    const lists = [];
    if (Array.isArray(result)) {
      lists.push(result);
    } else if (result && typeof result === 'object') {
      ['customFields', 'fieldValues', 'values', 'fields', 'result'].forEach(function (k) {
        if (Array.isArray(result[k])) {
          lists.push(result[k]);
        }
      });
    }

    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      for (let j = 0; j < list.length; j++) {
        const it = list[j];
        if (!it || typeof it !== 'object') {
          continue;
        }
        const id = it.fieldIdentifier != null ? it.fieldIdentifier
          : (it.identifier != null ? it.identifier : it.fieldId);
        if (id == null || String(id) !== target) {
          continue;
        }
        if (it.value !== undefined && it.value !== null) {
          return it.value;
        }
        if (it.fieldValue !== undefined && it.fieldValue !== null) {
          return it.fieldValue;
        }
        if (it.objectValue !== undefined) {
          return it.objectValue;
        }
        return null;
      }
    }

    if (result && typeof result === 'object' && !Array.isArray(result) && hasOwn(result, target)) {
      const v = result[target];
      if (v === null || typeof v !== 'object') {
        return v;
      }
      if (hasOwn(v, 'value')) {
        return v.value;
      }
    }
    return null;
  }

  function normValue(v) {
    if (v === undefined || v === null) {
      return '';
    }
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch (e) {
        return String(v);
      }
    }
    return String(v).trim();
  }

  // '2' 和 '2.0' 要算相等，所以两边都是数字时按数值比
  function sameValue(a, b) {
    const sa = normValue(a);
    const sb = normValue(b);
    if (sa === sb) {
      return true;
    }
    if (sa !== '' && sb !== '') {
      const na = Number(sa);
      const nb = Number(sb);
      if (isFinite(na) && isFinite(nb)) {
        return na === nb;
      }
    }
    return false;
  }

  const cond = {
    user: function (fieldId, userIds) {
      return {
        fieldIdentifier: String(fieldId),
        operator: 'CONTAINS',
        value: Array.isArray(userIds) ? userIds.map(String) : [String(userIds)],
        toValue: null,
        className: 'user',
        format: 'list'
      };
    },
    dateBetween: function (fieldId, startYMD, endYMD) {
      return {
        fieldIdentifier: String(fieldId),
        operator: 'BETWEEN',
        value: [startYMD + ' 00:00:00'],
        toValue: endYMD + ' 23:59:59',
        className: 'date',
        format: 'input'
      };
    },
    category: function (values) {
      return {
        fieldIdentifier: 'category',
        operator: 'CONTAINS',
        value: Array.isArray(values) ? values.map(String) : [String(values)],
        className: 'category',
        format: 'list'
      };
    }
  };

  NS.api = {
    NOT_LOGGED_IN: NOT_LOGGED_IN,
    req: req,
    me: me,
    orgIdFromDom: orgIdFromDom,
    getUser: getUser,
    getOrg: getOrg,
    getView: getView,
    normalizeViewSpace: normalizeViewSpace,
    viewFilterToGroups: viewFilterToGroups,
    listWorkitems: listWorkitems,
    listGroups: listGroups,
    getFieldMeta: getFieldMeta,
    getFieldValues: getFieldValues,
    getWorkitemById: getWorkitemById,
    customFieldValue: customFieldValue,
    saveWorkHours: saveWorkHours,
    pickFieldValue: pickFieldValue,
    cond: cond
  };
})();


  /* ================= src/detect.js ================= */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  // ---------------------------------------------------------------------------
  // 匹配规则常量
  // ---------------------------------------------------------------------------

  // 工时一定是数值型字段，先把候选池收窄到这三类 className
  // 面向所有企业发布，字段名的写法各家不同：简体、繁体（工時/實際）、英文都要认。
  // 繁体不是可选项——台港团队和云效繁体界面下字段名就是「預計工時」，漏了插件对他们直接失效。
  const NUMERIC_CLASSES = { float: true, number: true, integer: true };

  const RE_EST = /(预计|預計|预估|預估|计划|計劃|计畫|計畫|估算|estimated?|planned?)/i;
  const RE_ACT = /(实际|實際|登记|登記|真实|真實|已用|actual|spent|logged)/i;
  const RE_UNIT = /(工[时時]|小[时時]|hours?)/i;
  const RE_LABOR = /工[时時]/;
  const RE_HOUR = /(小[时時]|hours?)/i;
  const RE_PLAN_START = /(计划开始|計劃開始|开始时间|開始時間|start)/i;
  const RE_PLAN_END = /(计划完成|計劃完成|计划结束|計劃結束|截止|due|end)/i;

  // sumPlanedLaborHour / sumActualLaborHour 这类是只读汇总（rollup），写不进也统计不准
  const RE_SUMMARY_ID = /^sum/i;

  // 第一条工作项所属类型里可能压根没配工时字段，最多再往后试几条。
  // 取样时按 workitemTypeIdentifier 去重（需求/任务/缺陷各配的字段不一样），
  // 避免最近 N 条恰好全是同一种类型、而那种类型没有工时字段。
  const SAMPLE_LIMIT = 6;
  const SAMPLE_POOL = 50;              // 从最近这么多条里挑样本
  const PARTIAL_TTL_MS = 24 * 60 * 60 * 1000;   // 只探到一半的映射最多复用 1 天
  const RETRY_MIN_MS = 5 * 60 * 1000;           // 重探失败后的最短再试间隔（本进程内）

  // ---------------------------------------------------------------------------
  // 小工具
  // ---------------------------------------------------------------------------

  function api() {
    return NS.api;
  }

  function store() {
    return NS.store;
  }

  function str(v) {
    return v === null || v === undefined ? '' : String(v);
  }

  // 云效里先建的字段 identifier 数值更小，同分时优先取它；非数值 id 排到最后
  function idOrder(id) {
    return /^\d+$/.test(id) ? Number(id) : Number.MAX_SAFE_INTEGER;
  }

  // getFieldMeta 已做过一层归一，这里再兜一次别的形状，并按 id 去重
  function normalizeMeta(metaList) {
    const out = [];
    const seen = Object.create(null);
    if (!Array.isArray(metaList)) return out;
    for (let i = 0; i < metaList.length; i++) {
      const raw = metaList[i];
      if (!raw || typeof raw !== 'object') continue;
      const id = str(raw.id || raw.identifier || raw.fieldIdentifier).trim();
      const name = str(raw.name || raw.displayName || raw.label).trim();
      if (!id || !name) continue;
      if (seen[id]) continue;
      if (RE_SUMMARY_ID.test(id)) continue; // 排除 sum* 汇总字段
      seen[id] = true;
      out.push({
        id: id,
        name: name,
        className: str(raw.className || raw.fieldClassName).toLowerCase(),
        format: str(raw.format || raw.fieldFormat),
        type: str(raw.type || raw.fieldType),
        index: out.length
      });
    }
    return out;
  }

  function pick(field) {
    return field ? { id: field.id, name: field.name } : null;
  }

  // 分数高者胜；同分取 identifier 数值更小的；再同则取出现更早的
  function better(a, b) {
    if (!b) return true;
    if (a.score !== b.score) return a.score > b.score;
    const ao = idOrder(a.field.id);
    const bo = idOrder(b.field.id);
    if (ao !== bo) return ao < bo;
    return a.field.index < b.field.index;
  }

  function bestOf(fields, scoreFn) {
    let win = null;
    for (let i = 0; i < fields.length; i++) {
      const score = scoreFn(fields[i]);
      if (score < 0) continue;
      const cur = { field: fields[i], score: score };
      if (better(cur, win)) win = cur;
    }
    return win ? win.field : null;
  }

  // 工时字段打分：前缀词 +2，'工时/工時' +2，'小时/小時/hours' +1，SystemCustomField +1
  function scoreHour(field, roleRe) {
    if (!NUMERIC_CLASSES[field.className]) return -1;
    if (!roleRe.test(field.name)) return -1;
    if (!RE_UNIT.test(field.name)) return -1;
    let score = 2;
    if (RE_LABOR.test(field.name)) score += 2;
    if (RE_HOUR.test(field.name)) score += 1;
    if (field.type === 'SystemCustomField') score += 1;
    return score;
  }

  // 日期字段没有单位词可打分，用「精确短语 > 泛词」+ SystemCustomField 兜同分
  function scoreDate(field, strongRe, looseRe) {
    if (field.className !== 'date') return -1;
    if (!looseRe.test(field.name)) return -1;
    let score = strongRe.test(field.name) ? 2 : 1;
    if (field.type === 'SystemCustomField') score += 1;
    return score;
  }

  // ---------------------------------------------------------------------------
  // 纯函数：字段匹配
  // ---------------------------------------------------------------------------

  function matchFields(metaList) {
    const fields = normalizeMeta(metaList);

    let est = bestOf(fields, function (f) {
      return scoreHour(f, RE_EST);
    });
    let act = bestOf(fields, function (f) {
      return scoreHour(f, RE_ACT);
    });

    // 极端情况下同一个字段名同时命中两组词，保证预计/实际不指向同一字段
    if (est && act && est.id === act.id) {
      const estScore = scoreHour(est, RE_EST);
      const actScore = scoreHour(act, RE_ACT);
      const dup = est;
      if (estScore >= actScore) {
        act = bestOf(fields.filter(function (f) { return f.id !== dup.id; }), function (f) {
          return scoreHour(f, RE_ACT);
        });
      } else {
        est = bestOf(fields.filter(function (f) { return f.id !== dup.id; }), function (f) {
          return scoreHour(f, RE_EST);
        });
      }
    }

    // 退化：任一没命中，就拿所有名字含「工时」的 float 字段按 identifier 升序顶上
    let lowConfidence = false;
    if (!est || !act) {
      const pool = fields
        .filter(function (f) {
          return NUMERIC_CLASSES[f.className] && RE_LABOR.test(f.name);
        })
        .sort(function (a, b) {
          const d = idOrder(a.id) - idOrder(b.id);
          return d !== 0 ? d : a.index - b.index;
        });
      if (pool.length) {
        if (!est) {
          est = pool.filter(function (f) { return !act || f.id !== act.id; })[0] || null;
          if (est) lowConfidence = true;
        }
        if (!act) {
          act = pool.filter(function (f) { return !est || f.id !== est.id; })[0] || null;
          if (act) lowConfidence = true;
        }
      }
    }

    const planStart = bestOf(fields, function (f) {
      return scoreDate(f, /(计划开始)/, RE_PLAN_START);
    });
    const planEnd = bestOf(fields, function (f) {
      // 开始时间字段可能同时含 start/end 之外的词，先占走 planStart 的不再参选
      if (planStart && f.id === planStart.id) return -1;
      return scoreDate(f, /(计划完成|计划结束|截止)/, RE_PLAN_END);
    });

    return {
      estimated: pick(est),
      actual: pick(act),
      planStart: pick(planStart),
      planEnd: pick(planEnd),
      lowConfidence: lowConfidence
    };
  }

  function isUsable(map) {
    return !!(map && (map.estimated || map.actual || map.planStart || map.planEnd));
  }

  // 「完整」= 预计 + 实际都探到了。只探到日期字段的半成品映射也满足 isUsable，
  // 但不能当成最终答案永久缓存，否则首次刚好抽到没配工时字段的工作项就被钉死在 0h。
  function isComplete(map) {
    return !!(map && map.estimated && map.estimated.id && map.actual && map.actual.id);
  }

  function isFresh(map, ttl) {
    const t = Number(map && map.detectedAt) || 0;
    return t > 0 && (Date.now() - t) < ttl;
  }

  // ---------------------------------------------------------------------------
  // context()：身份与组织，内存缓存 + store 兜底
  // ---------------------------------------------------------------------------

  let ctxCache = null;
  let ctxPending = null;
  let ctxStaleAt = 0;                     // 降级身份是什么时候顶上来的
  const STALE_RETRY_MS = 60 * 1000;       // 降级身份最多复用这么久，之后重试真实身份

  // 从当前页面便宜地推断组织 id（location.href 优先，再扫 DOM），推不出返回 ''
  function pageOrgIdHint() {
    try {
      const fn = api() && api().orgIdFromDom;
      return typeof fn === 'function' ? str(fn()) : '';
    } catch (e) {
      return '';
    }
  }

  /**
   * 读降级用的身份缓存。缓存按组织分桶，能推断出当前组织时只认那一桶；
   * 推不出组织时才退回「最后一次成功的身份」，并统一打上 stale 标记——
   * 拿着 A 组织的身份去读写 B 组织的工作项会用错工时字段 id，写入路径必须能识别出来。
   */
  async function readCachedContext() {
    const hint = pageOrgIdHint();
    try {
      const c = await store().getContext(hint);
      if (!c || !c.userId) return null;
      // 明确推断出了当前组织，缓存却是别的组织的 —— 宁可报错让用户重新登录，也不能顶上来
      if (hint && str(c.orgId) !== hint) return null;
      c.stale = true;
      return c;
    } catch (e) {
      return null;
    }
  }

  async function fetchContext() {
    const me = await api().me();
    const ctx = {
      userId: str(me && me.userId),
      name: str(me && me.name),
      avatar: str(me && me.avatar),
      orgId: str(me && me.orgId),
      orgName: ''
    };
    if (ctx.orgId) {
      try {
        const org = await api().getOrg(ctx.orgId);
        ctx.orgName = str(org && org.name);
      } catch (e) {
        // 组织名只影响标题展示，取不到不算失败
      }
    }
    if (!ctx.orgName && ctx.orgId) {
      try {
        const cached = await store().getContext(ctx.orgId);
        if (cached && cached.orgName) ctx.orgName = cached.orgName;
      } catch (e) {
        // 组织名只影响标题展示
      }
    }
    try {
      await store().setContext(ctx);
    } catch (e) {
      // 写缓存失败不影响本次使用
    }
    return ctx;
  }

  function context(force) {
    // 降级身份（stale）只短暂复用：它会强制面板进入只读预演，网络恢复后必须能自己走出来，
    // 不能因为内存里缓存了一份就一直卡在降级态。
    const staleExpired = ctxCache && ctxCache.stale &&
      (Date.now() - ctxStaleAt) >= STALE_RETRY_MS;
    if (!force && ctxCache && !staleExpired) return Promise.resolve(ctxCache);
    if (ctxPending) return ctxPending;
    ctxPending = fetchContext().then(
      function (ctx) {
        ctxPending = null;
        ctxCache = ctx;
        ctxStaleAt = 0;
        return ctx;
      },
      async function (err) {
        ctxPending = null;
        // 断网/接口抖动时退回上次成功的身份，彻底没有才把错误抛给 UI 提示
        const cached = await readCachedContext();
        if (cached) {
          ctxCache = cached;
          ctxStaleAt = Date.now();
          return cached;
        }
        // 连缓存都不敢用（组织对不上）时，让错误浮到 UI，提示重新登录
        ctxCache = null;
        throw err;
      }
    );
    return ctxPending;
  }

  // ---------------------------------------------------------------------------
  // fieldMap()：探测 + 缓存
  // ---------------------------------------------------------------------------

  // 取自己名下最近的工作项当探测样本：先按工作项类型各取一条，再用剩下的补齐，
  // 这样「最近 3 条恰好都是需求（没配工时字段）」不会把探测结果打成半成品
  async function sampleWorkitemIds(userId) {
    const res = await api().listWorkitems({
      spaceType: 'User',
      spaceIdentifier: userId,
      scope: 'personal',
      category: '',
      conditionGroups: [[]],
      pageSize: SAMPLE_POOL,
      maxPages: 1
    });
    const items = (res && res.items) || [];
    const firstOfType = [];
    const rest = [];
    const seenType = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const id = str(it && it.identifier);
      if (!id) continue;
      const type = str(it && (it.workitemTypeIdentifier ||
        (it.workitemType && it.workitemType.identifier) || it.categoryIdentifier));
      const key = type || '__unknown__';
      if (!Object.prototype.hasOwnProperty.call(seenType, key)) {
        seenType[key] = 1;
        firstOfType.push(id);
      } else {
        rest.push(id);
      }
    }
    return firstOfType.concat(rest).slice(0, SAMPLE_LIMIT);
  }

  // 返回 FieldMap 或 null（一条工作项都没有 / 样本里没有可用字段）
  async function detectFieldMap(ctx) {
    const ids = await sampleWorkitemIds(ctx.userId);
    if (!ids.length) return null;

    let fallback = null;
    for (let i = 0; i < ids.length; i++) {
      let meta;
      try {
        meta = await api().getFieldMeta(ids[i]);
      } catch (e) {
        continue;
      }
      const map = matchFields(meta);
      // 不同工作项类型配的字段不一样，第一条没配工时就再看下一条
      if (map.estimated && map.actual) return map;
      if (!fallback && isUsable(map)) fallback = map;
    }
    return fallback;
  }

  let fmPending = null;
  let fmPendingKey = '';
  let lastDetectAt = 0;

  async function loadFieldMap(force) {
    const ctx = await context();
    const orgId = ctx.orgId;
    let cached = null;
    try {
      cached = await store().getFieldMap(orgId);
    } catch (e) {
      cached = null;
    }

    // 手动指定过的映射永不被探测覆盖，force 也不行
    if (cached && cached.manual) return cached;
    // 完整映射直接命中缓存；只探到一半的「部分映射」最多复用 PARTIAL_TTL_MS，
    // 之后自动重探一次，免得用户永远卡在「预计/实际 0h」还得自己去设置页点重新探测
    if (!force && isUsable(cached) && (isComplete(cached) || isFresh(cached, PARTIAL_TTL_MS))) {
      return cached;
    }
    // 重探失败（比如名下暂时一条工作项都没有）时不要每次调用都打接口，本进程内节流
    if (!force && isUsable(cached) && (Date.now() - lastDetectAt) < RETRY_MIN_MS) {
      return cached;
    }

    let detected = null;
    lastDetectAt = Date.now();
    try {
      detected = await detectFieldMap(ctx);
    } catch (e) {
      if (isUsable(cached)) return cached;
      throw e;
    }
    if (!detected) return isUsable(cached) ? cached : null;

    // 自动重探时只补不减：这次没探到的字段沿用上次探到的，避免样本抽样波动把已有映射抹掉。
    // force（用户在设置页点「重新探测」）是要一份干净结果，不做合并。
    const keep = (!force && isUsable(cached)) ? cached : null;
    const pickField = function (k) {
      return detected[k] || (keep ? keep[k] : null) || null;
    };
    const map = {
      estimated: pickField('estimated'),
      actual: pickField('actual'),
      planStart: pickField('planStart'),
      planEnd: pickField('planEnd'),
      lowConfidence: !!detected.lowConfidence,
      detectedAt: Date.now(),
      manual: false
    };
    try {
      await store().setFieldMap(orgId, map);
    } catch (e) {
      // 存不下也先把探测结果给出去
    }
    return map;
  }

  function fieldMap(force) {
    const key = force ? 'force' : 'normal';
    if (fmPending && fmPendingKey === key) return fmPending;
    fmPendingKey = key;
    fmPending = loadFieldMap(force).then(
      function (map) {
        fmPending = null;
        return map;
      },
      function (err) {
        fmPending = null;
        throw err;
      }
    );
    return fmPending;
  }

  // ---------------------------------------------------------------------------
  // describe()：给设置页/面板展示的中文说明
  // ---------------------------------------------------------------------------

  function fieldText(field) {
    return field ? '「' + field.name + '」#' + field.id : '未识别';
  }

  function whenText(ts) {
    if (!ts) return '';
    try {
      if (NS.util && typeof NS.util.toYMD === 'function') return NS.util.toYMD(ts);
      return new Date(ts).toLocaleDateString('zh-CN');
    } catch (e) {
      return '';
    }
  }

  function describe(map) {
    if (!map) return '未探测到字段映射，请确认云效里至少有一个工作项，或到设置页手动指定字段 identifier。';

    const head = map.manual ? '字段映射（手动指定）' : '字段映射（自动探测' + (whenText(map.detectedAt) ? '于 ' + whenText(map.detectedAt) : '') + '）';
    const parts = [
      '预计工时 = ' + fieldText(map.estimated),
      '实际工时 = ' + fieldText(map.actual),
      '计划开始 = ' + fieldText(map.planStart),
      '计划完成 = ' + fieldText(map.planEnd)
    ];

    let tail = '';
    if (!map.manual && map.lowConfidence) {
      tail = ' 注意：本次为退化匹配，置信度较低，建议到设置页核对后手动指定。';
    } else if (!map.estimated || !map.actual) {
      tail = ' 注意：工时字段未完全识别，相关统计会按 0 计算，建议到设置页手动指定。';
    }

    return head + '：' + parts.join('；') + '。' + tail;
  }

  // 设置页「重新探测」时清掉内存缓存，避免拿到旧身份
  function clearCache() {
    ctxCache = null;
    ctxPending = null;
    ctxStaleAt = 0;
    fmPending = null;
    fmPendingKey = '';
    lastDetectAt = 0;
  }

  NS.detect = {
    context: context,
    fieldMap: fieldMap,
    matchFields: matchFields,
    describe: describe,
    clearCache: clearCache
  };
})();


  /* ================= src/stats.js ================= */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  // stats.js 是纯计算模块：不碰 DOM、不发请求、不用 chrome API。
  // util.js 在加载顺序上排在前面，但为了能脱离宿主环境单测，这里对用到的
  // 几个小工具都保留了本地实现，优先复用 util 的版本。
  const U = NS.util || {};

  const MAX_DAYS = 400;
  const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const BASE_URL = 'https://devops.aliyun.com/projex/project/';
  const CSV_HEADER = [
    '编号', '标题', '项目', '类别', '状态', '负责人',
    '预计工时', '实际工时', '计划开始', '计划完成', '实际完成', '链接'
  ];
  const GROUP_LABELS = {
    project: '项目',
    category: '类别',
    status: '状态',
    stage: '阶段',
    assignee: '成员'
  };

  function pad2(n) {
    if (typeof U.pad2 === 'function') return U.pad2(n);
    return (n < 10 ? '0' : '') + n;
  }

  function toYMD(d) {
    if (typeof U.toYMD === 'function') return U.toYMD(d);
    const date = d instanceof Date ? d : new Date(d);
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function parseYMD(ymd) {
    if (typeof U.parseYMD === 'function') return U.parseYMD(ymd);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function isWeekendYMD(ymd) {
    if (typeof U.isWeekend === 'function') return !!U.isWeekend(ymd);
    const d = parseYMD(ymd);
    if (!d) return false;
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  }

  function daysBetween(startYMD, endYMD) {
    if (typeof U.daysBetween === 'function') return U.daysBetween(startYMD, endYMD) || [];
    const s = parseYMD(startYMD);
    const e = parseYMD(endYMD);
    if (!s || !e || s.getTime() > e.getTime()) return [];
    const out = [];
    const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    while (cur.getTime() <= e.getTime() && out.length < MAX_DAYS) {
      out.push(toYMD(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  function fmtHours(n) {
    if (typeof U.fmtHours === 'function') return U.fmtHours(n);
    const v = round1(toNum(n));
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  // 浮点求和会积出 0.30000000000000004 这类噪声，统计口径统一收到 2 位小数
  function round2(n) {
    const v = Number(n);
    if (!isFinite(v)) return 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  function round1(n) {
    const v = Number(n);
    if (!isFinite(v)) return 0;
    return Math.round((v + Number.EPSILON) * 10) / 10;
  }

  // 工时字段的 value 是字符串（'2'、'2.5'），空字符串 / 非数字一律按 0
  function toNum(v) {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  function str(v) {
    return v === null || v === undefined ? '' : String(v);
  }

  // customFields 里没值的字段是整条缺失，不是 value:null，取值必须做存在性判断
  function indexCustomFields(item) {
    const map = Object.create(null);
    const list = item && Array.isArray(item.customFields) ? item.customFields : [];
    for (let i = 0; i < list.length; i++) {
      const cf = list[i];
      if (!cf || cf.fieldIdentifier === null || cf.fieldIdentifier === undefined) continue;
      map[String(cf.fieldIdentifier)] = cf;
    }
    return map;
  }

  function cfValue(cfMap, fieldId) {
    if (!fieldId) return undefined;
    const cf = cfMap[String(fieldId)];
    if (!cf) return undefined;
    return cf.value;
  }

  function fieldId(fieldMap, key) {
    const f = fieldMap && fieldMap[key];
    if (!f || f.id === null || f.id === undefined || f.id === '') return null;
    return String(f.id);
  }

  // 日期自定义字段形如 '2026-08-28 00:00:00'，也兼容纯日期串和毫秒时间戳
  function toYMDFromFieldValue(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return tsToYMD(v);
    const s = String(v).trim();
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return m[1] + '-' + pad2(Number(m[2])) + '-' + pad2(Number(m[3]));
    if (/^\d{10,13}$/.test(s)) return tsToYMD(Number(s));
    return null;
  }

  function tsToYMD(ts) {
    const n = Number(ts);
    if (!isFinite(n) || n <= 0) return null;
    const d = new Date(n);
    if (isNaN(d.getTime())) return null;
    return toYMD(d);
  }

  // 当天 23:59:59.999 的本地时间戳（跨夏令时也不会偏，靠 Date 构造而非加 86400000）
  function endOfDayTs(ymd) {
    const d = parseYMD(ymd);
    if (!d) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  }

  function urlSegment(categoryIdentifier) {
    const c = str(categoryIdentifier).toLowerCase();
    if (c === 'req') return 'req';
    if (c === 'bug') return 'bug';
    return 'task';
  }

  function normalize(items, fieldMap, opts) {
    const list = Array.isArray(items) ? items : [];
    const o = opts || {};
    const basis = o.dateBasis === 'finishTime' || o.dateBasis === 'planStart' ? o.dateBasis : 'planEnd';
    const excludeCancelled = !!o.excludeCancelled;

    const estId = fieldId(fieldMap, 'estimated');
    const actId = fieldId(fieldMap, 'actual');
    const startId = fieldId(fieldMap, 'planStart');
    const endId = fieldId(fieldMap, 'planEnd');

    const rows = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') continue;

      const cfMap = indexCustomFields(item);
      const space = item.space || null;
      const projectId = (space && space.identifier) || item.spaceIdentifier || null;
      const status = item.status || null;
      const statusStage = item.statusStage || null;
      const workflowStage = (status && status.workflowStage) || null;
      const assignedTo = item.assignedTo || null;

      const statusName = str(status && status.name);
      const stageName = str((statusStage && statusStage.name) || (workflowStage && workflowStage.name));
      const rawStageId = statusStage && statusStage.id !== undefined && statusStage.id !== null
        ? statusStage.id
        : (status ? status.stageId : null);
      const stageId = rawStageId === null || rawStageId === undefined || rawStageId === ''
        ? null
        : Number(rawStageId);

      const id = str(item.identifier);
      // 云效对没填的自定义字段是整条不返回（不是 value:null），所以「字段缺失」和
      // 「填了 0」在数值上都会落成 0，只有这里能把两者分开，供提示文案用。
      const estRaw = cfValue(cfMap, estId);
      const estBlank = estRaw === undefined || estRaw === null || String(estRaw).trim() === '';
      const planStart = toYMDFromFieldValue(cfValue(cfMap, startId));
      const planEnd = toYMDFromFieldValue(cfValue(cfMap, endId));
      const finishTime = tsToYMD(item.finishTime);

      const isCancelled = statusName.indexOf('取消') >= 0;
      if (excludeCancelled && isCancelled) continue;

      let date = null;
      if (basis === 'finishTime') date = finishTime;
      else if (basis === 'planStart') date = planStart;
      else date = planEnd;

      rows.push({
        id: id,
        sn: str(item.serialNumber),
        subject: str(item.subject),
        projectId: projectId ? String(projectId) : null,
        project: str(space && space.name) || '(无项目)',
        category: str(item.category && item.category.name) || str(item.categoryIdentifier),
        status: statusName,
        stage: stageName,
        stageId: stageId !== null && isFinite(stageId) ? stageId : null,
        assigneeId: assignedTo && assignedTo.identifier ? String(assignedTo.identifier) : null,
        assignee: str(
          (assignedTo && (assignedTo.displayName || assignedTo.realName || assignedTo.nickName)) || ''
        ),
        avatar: str(assignedTo && assignedTo.avatar),
        est: round2(toNum(cfValue(cfMap, estId))),
        act: round2(toNum(cfValue(cfMap, actId))),
        // 预计工时字段识别出来了、但这个工作项上没有这个字段的值
        estMissing: !!estId && estBlank,
        planStart: planStart,
        planEnd: planEnd,
        finishTime: finishTime,
        date: date,
        isCancelled: isCancelled,
        // 真正完成只认云效原生的 finishTime：状态名各企业叫法不同，
        // 像「开发完成」只是开发阶段的一个状态，任务并没结束（云效自己仍标它逾期）。
        isDone: !!finishTime,
        // 状态名看起来像完成，仅供展示用，不参与逾期判定
        looksDone: statusName.indexOf('完成') >= 0 || stageName.indexOf('完成') >= 0,
        url: projectId && id ? BASE_URL + projectId + '/' + urlSegment(item.categoryIdentifier) + '/' + id : null
      });
    }
    return rows;
  }

  function summarize(rows) {
    const list = Array.isArray(rows) ? rows : [];
    let est = 0;
    let act = 0;
    const dateSet = Object.create(null);
    let days = 0;
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      est += toNum(r.est);
      act += toNum(r.act);
      if (r.date && !dateSet[r.date]) {
        dateSet[r.date] = true;
        days += 1;
      }
    }
    est = round2(est);
    act = round2(act);
    return {
      count: list.length,
      est: est,
      act: act,
      diff: round2(act - est),
      days: days,
      // avgPerDay 历史上一直是「预计」口径，保持不变；实际口径另给一个，
      // 免得调用方自己算一遍还算错除零
      avgPerDay: days > 0 ? round2(est / days) : 0,
      avgPerDayAct: days > 0 ? round2(act / days) : 0
    };
  }

  /**
   * 设置里的任务状态范围只影响本地统计，不参与接口查询和快照键。
   * “已完成”严格沿用 normalize 产出的 isDone（云效原生 finishTime）。
   */
  function filterByTaskScope(rows, scope) {
    const list = Array.isArray(rows) ? rows : [];
    if (scope !== 'completed') return list.slice();
    return list.filter(function (row) { return !!(row && row.isDone); });
  }

  /** 工作日目标偏差使用的有效工时合计。max 是逐任务取较大值，不是对两个总数取较大值。 */
  function workHoursTotal(rows, basis) {
    const list = Array.isArray(rows) ? rows : [];
    const mode = basis === 'estimated' || basis === 'actual' ? basis : 'max';
    let total = 0;
    for (let i = 0; i < list.length; i++) {
      const row = list[i] || {};
      const est = toNum(row.est);
      const act = toNum(row.act);
      total += mode === 'estimated' ? est : (mode === 'actual' ? act : Math.max(est, act));
    }
    return round2(total);
  }

  function groupKeyOf(row, key) {
    if (key === 'project') {
      return { key: row.projectId || row.project || '(无项目)', label: row.project || '(无项目)' };
    }
    if (key === 'assignee') {
      return { key: row.assigneeId || row.assignee || '(未指派)', label: row.assignee || '(未指派)' };
    }
    if (key === 'category') return { key: row.category || '(未分类)', label: row.category || '(未分类)' };
    if (key === 'status') return { key: row.status || '(无状态)', label: row.status || '(无状态)' };
    if (key === 'stage') return { key: row.stage || '(无阶段)', label: row.stage || '(无阶段)' };
    return { key: '(全部)', label: '(全部)' };
  }

  function groupBy(rows, key, basis) {
    const list = Array.isArray(rows) ? rows : [];
    const map = Object.create(null);
    const order = [];
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      const k = groupKeyOf(r, key);
      const id = String(k.key);
      if (!map[id]) {
        map[id] = { key: id, label: k.label, count: 0, est: 0, act: 0 };
        order.push(id);
      }
      const g = map[id];
      g.count += 1;
      g.est += toNum(r.est);
      g.act += toNum(r.act);
    }
    const out = order.map(function (id) {
      const g = map[id];
      g.est = round2(g.est);
      g.act = round2(g.act);
      return g;
    });
    // 主工时降序 → count 降序 → label 升序（最后一档只为结果稳定，避免同分时顺序随机）。
    // basis='act' 时按实际排，其余按预计排：用实际工时统计的团队，按预计排出来的顺序没意义。
    const useAct = basis === 'act';
    out.sort(function (a, b) {
      const av = useAct ? a.act : a.est;
      const bv = useAct ? b.act : b.est;
      if (bv !== av) return bv - av;
      if (b.count !== a.count) return b.count - a.count;
      return String(a.label).localeCompare(String(b.label), 'zh-Hans-CN');
    });
    return out;
  }

  function byDay(rows, startYMD, endYMD, opts) {
    const list = Array.isArray(rows) ? rows : [];
    const o = opts || {};
    const target = o.dailyTargetHours === null || o.dailyTargetHours === undefined
      ? 8
      : toNum(o.dailyTargetHours);

    const bucket = Object.create(null);
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      if (!r.date) continue;
      if (!bucket[r.date]) bucket[r.date] = { count: 0, est: 0, act: 0 };
      const b = bucket[r.date];
      b.count += 1;
      b.est += toNum(r.est);
      b.act += toNum(r.act);
    }

    const days = daysBetween(startYMD, endYMD);
    return days.map(function (ymd) {
      const b = bucket[ymd] || { count: 0, est: 0, act: 0 };
      const d = parseYMD(ymd);
      const dow = d ? d.getDay() : 0;
      const weekend = isWeekendYMD(ymd);
      const workday = typeof o.isWorkday === 'function' ? o.isWorkday(ymd) !== false : !weekend;
      const dayTarget = workday ? target : 0;
      const est = round2(b.est);
      return {
        ymd: ymd,
        dow: dow,
        weekday: WEEKDAY_LABELS[dow],
        isWeekend: weekend,
        isWorkday: workday,
        count: b.count,
        est: est,
        act: round2(b.act),
        target: dayTarget,
        deficit: round2(Math.max(0, dayTarget - est))
      };
    });
  }

  function byMember(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const map = Object.create(null);
    const order = [];
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      const id = String(r.assigneeId || r.assignee || '(未指派)');
      if (!map[id]) {
        map[id] = {
          id: r.assigneeId || null,
          key: id,
          label: r.assignee || '(未指派)',
          name: r.assignee || '(未指派)',
          avatar: r.avatar || '',
          count: 0,
          est: 0,
          act: 0,
          diff: 0,
          days: 0,
          _dates: Object.create(null)
        };
        order.push(id);
      }
      const m = map[id];
      m.count += 1;
      m.est += toNum(r.est);
      m.act += toNum(r.act);
      if (r.date && !m._dates[r.date]) {
        m._dates[r.date] = true;
        m.days += 1;
      }
      if (!m.avatar && r.avatar) m.avatar = r.avatar;
    }
    const out = order.map(function (id) {
      const m = map[id];
      delete m._dates;
      m.est = round2(m.est);
      m.act = round2(m.act);
      m.diff = round2(m.act - m.est);
      return m;
    });
    out.sort(function (a, b) {
      if (b.est !== a.est) return b.est - a.est;
      if (b.count !== a.count) return b.count - a.count;
      return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
    });
    return out;
  }

  function overdue(rows, nowTs) {
    const list = Array.isArray(rows) ? rows : [];
    const now = nowTs === null || nowTs === undefined ? Date.now() : Number(nowTs);
    const result = { total: 0, overdue: 0, rate: 0, list: [] };
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      // 没有计划完成时间的、已取消的，都不算逾期也不计入分母
      if (!r.planEnd || r.isCancelled) continue;
      result.total += 1;
      let late = false;
      if (r.finishTime) {
        // 真正完成（云效给了 finishTime）：看实际完成日是否晚于计划完成日
        // 都是 YYYY-MM-DD，可直接字符串比较
        late = r.finishTime > r.planEnd;
      } else {
        // 没有 finishTime 就是没结束 —— 哪怕状态叫「开发完成」也一样，
        const deadline = endOfDayTs(r.planEnd);
        late = deadline !== null && isFinite(now) && now > deadline;
      }
      if (late) {
        result.overdue += 1;
        result.list.push(r);
      }
    }
    result.rate = result.total > 0 ? round1((result.overdue / result.total) * 100) : 0;
    return result;
  }

  // 「没标记工时」= 该口径下的工时 <= 0：字段整条没值和明确填了 0 都算，
  // 两者都得补一个真实数字，统计上没有区别。已取消的任务不提示——跟逾期口径一致，
  // 取消掉的任务再去补工时没有意义。
  //
  // basis: 'est'（默认）/ 'act' / 'both'。'both' 表示两个字段都要用，
  // 所以任一为空就算没填全 —— 缺哪个都会让那一套统计失真。
  function isMissingHours(row, basis) {
    if (!row || row.isCancelled) return false;
    const b = basis === 'act' || basis === 'both' ? basis : 'est';
    if (b === 'est') return toNum(row.est) <= 0;
    if (b === 'act') return toNum(row.act) <= 0;
    return toNum(row.est) <= 0 || toNum(row.act) <= 0;
  }

  // 调用方必须先确认对应字段已识别：字段没识别出来时那一列全是 0，
  // 这里会把整张表判成未填，那是字段映射问题，不是漏填。
  function missingHours(rows, basis) {
    const list = Array.isArray(rows) ? rows : [];
    const out = { count: 0, total: 0, rate: 0, list: [], est: 0, act: 0 };
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      if (r.isCancelled) continue;
      out.total += 1;
      // 分别记一份，供 'both' 模式在提示里说清「预计缺几条、实际缺几条」
      if (toNum(r.est) <= 0) out.est += 1;
      if (toNum(r.act) <= 0) out.act += 1;
      if (isMissingHours(r, basis)) {
        out.count += 1;
        out.list.push(r);
      }
    }
    out.rate = out.total > 0 ? round1((out.count / out.total) * 100) : 0;
    return out;
  }

  // 旧名保留：0.1.x 起就在用，改名会把已有调用和断言全打断
  function isMissingEst(row) { return isMissingHours(row, 'est'); }
  function missingEst(rows) { return missingHours(rows, 'est'); }

  function mdCell(s) {
    // 表格单元格里的竖线和换行会撑破 markdown 表格
    return str(s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  }

  function toMarkdown(rows, opts) {
    const list = Array.isArray(rows) ? rows : [];
    const o = opts || {};
    const gk = GROUP_LABELS[o.groupKey] ? o.groupKey : 'project';
    const sum = summarize(list);

    const parts = [];
    if (o.start && o.end) {
      parts.push(str(o.start) + ' ~ ' + str(o.end));
    } else if (o.start || o.end) {
      parts.push(str(o.start || o.end));
    }
    // 统计口径决定日报里出不出现某一列：只用预计的团队，日报里摆一列全 0 的实际工时纯属噪音
    const basis = o.basis === 'actual' || o.basis === 'both' ? o.basis : 'estimated';
    const showEst = basis === 'estimated' || basis === 'both';
    const showAct = basis === 'actual' || basis === 'both';
    const estName = str(o.estLabel) || '预计';
    const actName = str(o.actLabel) || '实际';

    parts.push(sum.count + ' 个任务');
    if (showEst) parts.push(estName + ' ' + fmtHours(sum.est) + 'h');
    if (showAct) parts.push(actName + ' ' + fmtHours(sum.act) + 'h');

    const cols = [];
    if (showEst) cols.push({ name: estName + '(h)', pick: function (x) { return x.est; } });
    if (showAct) cols.push({ name: actName + '(h)', pick: function (x) { return x.act; } });

    const lines = [];
    if (o.title) lines.push('### ' + mdCell(o.title));
    lines.push('> ' + parts.join(' · '));
    lines.push('');
    lines.push('| ' + GROUP_LABELS[gk] + ' | 任务数 | ' +
      cols.map(function (c) { return c.name; }).join(' | ') + ' |');
    lines.push('| --- | ---: |' + cols.map(function () { return ' ---: |'; }).join(''));

    const groups = groupBy(list, gk, basis === 'actual' ? 'act' : 'est');
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      lines.push('| ' + mdCell(g.label) + ' | ' + g.count + ' | ' +
        cols.map(function (c) { return fmtHours(c.pick(g)); }).join(' | ') + ' |');
    }
    lines.push('| **合计** | **' + sum.count + '** | ' +
      cols.map(function (c) { return '**' + fmtHours(c.pick(sum)) + '**'; }).join(' | ') + ' |');

    // 汇总表只回答「花在哪个项目」，日报周报和绩效自评要回答「具体做了什么」，
    // 所以默认再带一份按同一维度分组的任务清单。detail:false 可关掉。
    if (o.detail !== false && list.length) {
      const cap = o.detailLimit === undefined ? 200 : Number(o.detailLimit);
      const byKey = Object.create(null);
      for (let i = 0; i < list.length; i++) {
        const r = list[i] || {};
        const k = String(groupKeyOf(r, gk).key);
        if (!byKey[k]) byKey[k] = [];
        byKey[k].push(r);
      }
      lines.push('');
      lines.push('#### 明细');
      let printed = 0;
      let omitted = 0;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const bucket = byKey[g.key] || [];
        lines.push('');
        lines.push('**' + mdCell(g.label) + '**（' + g.count + ' 个 · ' +
          (basis === 'actual' ? actName + ' ' + fmtHours(g.act) : estName + ' ' + fmtHours(g.est)) + 'h）');
        for (let j = 0; j < bucket.length; j++) {
          if (printed >= cap) { omitted += 1; continue; }
          const r = bucket[j];
          const bits = [];
          if (r.status) bits.push(str(r.status));
          if (showEst) bits.push(estName + ' ' + fmtHours(r.est) + 'h');
          if (showAct && (r.act || !showEst)) bits.push(actName + ' ' + fmtHours(r.act) + 'h');
          const sn = r.sn ? mdCell(r.sn) + ' ' : '';
          lines.push('- ' + sn + mdCell(r.subject) + ' — ' + bits.join(' · '));
          printed += 1;
        }
      }
      if (omitted) {
        lines.push('');
        lines.push('> 明细只列出前 ' + cap + ' 条，另有 ' + omitted + ' 条未展开。');
      }
    }
    return lines.join('\n');
  }

  function csvNum(n) {
    return String(round2(toNum(n)));
  }

  // 以 = + - @ 开头的文本在 Excel / WPS 里会被当公式执行（OWASP 列的危险前导字符），导出前打断。
  // 只作用于文本列；数值列走 csvNum，不经过这里，所以负数显示不受影响。
  function csvSafeText(v) {
    const s = str(v);
    if (/^[=+\-@\t\r]/.test(s)) return '\'' + s;
    return s;
  }

  function csvCell(v) {
    const s = str(v);
    if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function toCsv(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const lines = [CSV_HEADER.map(csvCell).join(',')];
    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      lines.push([
        csvCell(csvSafeText(r.sn)),
        csvCell(csvSafeText(r.subject)),
        csvCell(csvSafeText(r.project)),
        csvCell(csvSafeText(r.category)),
        csvCell(csvSafeText(r.status)),
        csvCell(csvSafeText(r.assignee)),
        csvCell(csvNum(r.est)),
        csvCell(csvNum(r.act)),
        csvCell(str(r.planStart)),
        csvCell(str(r.planEnd)),
        csvCell(str(r.finishTime)),
        csvCell(str(r.url))
      ].join(','));
    }
    // UTF-8 BOM，Excel 直接双击打开不乱码
    return '\ufeff' + lines.join('\r\n') + '\r\n';
  }

  NS.stats = {
    normalize: normalize,
    summarize: summarize,
    filterByTaskScope: filterByTaskScope,
    workHoursTotal: workHoursTotal,
    groupBy: groupBy,
    byDay: byDay,
    byMember: byMember,
    overdue: overdue,
    isMissingEst: isMissingEst,
    missingEst: missingEst,
    isMissingHours: isMissingHours,
    missingHours: missingHours,
    toMarkdown: toMarkdown,
    toCsv: toCsv
  };
})();

/*
 * 单测契约（输入 → 输出），全部为纯函数，无 DOM / 网络 / chrome API：
 *
 * normalize(items, fieldMap, opts) -> Row[]
 *   items:    云效 /workitem/list 返回的 result 数组；非数组一律按 [] 处理，脏元素跳过。
 *   fieldMap: {estimated|actual|planStart|planEnd: {id, name} | null}；整体可为 null（此时工时按 0、
 *             计划日期按 null）。字段 id 全部来自运行时探测，模块内不含任何硬编码 id。
 *   opts:     {dateBasis:'planEnd'|'finishTime'|'planStart'（其它值退回 'planEnd'）,
 *              excludeCancelled:boolean（为真时剔除 isCancelled 行；未传视为 false）}
 *   Row:      {id, sn, subject, projectId, project, category, status, stage, stageId,
 *              assigneeId, assignee, avatar, est, act, estMissing, planStart, planEnd,
 *              finishTime, date, isCancelled, isDone, url}
 *   取值要点：customFields 无值时整条缺失（不是 value:null），故按 fieldIdentifier 建索引后判存在；
 *             value 是字符串，parseFloat 失败按 0；日期字段 '2026-08-28 00:00:00' 截成 'YYYY-MM-DD'；
 *             finishTime 是毫秒时间戳或 null，按本地时区转 'YYYY-MM-DD'；
 *             url = https://devops.aliyun.com/projex/project/{projectId}/{req|bug|task}/{id}，
 *             projectId 缺失时 url 为 null。
 *
 * summarize(rows) -> {count, est, act, diff, days, avgPerDay}
 *   diff = act - est；days = 有 date 的不同日期数；avgPerDay = days ? est/days : 0；
 *   金额型数值统一保留 2 位小数。
 *
 * groupBy(rows, key) -> [{key, label, count, est, act}]
 *   key ∈ 'project'|'category'|'status'|'stage'|'assignee'（其它值归为单组 '(全部)'）。
 *   排序：est 降序 → count 降序 → label 升序（末位比较仅为结果稳定）。
 *   分组键：project 用 projectId、assignee 用 assigneeId，label 用名称；名称为空时给占位文案。
 *
 * byDay(rows, startYMD, endYMD, opts) -> [{ymd, dow, weekday, isWeekend, count, est, act, target, deficit}]
 *   覆盖区间内每一天（无数据补 0），上限 400 天；start > end 或日期非法时返回 []。
 *   target = isWeekend ? 0 : opts.dailyTargetHours（默认 8）；deficit = max(0, target - est)。
 *   dow(0=周日) 与 weekday('周一' 文案) 为 SPEC 之外的附加字段，供日历渲染直接用。
 *
 * byMember(rows) -> [{id, key, label, name, avatar, count, est, act, diff, days}]
 *   按负责人聚合（assigneeId 缺失时用姓名，再缺退 '(未指派)'），排序同 groupBy。
 *
 * overdue(rows, nowTs) -> {total, overdue, rate, list}
 *   分母：有 planEnd 且未取消的行；已取消的既不逾期也不计入分母。
 *   有 finishTime（真正结束）：finishTime > planEnd 才算逾期；
 *   无 finishTime：now > planEnd 当天 23:59:59 算逾期（状态名叫「开发完成」也一样）。
 *   未完成：nowTs > planEnd 当天 23:59:59.999（本地时区）算逾期。
 *   rate：百分数 number，保留 1 位小数；total 为 0 时为 0。list 为原始 Row 引用（不复制、不修改）。
 *
 * isMissingEst(row) -> boolean
 *   未取消 且 est <= 0（字段整条没值或明确填 0 都算）。取消的行恒为 false。
 *
 * missingEst(rows) -> {count, total, rate, list}
 *   total：未取消的行数（分母）；count：其中未填预计工时的行数；rate：百分数，1 位小数。
 *   调用前须确认「预计工时」字段已识别，否则整表都会被判成未填。
 *
 * toMarkdown(rows, opts) -> string
 *   opts:{groupKey（默认 'project'）, start, end, title}；首行 '> {start} ~ {end} · N 个任务 · 预计 Xh · 实际 Yh'，
 *   随后按 groupKey 分组的四列表格，末行为合计。label 里的 '|' 与换行会被转义。
 *
 * toCsv(rows) -> string
 *   带 UTF-8 BOM，CRLF 换行；列：编号,标题,项目,类别,状态,负责人,预计工时,实际工时,计划开始,计划完成,实际完成,链接。
 *   含逗号/引号/换行/首尾空白的字段用双引号包裹且内部引号翻倍；以 = + - @ 开头的文本前置单引号，
 *   防 Excel 公式注入（数值列不做此处理，避免负数被改写）。
 */


  /* ================= src/workcalendar.js ================= */
/**
 * YXWT.workcalendar —— 中国大陆法定节假日 / 调休补班日历（纯本地数据）。
 *
 * 数据来自国务院年度放假通知，由 holiday-cn 的年度 JSON 交叉整理：
 * https://github.com/NateScarlet/holiday-cn
 * 这里只保存会改变“周一至周五”默认规则的日期，不会在运行时请求第三方网站。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});
  const U = NS.util;

  const CALENDAR = {
    2023: {
      paper: 'http://www.gov.cn/zhengce/zhengceku/2022-12/08/content_5730844.htm',
      off: '2022-12-31,2023-01-01,2023-01-02,2023-01-21,2023-01-22,2023-01-23,2023-01-24,2023-01-25,2023-01-26,2023-01-27,2023-04-05,2023-04-29,2023-04-30,2023-05-01,2023-05-02,2023-05-03,2023-06-22,2023-06-23,2023-06-24,2023-09-29,2023-09-30,2023-10-01,2023-10-02,2023-10-03,2023-10-04,2023-10-05,2023-10-06',
      work: '2023-01-28,2023-01-29,2023-04-23,2023-05-06,2023-06-25,2023-10-07,2023-10-08'
    },
    2024: {
      paper: 'https://www.gov.cn/zhengce/zhengceku/202310/content_6911528.htm',
      off: '2024-01-01,2024-02-10,2024-02-11,2024-02-12,2024-02-13,2024-02-14,2024-02-15,2024-02-16,2024-02-17,2024-04-04,2024-04-05,2024-04-06,2024-05-01,2024-05-02,2024-05-03,2024-05-04,2024-05-05,2024-06-10,2024-09-15,2024-09-16,2024-09-17,2024-10-01,2024-10-02,2024-10-03,2024-10-04,2024-10-05,2024-10-06,2024-10-07',
      work: '2024-02-04,2024-02-18,2024-04-07,2024-04-28,2024-05-11,2024-09-14,2024-09-29,2024-10-12'
    },
    2025: {
      paper: 'https://www.gov.cn/zhengce/zhengceku/202411/content_6986383.htm',
      off: '2025-01-01,2025-01-28,2025-01-29,2025-01-30,2025-01-31,2025-02-01,2025-02-02,2025-02-03,2025-02-04,2025-04-04,2025-04-05,2025-04-06,2025-05-01,2025-05-02,2025-05-03,2025-05-04,2025-05-05,2025-05-31,2025-06-01,2025-06-02,2025-10-01,2025-10-02,2025-10-03,2025-10-04,2025-10-05,2025-10-06,2025-10-07,2025-10-08',
      work: '2025-01-26,2025-02-08,2025-04-27,2025-09-28,2025-10-11'
    },
    2026: {
      paper: 'https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm',
      off: '2026-01-01,2026-01-02,2026-01-03,2026-02-15,2026-02-16,2026-02-17,2026-02-18,2026-02-19,2026-02-20,2026-02-21,2026-02-22,2026-02-23,2026-04-04,2026-04-05,2026-04-06,2026-05-01,2026-05-02,2026-05-03,2026-05-04,2026-05-05,2026-06-19,2026-06-20,2026-06-21,2026-09-25,2026-09-26,2026-09-27,2026-10-01,2026-10-02,2026-10-03,2026-10-04,2026-10-05,2026-10-06,2026-10-07',
      work: '2026-01-04,2026-02-14,2026-02-28,2026-05-09,2026-09-20,2026-10-10'
    }
  };

  const INDEX = {};
  Object.keys(CALENDAR).forEach(function (year) {
    const src = CALENDAR[year];
    const dates = {};
    String(src.off || '').split(',').filter(Boolean).forEach(function (d) { dates[d] = false; });
    String(src.work || '').split(',').filter(Boolean).forEach(function (d) { dates[d] = true; });
    INDEX[year] = dates;
  });

  function classify(ymd) {
    const day = U && U.toYMD ? U.toYMD(ymd) : String(ymd || '').slice(0, 10);
    const year = day ? day.slice(0, 4) : '';
    const dates = INDEX[year];
    if (dates && Object.prototype.hasOwnProperty.call(dates, day)) {
      return { workday: dates[day], supported: true, adjusted: true };
    }
    const d = U && U.parseYMD ? U.parseYMD(day) : null;
    const dow = d ? d.getDay() : -1;
    return {
      workday: dow >= 1 && dow <= 5,
      supported: !!dates,
      adjusted: false
    };
  }

  function summarize(start, end, dailyHours, memberCount) {
    const days = U && U.daysBetween ? U.daysBetween(start, end) : [];
    const unsupported = {};
    let workdays = 0;
    days.forEach(function (ymd) {
      const c = classify(ymd);
      if (c.workday) workdays++;
      if (!c.supported) unsupported[ymd.slice(0, 4)] = true;
    });
    const perDay = Math.max(0, Number(dailyHours) || 0);
    const people = Math.max(1, Math.floor(Number(memberCount) || 1));
    return {
      workdays: workdays,
      hours: workdays * perDay * people,
      dailyHours: perDay,
      memberCount: people,
      unsupportedYears: Object.keys(unsupported).sort(),
      days: days.length
    };
  }

  NS.workcalendar = {
    supportedYears: Object.keys(CALENDAR).map(Number).sort(),
    classify: classify,
    summarize: summarize
  };
})();


  /* ================= src/range-data.js ================= */
/**
 * YXWT.rangeData —— 面板与悬浮统计共用的“精确日期区间”加载和本地快照。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});
  const U = NS.util;
  const CONCURRENCY = 3;
  const FINISH_PAD_DAYS = 90;
  const dailyInFlight = Object.create(null);

  function fieldError(message) {
    const e = new Error(message);
    e.__yxwtField = true;
    return e;
  }

  function errText(e) {
    const raw = e && e.message ? String(e.message) : String(e || '未知错误');
    return raw === 'YXWT_NOT_LOGGED_IN' ? '未登录云效或登录已过期' : raw;
  }

  function rangeFromPrefs(prefs) {
    const key = (prefs && prefs.defaultRange) || 'thisWeek';
    const presets = U.rangePresets();
    let picked = presets.filter(function (p) { return p.key === key; })[0];
    if (!picked) picked = presets[2];
    return { key: picked.key, label: picked.label, start: picked.start, end: picked.end };
  }

  function currentMonthRange() {
    const presets = U.rangePresets();
    const picked = presets.filter(function (p) { return p.key === 'thisMonth'; })[0];
    return { key: picked.key, label: picked.label, start: picked.start, end: picked.end };
  }

  function localDayKey(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (!d || !isFinite(d.getTime())) return '';
    const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }

  function isSameLocalDay(a, b) {
    const ak = localDayKey(a);
    return !!ak && ak === localDayKey(b);
  }

  /**
   * @param prefs 当前偏好
   * @param override 调用方手上的实时选择 {includeSelf, memberIds}。
   *
   * 为什么要有 override：面板里改成员是「先改 state -> 异步落盘 -> 立刻 load」，
   * 这里若一律回读存储，就会读到还没写完的旧值，再把用户刚点的选择覆盖回去
   * （表现为：取消自己之后界面纹丝不动，非得手点一次「加载此区间」）。
   * 用户在界面上的选择才是权威，存储只是它的持久化副本。
   */
  async function resolve(prefs, override) {
    const ov = override || {};
    const ctx = await NS.detect.context();
    const orgId = String((ctx && ctx.orgId) || '');
    const memberIds = Array.isArray(ov.memberIds)
      ? ov.memberIds.slice()
      : (orgId ? await NS.store.getMembers(orgId) : []);
    const contacts = orgId ? await NS.store.getContacts(orgId) : {};
    const fieldMap = await NS.detect.fieldMap();
    if (!fieldMap) {
      throw fieldError('没探测到工时字段：云效里至少要有一个工作项，也可以到设置页手动指定字段 identifier。');
    }

    const missing = [];
    if (!fieldMap.estimated || !fieldMap.estimated.id) missing.push('预计工时');
    if (!fieldMap.actual || !fieldMap.actual.id) missing.push('实际工时');
    const fieldWarn = missing.length
      ? '未识别到「' + missing.join('」「') + '」字段，相关数字按 0 计算。可到设置页手动指定字段 identifier。'
      : '';

    const meId = String((ctx && ctx.userId) || '');
    if (!meId) throw new Error('未取到当前用户');
    let includeSelf = ov.includeSelf === undefined
      ? (!prefs || prefs.includeSelf !== false)
      : !!ov.includeSelf;
    const members = [];
    if (includeSelf) members.push({ id: meId, name: (ctx && ctx.name) || '我', self: true });
    (memberIds || []).forEach(function (id) {
      const uid = String(id || '');
      if (!uid || uid === meId) return;
      const c = contacts[uid] || {};
      members.push({ id: uid, name: c.name || uid });
    });
    // 本地状态如果意外变成“不含自己 + 没有同事”，兜回只看自己，避免发出空成员查询。
    if (!members.length) {
      includeSelf = true;
      members.push({ id: meId, name: (ctx && ctx.name) || '我', self: true });
    }

    return {
      ctx: ctx,
      prefs: prefs || {},
      includeSelf: includeSelf,
      memberIds: (memberIds || []).map(String),
      contacts: contacts || {},
      fieldMap: fieldMap,
      fieldWarn: fieldWarn,
      members: members
    };
  }

  function dateField(scope, dateBasis) {
    const basisKey = dateBasis === 'planStart' ? 'planStart' : 'planEnd';
    const field = scope && scope.fieldMap && scope.fieldMap[basisKey];
    if (!field || !field.id) {
      throw fieldError('没识别到「' + (basisKey === 'planStart' ? '计划开始时间' : '计划完成时间') + '」字段，请到设置页手动指定后重试。');
    }
    return field;
  }

  function cacheKey(scope, opts) {
    const o = opts || {};
    const fm = (scope && scope.fieldMap) || {};
    const fieldSig = ['estimated', 'actual', 'planStart', 'planEnd'].map(function (k) {
      return String((fm[k] && fm[k].id) || '');
    }).join(',');
    const members = ((scope && scope.members) || []).map(function (m) { return String(m.id); }).sort();
    return [
      'v1',
      String(scope && scope.ctx && scope.ctx.orgId || ''),
      members.join(','),
      String(o.dateBasis || 'planEnd'),
      String(o.start || ''),
      String(o.end || ''),
      o.excludeCancelled === false ? '0' : '1',
      fieldSig
    ].join('|');
  }

  async function readSnapshot(scope, opts) {
    dateField(scope, opts && opts.dateBasis);
    const key = cacheKey(scope, opts);
    const hit = await NS.store.getRangeSnapshot(key);
    if (!hit || !Array.isArray(hit.rows)) return null;
    hit.cacheKey = key;
    return hit;
  }

  async function fetchSnapshot(scope, opts) {
    const o = opts || {};
    const start = String(o.start || '');
    const end = String(o.end || '');
    const dateBasis = o.dateBasis || 'planEnd';
    if (!start || !end || start > end) throw new Error('统计日期范围无效');
    const field = dateField(scope, dateBasis);

    let qStart = start;
    let qEnd = end;
    if (dateBasis === 'finishTime') {
      qStart = U.toYMD(U.addDays(U.parseYMD(start), -FINISH_PAD_DAYS)) || start;
      qEnd = U.toYMD(U.addDays(U.parseYMD(end), FINISH_PAD_DAYS)) || end;
    }

    const members = scope.members || [];
    const loadedBy = {};
    const progress = function (done) {
      if (typeof o.onProgress !== 'function') return;
      let loaded = 0;
      Object.keys(loadedBy).forEach(function (id) { loaded += loadedBy[id] || 0; });
      o.onProgress({ done: done, total: members.length, loaded: loaded });
    };
    let done = 0;
    progress(done);

    const results = await U.pmap(members, function (m) {
      return NS.api.listWorkitems({
        spaceType: 'User',
        spaceIdentifier: m.id,
        scope: 'personal',
        category: '',
        conditionGroups: [[
          NS.api.cond.user('assignedTo', [m.id]),
          NS.api.cond.dateBetween(field.id, qStart, qEnd)
        ]],
        orderBy: { fieldIdentifier: field.id, order: 'desc', className: 'date', format: 'input' },
        pageSize: 200,
        maxPages: 20,
        onProgress: function (loaded) {
          loadedBy[m.id] = loaded || 0;
          progress(done);
        }
      }).then(function (res) {
        done++;
        progress(done);
        return res;
      });
    }, CONCURRENCY);

    const items = [];
    const seen = {};
    const memberErrors = [];
    let truncated = false;
    results.forEach(function (r, i) {
      if (!r || r.__error) {
        memberErrors.push({ name: members[i].name, error: errText(r && r.__error ? { message: r.__error } : null) });
        return;
      }
      if (r.truncated) truncated = true;
      (r.items || []).forEach(function (it) {
        const id = it && it.identifier;
        if (!id || seen[id]) return;
        seen[id] = true;
        items.push(it);
      });
    });
    if (memberErrors.length && memberErrors.length === members.length) {
      throw new Error(memberErrors[0].error);
    }

    let rows = NS.stats.normalize(items, scope.fieldMap, {
      dateBasis: dateBasis,
      excludeCancelled: o.excludeCancelled !== false
    }) || [];
    if (dateBasis === 'finishTime') {
      rows = rows.filter(function (r) { return r.date && r.date >= start && r.date <= end; });
    }

    const snapshot = {
      savedAt: isFinite(Number(o.now)) ? Number(o.now) : Date.now(),
      start: start,
      end: end,
      dateBasis: dateBasis,
      rows: rows,
      truncated: truncated,
      memberErrors: memberErrors
    };
    const key = cacheKey(scope, o);
    await NS.store.setRangeSnapshot(key, snapshot);
    snapshot.cacheKey = key;
    return snapshot;
  }

  /**
   * 每个“组织 + 成员 + 口径”的本月快照每天最多自动全量刷新一次。
   * 失败时保留旧快照，让调用方决定是继续显示旧数据还是报错；同页并发调用共用同一个 Promise。
   */
  function refreshThisMonthIfNeeded(scope, prefs, options) {
    const o = options || {};
    const range = currentMonthRange();
    const query = {
      start: range.start,
      end: range.end,
      dateBasis: (prefs && prefs.dateBasis) || 'planEnd',
      excludeCancelled: !prefs || prefs.excludeCancelled !== false
    };
    const key = cacheKey(scope, query);
    if (dailyInFlight[key]) return dailyInFlight[key];

    const now = isFinite(Number(o.now)) ? Number(o.now) : Date.now();
    const task = readSnapshot(scope, query).then(function (hit) {
      if (hit && isSameLocalDay(hit.savedAt, now)) {
        return { range: range, query: query, snapshot: hit, refreshed: false, error: null };
      }
      return fetchSnapshot(scope, Object.assign({}, query, {
        now: now,
        onProgress: o.onProgress
      })).then(function (snapshot) {
        return { range: range, query: query, snapshot: snapshot, refreshed: true, error: null };
      }, function (error) {
        return { range: range, query: query, snapshot: hit || null, refreshed: false, error: error };
      });
    });

    dailyInFlight[key] = task;
    task.then(function () { delete dailyInFlight[key]; }, function () { delete dailyInFlight[key]; });
    return task;
  }

  NS.rangeData = {
    FINISH_PAD_DAYS: FINISH_PAD_DAYS,
    rangeFromPrefs: rangeFromPrefs,
    currentMonthRange: currentMonthRange,
    isSameLocalDay: isSameLocalDay,
    resolve: resolve,
    cacheKey: cacheKey,
    readSnapshot: readSnapshot,
    fetchSnapshot: fetchSnapshot,
    refreshThisMonthIfNeeded: refreshThisMonthIfNeeded
  };
})();


  /* ================= src/ui.js ================= */
/**
 * YXWT.ui —— 设计系统层（Shadow DOM + 设计令牌 + 无依赖 DOM 构造）
 *
 * 只提供「壳」和「零件」，不写任何业务逻辑、不发请求、不碰 chrome API。
 *
 * 可用的类名词汇（panel / summarybar 直接用这些，不必再写样式）：
 *   壳     .yx-mask .yx-panel .yx-head .yx-body .yx-foot
 *   排版   .yx-row .yx-sec .yx-sec-h .yx-card .yx-grow .yx-sep .yx-title .yx-sub .yx-link
 *   控件   .yx-btn(.is-primary/.is-danger/.is-ghost/.is-sm/.is-icon/.is-on)
 *          .yx-seg > button(.is-on)  .yx-input(.is-num) .yx-select .yx-checkbox .yx-label
 *   数据   .yx-stats > .yx-stat(.is-ok/.is-warn/.is-danger) > .yx-stat-k/.yx-stat-v/.yx-stat-u/.yx-stat-h
 *          .yx-tabs > .yx-tab(.is-on)
 *          .yx-bars > .yx-barrow > .yx-barname/.yx-bartrack>.yx-barfill/.yx-barval
 *          .yx-heat > .yx-heat-hd + .yx-heat-wk > .yx-heat-c(.lv0..lv4/.is-weekend/.is-deficit/.is-on)
 *          .yx-tablewrap > table.yx-table（th.is-sortable/.is-asc/.is-desc，td.num，tr.is-dirty）
 *   零碎   .yx-chip(.is-on) .yx-avatar .yx-tag(.is-ok/.is-warn/.is-danger/.is-accent)
 *          .yx-empty .yx-spin .yx-progress>i .yx-diff .yx-sumbar>.yx-sumbar-in>.yx-metric
 *   文字   .yx-num .yx-dim .yx-ok .yx-warn .yx-danger .yx-acc .yx-mono .yx-ellipsis .yx-hide
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // 所有浮层的 z-index 基准；云效自身最高约 1000，这里直接顶到 int32 上限附近
  const Z_BASE = 2147483000;

  /* ------------------------------------------------------------------ *
   * 1. 设计令牌
   * ------------------------------------------------------------------ */

  // 主色走靛蓝（indigo-blue），刻意避开云效自己的 #1890ff，保证插件有独立识别度
  const LIGHT_TOKENS = [
    'color-scheme: light;',
    '--yx-bg:#f4f6fa;',
    '--yx-surface:#ffffff;',
    '--yx-surface-2:#eef1f7;',
    '--yx-border:#e3e7f0;',
    '--yx-border-strong:#ccd3e2;',
    '--yx-text:#1a2030;',
    '--yx-text-dim:#6a7488;',
    '--yx-accent:#2f56d9;',
    '--yx-accent-2:#5b7cf0;',
    '--yx-accent-soft:rgba(47,86,217,.10);',
    '--yx-on-accent:#ffffff;',
    '--yx-ok:#1a9c62;',
    '--yx-warn:#c9781f;',
    '--yx-danger:#d34747;',
    '--yx-overlay:rgba(22,28,44,.42);',
    '--yx-radius:10px;',
    '--yx-radius-sm:7px;',
    '--yx-shadow:0 1px 2px rgba(18,25,42,.06), 0 10px 24px -12px rgba(18,25,42,.28);',
    '--yx-shadow-lg:0 24px 64px -16px rgba(15,22,40,.34), 0 2px 6px rgba(15,22,40,.08);'
  ].join('');

  const DARK_TOKENS = [
    'color-scheme: dark;',
    '--yx-bg:#12151c;',
    '--yx-surface:#191d26;',
    '--yx-surface-2:#222836;',
    '--yx-border:#2b3241;',
    '--yx-border-strong:#3b4456;',
    '--yx-text:#e5e9f2;',
    '--yx-text-dim:#8b95aa;',
    '--yx-accent:#6f8dff;',
    '--yx-accent-2:#94aaff;',
    '--yx-accent-soft:rgba(111,141,255,.16);',
    '--yx-on-accent:#0e1220;',
    '--yx-ok:#33b87b;',
    '--yx-warn:#dda250;',
    '--yx-danger:#ef7069;',
    '--yx-overlay:rgba(5,8,14,.62);',
    '--yx-radius:10px;',
    '--yx-radius-sm:7px;',
    '--yx-shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 24px -12px rgba(0,0,0,.6);',
    '--yx-shadow-lg:0 24px 64px -16px rgba(0,0,0,.72), 0 2px 6px rgba(0,0,0,.4);'
  ].join('');

  const FONTS = [
    '--yx-font:-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", system-ui, "Segoe UI", sans-serif;',
    '--yx-mono:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;'
  ].join('');

  /* ------------------------------------------------------------------ *
   * 2. 样式表
   * ------------------------------------------------------------------ */

  const BASE_CSS = `
/* ---- 基础 ---- */
:host{
  all: initial;               /* 切断云效页面的继承（字号/行高/颜色），先重置再定义 */
  display:block;
  ` + FONTS + LIGHT_TOKENS + `
  font-family:var(--yx-font);
  font-size:13px;
  line-height:1.5;
  color:var(--yx-text);
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
`;

  const THEME_CSS = `
@media (prefers-color-scheme: dark){
  :host(:not([data-theme="light"])){` + DARK_TOKENS + `}
}
:host([data-theme="dark"]){` + DARK_TOKENS + `}
:host([data-theme="light"]){` + LIGHT_TOKENS + `}
`;

  const COMPONENT_CSS = `
*,*::before,*::after{box-sizing:border-box;}
button,input,select,textarea{font:inherit;color:inherit;}
:focus-visible{outline:2px solid var(--yx-accent);outline-offset:2px;border-radius:4px;}
::-webkit-scrollbar{width:10px;height:10px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--yx-border-strong);border-radius:99px;border:3px solid transparent;background-clip:content-box;}
::-webkit-scrollbar-thumb:hover{background:var(--yx-text-dim);background-clip:content-box;}

/* ---- 文字工具 ---- */
.yx-num{font-variant-numeric:tabular-nums;}
.yx-mono{font-family:var(--yx-mono);font-size:12px;}
.yx-dim{color:var(--yx-text-dim);}
.yx-ok{color:var(--yx-ok);}
.yx-warn{color:var(--yx-warn);}
.yx-danger{color:var(--yx-danger);}
.yx-acc{color:var(--yx-accent);}
.yx-hide{display:none !important;}
.yx-grow{flex:1 1 auto;min-width:0;}
.yx-ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
.yx-link{color:var(--yx-accent);text-decoration:none;cursor:pointer;}
.yx-link:hover{text-decoration:underline;}
.yx-ico{flex:none;display:inline-block;vertical-align:-.18em;}
.yx-sep{width:1px;align-self:stretch;background:var(--yx-border);margin:0 2px;}

/* ---- 壳 ---- */
.yx-mask{
  position:fixed;inset:0;z-index:${Z_BASE + 200};
  display:flex;align-items:flex-start;justify-content:center;
  padding:28px 22px;overflow:auto;pointer-events:auto;
  background:var(--yx-overlay);
  animation:yx-fade .14s ease-out;
}
.yx-panel{
  width:100%;max-width:1320px;
  display:flex;flex-direction:column;
  max-height:calc(100vh - 56px);
  background:var(--yx-bg);
  border:1px solid var(--yx-border);
  border-radius:14px;
  box-shadow:var(--yx-shadow-lg);
  overflow:hidden;
  animation:yx-pop .16s cubic-bezier(.2,.8,.3,1);
}
@media (min-width:1020px){ .yx-panel{min-width:960px;} }
@media (max-width:1019px){
  .yx-mask{padding:0;}
  .yx-panel{border:0;border-radius:0;max-height:100vh;height:100vh;}
}
.yx-head{
  display:flex;align-items:center;gap:10px;flex:none;
  padding:12px 16px;background:var(--yx-surface);
  border-bottom:1px solid var(--yx-border);
}
.yx-title{margin:0;font-size:15px;font-weight:650;letter-spacing:.2px;}
.yx-sub{font-size:12px;color:var(--yx-text-dim);}
.yx-body{flex:1 1 auto;min-height:0;overflow:auto;padding:14px 16px 18px;display:flex;flex-direction:column;gap:14px;}
.yx-foot{
  display:flex;align-items:center;gap:8px;flex:none;
  padding:9px 16px;background:var(--yx-surface);
  border-top:1px solid var(--yx-border);
}
.yx-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.yx-sec{display:flex;flex-direction:column;gap:8px;}
.yx-sec-h{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:650;color:var(--yx-text);}
.yx-card{background:var(--yx-surface);border:1px solid var(--yx-border);border-radius:var(--yx-radius);padding:12px 14px;}

/* ---- 按钮 ---- */
.yx-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  height:30px;padding:0 12px;
  border:1px solid var(--yx-border-strong);border-radius:8px;
  background:var(--yx-surface);color:var(--yx-text);
  font-size:13px;line-height:1;white-space:nowrap;cursor:pointer;
  transition:background .12s ease,border-color .12s ease,color .12s ease;
}
.yx-btn:hover{border-color:var(--yx-accent);color:var(--yx-accent);background:var(--yx-accent-soft);}
.yx-btn:active{transform:translateY(.5px);}
.yx-btn:disabled,.yx-btn[disabled]{opacity:.45;cursor:not-allowed;transform:none;border-color:var(--yx-border-strong);color:var(--yx-text);background:var(--yx-surface);}
.yx-btn.is-primary{background:var(--yx-accent);border-color:var(--yx-accent);color:var(--yx-on-accent);font-weight:600;}
.yx-btn.is-primary:hover{background:var(--yx-accent-2);border-color:var(--yx-accent-2);color:var(--yx-on-accent);}
.yx-btn.is-danger{background:var(--yx-danger);border-color:var(--yx-danger);color:#fff;font-weight:600;}
.yx-btn.is-danger:hover{filter:brightness(1.08);background:var(--yx-danger);border-color:var(--yx-danger);color:#fff;}
.yx-btn.is-ghost{background:transparent;border-color:transparent;color:var(--yx-text-dim);}
.yx-btn.is-ghost:hover{background:var(--yx-surface-2);color:var(--yx-accent);border-color:transparent;}
.yx-btn.is-on{border-color:var(--yx-accent);color:var(--yx-accent);background:var(--yx-accent-soft);}
.yx-btn.is-sm{height:24px;padding:0 8px;font-size:12px;border-radius:6px;}
.yx-btn.is-icon{width:30px;padding:0;}
.yx-btn.is-icon.is-sm{width:24px;}

/* ---- 分段控件（时间预设） ---- */
.yx-seg{display:inline-flex;gap:2px;padding:2px;background:var(--yx-surface-2);border:1px solid var(--yx-border);border-radius:9px;}
.yx-seg button{
  height:24px;padding:0 10px;border:0;border-radius:7px;
  background:transparent;color:var(--yx-text-dim);font-size:12px;cursor:pointer;white-space:nowrap;
}
.yx-seg button:hover{color:var(--yx-accent);}
.yx-seg button.is-on{background:var(--yx-surface);color:var(--yx-accent);font-weight:600;box-shadow:0 1px 2px rgba(18,25,42,.10);}

/* ---- 表单 ---- */
.yx-label{font-size:12px;color:var(--yx-text-dim);white-space:nowrap;}
.yx-input,.yx-select{
  height:30px;padding:0 8px;min-width:0;
  border:1px solid var(--yx-border-strong);border-radius:8px;
  background:var(--yx-surface);color:var(--yx-text);font-size:13px;
}
.yx-select{padding-right:4px;cursor:pointer;}
.yx-input:focus,.yx-select:focus{outline:none;border-color:var(--yx-accent);box-shadow:0 0 0 3px var(--yx-accent-soft);}
.yx-input.is-num{width:78px;text-align:right;font-variant-numeric:tabular-nums;}
.yx-input::placeholder{color:var(--yx-text-dim);opacity:.75;}
.yx-checkbox{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--yx-text-dim);cursor:pointer;}
.yx-checkbox input{accent-color:var(--yx-accent);width:14px;height:14px;cursor:pointer;}
.yx-search{position:relative;display:inline-flex;align-items:center;}
.yx-search .yx-ico{position:absolute;left:8px;color:var(--yx-text-dim);pointer-events:none;}
.yx-search .yx-input{padding-left:26px;width:220px;}

/* ---- 概览卡 ---- */
.yx-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(146px,1fr));gap:10px;}
.yx-stat{
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;gap:5px;
  padding:11px 13px 12px;
  background:var(--yx-surface);border:1px solid var(--yx-border);border-radius:var(--yx-radius);
}
.yx-stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--yx-accent);opacity:.9;}
.yx-stat.is-ok::before{background:var(--yx-ok);}
.yx-stat.is-warn::before{background:var(--yx-warn);}
.yx-stat.is-danger::before{background:var(--yx-danger);}
.yx-stat-k{font-size:12px;color:var(--yx-text-dim);letter-spacing:.2px;}
.yx-stat-v{font-size:26px;font-weight:600;line-height:1.05;letter-spacing:-.6px;font-variant-numeric:tabular-nums;}
.yx-stat.is-ok .yx-stat-v{color:var(--yx-ok);}
.yx-stat.is-warn .yx-stat-v{color:var(--yx-warn);}
.yx-stat.is-danger .yx-stat-v{color:var(--yx-danger);}
.yx-stat-u{font-size:12px;font-weight:400;color:var(--yx-text-dim);margin-left:3px;letter-spacing:0;}
.yx-stat-h{font-size:11px;color:var(--yx-text-dim);}

/* ---- Tab ---- */
.yx-tabs{display:flex;gap:2px;border-bottom:1px solid var(--yx-border);}
.yx-tab{
  padding:7px 12px;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;
  background:none;color:var(--yx-text-dim);font-size:13px;cursor:pointer;
}
.yx-tab:hover{color:var(--yx-text);}
.yx-tab.is-on{color:var(--yx-accent);border-bottom-color:var(--yx-accent);font-weight:600;}

/* ---- 横向条形 ---- */
.yx-bars{display:flex;flex-direction:column;gap:7px;}
.yx-barrow{display:grid;grid-template-columns:minmax(88px,168px) 1fr auto;align-items:center;gap:10px;font-size:12px;}
.yx-barname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.yx-bartrack{height:8px;border-radius:99px;background:var(--yx-surface-2);overflow:hidden;}
.yx-barfill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--yx-accent),var(--yx-accent-2));transition:width .24s ease;}
.yx-barval{min-width:96px;text-align:right;color:var(--yx-text-dim);font-variant-numeric:tabular-nums;}
.yx-barval b{color:var(--yx-text);font-weight:600;}

/* ---- 日历热力图 ---- */
.yx-heat{display:flex;flex-direction:column;gap:5px;}
.yx-heat-hd,.yx-heat-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;}
.yx-heat-hd div{font-size:11px;color:var(--yx-text-dim);text-align:center;padding-bottom:2px;}
.yx-heat-c{
  display:flex;flex-direction:column;justify-content:space-between;gap:4px;
  min-height:54px;padding:6px 8px;
  border:1px solid var(--yx-border);border-radius:var(--yx-radius-sm);
  background:var(--yx-surface);cursor:pointer;text-align:left;
  transition:transform .1s ease,box-shadow .12s ease;
}
.yx-heat-c:hover{transform:translateY(-1px);box-shadow:var(--yx-shadow);}
.yx-heat-c .d{font-size:11px;color:var(--yx-text-dim);}
.yx-heat-c .h{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1;}
.yx-heat-c.lv0 .h{color:var(--yx-text-dim);font-weight:400;}
.yx-heat-c.lv1{background:color-mix(in srgb, var(--yx-accent) 11%, var(--yx-surface));}
.yx-heat-c.lv2{background:color-mix(in srgb, var(--yx-accent) 24%, var(--yx-surface));}
.yx-heat-c.lv3{background:color-mix(in srgb, var(--yx-accent) 42%, var(--yx-surface));}
.yx-heat-c.lv4{background:color-mix(in srgb, var(--yx-accent) 64%, var(--yx-surface));color:var(--yx-on-accent);}
.yx-heat-c.lv4 .d{color:inherit;opacity:.72;}
.yx-heat-c.is-weekend{background:var(--yx-surface-2);border-style:dashed;}
.yx-heat-c.is-weekend.lv1,.yx-heat-c.is-weekend.lv2,.yx-heat-c.is-weekend.lv3,.yx-heat-c.is-weekend.lv4{border-style:solid;}
.yx-heat-c.is-deficit{border-color:var(--yx-warn);box-shadow:inset 0 0 0 1px var(--yx-warn);}
.yx-heat-c.is-on{outline:2px solid var(--yx-accent);outline-offset:1px;}
.yx-heat-c.is-out{opacity:.42;}
.yx-heat-legend{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--yx-text-dim);}
.yx-heat-legend i{width:12px;height:12px;border-radius:3px;border:1px solid var(--yx-border);display:inline-block;}

/* ---- 表格 ---- */
.yx-tablewrap{
  overflow:auto;max-height:52vh;
  background:var(--yx-surface);
  border:1px solid var(--yx-border);border-radius:var(--yx-radius);
}
.yx-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;}
.yx-table th{
  position:sticky;top:0;z-index:1;
  padding:8px 10px;text-align:left;white-space:nowrap;
  background:var(--yx-surface-2);color:var(--yx-text-dim);font-weight:600;font-size:12px;
  border-bottom:1px solid var(--yx-border);
}
.yx-table th.is-sortable{cursor:pointer;user-select:none;}
.yx-table th.is-sortable:hover{color:var(--yx-accent);}
.yx-table th.is-asc,.yx-table th.is-desc{color:var(--yx-accent);}
.yx-table th.is-asc::after{content:" \\2191";}
.yx-table th.is-desc::after{content:" \\2193";}
.yx-table td{padding:6px 10px;border-bottom:1px solid var(--yx-border);vertical-align:middle;}
.yx-table tbody tr:last-child td{border-bottom:0;}
.yx-table tbody tr:hover td{background:var(--yx-surface-2);}
.yx-table tr.is-dirty td{background:var(--yx-accent-soft);}
.yx-table tr.is-dirty:hover td{background:var(--yx-accent-soft);}
.yx-table .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
.yx-table .yx-input.is-num{height:24px;width:66px;}
.yx-table td.sn{font-family:var(--yx-mono);font-size:12px;color:var(--yx-text-dim);white-space:nowrap;}
.yx-table td.sub{max-width:420px;}

/* ---- 零碎 ---- */
.yx-chip{
  display:inline-flex;align-items:center;gap:6px;
  height:26px;padding:0 10px;
  border:1px solid var(--yx-border-strong);border-radius:99px;
  background:var(--yx-surface);color:var(--yx-text);font-size:12px;cursor:pointer;white-space:nowrap;
}
.yx-chip:hover{border-color:var(--yx-accent);}
.yx-chip.is-on{border-color:var(--yx-accent);background:var(--yx-accent-soft);color:var(--yx-accent);font-weight:600;}
.yx-avatar{width:18px;height:18px;border-radius:50%;object-fit:cover;background:var(--yx-surface-2);flex:none;}
.yx-tag{
  display:inline-flex;align-items:center;height:20px;padding:0 7px;
  border:1px solid var(--yx-border);border-radius:6px;
  background:var(--yx-surface-2);color:var(--yx-text-dim);font-size:11px;white-space:nowrap;
}
.yx-tag.is-ok{color:var(--yx-ok);border-color:var(--yx-ok);background:transparent;}
.yx-tag.is-warn{color:var(--yx-warn);border-color:var(--yx-warn);background:transparent;}
.yx-tag.is-danger{color:var(--yx-danger);border-color:var(--yx-danger);background:transparent;}
.yx-tag.is-accent{color:var(--yx-accent);border-color:var(--yx-accent);background:transparent;}
.yx-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:30px 16px;color:var(--yx-text-dim);font-size:13px;text-align:center;}
.yx-empty .yx-ico{color:var(--yx-border-strong);}
.yx-spin{
  display:inline-block;width:14px;height:14px;flex:none;
  border:2px solid var(--yx-border-strong);border-top-color:var(--yx-accent);border-radius:50%;
  animation:yx-spin .7s linear infinite;
}
.yx-progress{height:3px;border-radius:99px;background:var(--yx-surface-2);overflow:hidden;}
.yx-progress > i{display:block;height:100%;width:0;background:var(--yx-accent);transition:width .2s ease;}

/* ---- 改动清单（提交前确认用） ---- */
.yx-diff{list-style:none;margin:10px 0 0;padding:0;max-height:38vh;overflow:auto;border:1px solid var(--yx-border);border-radius:8px;}
.yx-diff li{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--yx-border);font-size:12px;color:var(--yx-text);}
.yx-diff li:last-child{border-bottom:0;}
.yx-diff .sn{flex:none;font-family:var(--yx-mono);color:var(--yx-text-dim);}
.yx-diff .sub{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.yx-diff .from{flex:none;color:var(--yx-text-dim);text-decoration:line-through;font-variant-numeric:tabular-nums;}
.yx-diff .to{flex:none;color:var(--yx-accent);font-weight:650;font-variant-numeric:tabular-nums;}

/* ---- 列表页合计条 ---- */
.yx-sumbar{
  position:fixed;left:0;right:0;bottom:0;z-index:${Z_BASE + 100};
  display:flex;justify-content:center;padding:0 12px 12px;pointer-events:none;
}
.yx-sumbar-in{
  pointer-events:auto;
  display:flex;align-items:center;gap:12px;
  height:38px;padding:0 6px 0 14px;max-width:100%;
  background:var(--yx-surface);border:1px solid var(--yx-border);border-radius:99px;
  box-shadow:var(--yx-shadow);font-size:13px;color:var(--yx-text);
  animation:yx-rise .18s ease-out;
}
.yx-metric{display:inline-flex;align-items:baseline;gap:5px;color:var(--yx-text-dim);white-space:nowrap;}
.yx-metric b{font-size:14px;font-weight:650;color:var(--yx-text);font-variant-numeric:tabular-nums;}
.yx-dot{width:3px;height:3px;border-radius:50%;background:var(--yx-border-strong);flex:none;}

/* ---- Toast ---- */
.yx-toasts{
  position:fixed;right:18px;bottom:18px;z-index:${Z_BASE + 600};
  display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;
}
.yx-toast{
  pointer-events:auto;
  display:flex;align-items:center;gap:8px;
  max-width:min(380px,80vw);padding:9px 12px;
  background:var(--yx-surface);border:1px solid var(--yx-border);border-left:3px solid var(--yx-accent);
  border-radius:9px;box-shadow:var(--yx-shadow);
  font-size:13px;color:var(--yx-text);cursor:pointer;
  animation:yx-rise .16s ease-out;
}
.yx-toast .yx-ico{color:var(--yx-accent);}
.yx-toast.is-success{border-left-color:var(--yx-ok);}
.yx-toast.is-success .yx-ico{color:var(--yx-ok);}
.yx-toast.is-error{border-left-color:var(--yx-danger);}
.yx-toast.is-error .yx-ico{color:var(--yx-danger);}
.yx-toast.is-warn{border-left-color:var(--yx-warn);}
.yx-toast.is-warn .yx-ico{color:var(--yx-warn);}
.yx-toast.is-out{opacity:0;transform:translateY(6px);transition:opacity .18s ease,transform .18s ease;}
.yx-toast-t{white-space:pre-wrap;word-break:break-word;}

/* ---- 确认弹窗 ---- */
.yx-dlgmask{
  position:fixed;inset:0;z-index:${Z_BASE + 500};
  display:flex;align-items:center;justify-content:center;padding:24px;pointer-events:auto;
  background:var(--yx-overlay);animation:yx-fade .12s ease-out;
}
.yx-dlg{
  width:min(560px,100%);max-height:calc(100vh - 96px);
  display:flex;flex-direction:column;
  color:var(--yx-text);
  background:var(--yx-surface);border:1px solid var(--yx-border);border-radius:12px;
  box-shadow:var(--yx-shadow-lg);animation:yx-pop .16s cubic-bezier(.2,.8,.3,1);
}
.yx-dlg-h{display:flex;align-items:center;gap:8px;padding:15px 18px 0;font-size:15px;font-weight:650;color:var(--yx-text);}
.yx-dlg.is-danger .yx-dlg-h .yx-ico{color:var(--yx-danger);}
.yx-dlg-b{padding:9px 18px 2px;overflow:auto;font-size:13px;line-height:1.65;color:var(--yx-text-dim);
  white-space:pre-wrap;word-break:break-word;}
.yx-dlg-b strong,.yx-dlg-b b{color:var(--yx-text);}
.yx-dlg-f{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px 16px;}

/* ---- 动效 ---- */
@keyframes yx-spin{to{transform:rotate(360deg);}}
@keyframes yx-fade{from{opacity:0;}to{opacity:1;}}
@keyframes yx-pop{from{opacity:0;transform:translateY(-6px) scale(.985);}to{opacity:1;transform:none;}}
@keyframes yx-rise{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
@media (prefers-reduced-motion: reduce){
  *{animation-duration:.01ms !important;transition-duration:.01ms !important;}
}
`;

  const CSS = BASE_CSS + THEME_CSS + COMPONENT_CSS;

  // host 元素本身在 Shadow DOM 之外，会被云效的全局 CSS 命中，所以全部 !important 钉死。
  // 尺寸 0 + position:fixed：自身不参与页面布局，内部 fixed 浮层照常按视口定位。
  const HOST_STYLE = [
    'all:initial !important',
    'position:fixed !important',
    'top:0 !important',
    'left:0 !important',
    'width:0 !important',
    'height:0 !important',
    'margin:0 !important',
    'padding:0 !important',
    'border:0 !important',
    'display:block !important',
    'visibility:visible !important',
    'opacity:1 !important',
    'z-index:' + Z_BASE + ' !important'
  ].join(';') + ';';

  /* ------------------------------------------------------------------ *
   * 3. h() —— 极简 createElement
   * ------------------------------------------------------------------ */

  function normalizeClass(v) {
    if (Array.isArray(v)) {
      return v.filter(function (x) { return x; }).join(' ');
    }
    if (v && typeof v === 'object') {
      return Object.keys(v).filter(function (k) { return v[k]; }).join(' ');
    }
    return v == null ? '' : String(v);
  }

  function setStyle(el, v) {
    if (typeof v === 'string') { el.style.cssText = v; return; }
    if (!v || typeof v !== 'object') return;
    Object.keys(v).forEach(function (k) {
      const val = v[k];
      if (val == null || val === false) return;
      if (k.indexOf('--') === 0 || k.indexOf('-') > 0) {
        el.style.setProperty(k, String(val));
      } else {
        el.style[k] = typeof val === 'number' ? String(val) : val;
      }
    });
  }

  function setAttr(el, k, v) {
    if (v == null || v === false) { el.removeAttribute(k); return; }
    el.setAttribute(k, v === true ? '' : String(v));
  }

  const DIRECT_PROPS = {
    value: 1, checked: 1, disabled: 1, title: 1, selected: 1,
    placeholder: 1, type: 1, id: 1, htmlFor: 1, readOnly: 1, multiple: 1, tabIndex: 1
  };

  function applyProps(el, props) {
    if (!props) return;
    Object.keys(props).forEach(function (key) {
      const v = props[key];
      if (v === undefined) return;
      // 安全红线：不提供任何写 innerHTML 的入口
      if (key === 'html' || key === 'innerHTML') {
        console.warn('[YXWT.ui] h() 不支持 html 属性（安全），已忽略');
        return;
      }
      if (key === 'class' || key === 'className') { el.setAttribute('class', normalizeClass(v)); return; }
      if (key === 'style') { setStyle(el, v); return; }
      if (key === 'text') { el.textContent = v == null ? '' : String(v); return; }
      if (key === 'dataset') {
        if (v && typeof v === 'object') {
          Object.keys(v).forEach(function (k) {
            if (v[k] != null) { el.dataset[k] = String(v[k]); }
          });
        }
        return;
      }
      if (key === 'attrs') {
        if (v && typeof v === 'object') {
          Object.keys(v).forEach(function (k) { setAttr(el, k, v[k]); });
        }
        return;
      }
      if (key.length > 2 && key.slice(0, 2) === 'on') {
        // onClick / onInput / ['fn', options] 都支持
        const handler = Array.isArray(v) ? v[0] : v;
        const opts = Array.isArray(v) ? v[1] : undefined;
        if (typeof handler === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), handler, opts);
        }
        return;
      }
      if (v === null) { setAttr(el, key, null); return; }
      if (DIRECT_PROPS[key] === 1 || key in el) {
        try { el[key] = v; return; } catch (e) { /* 只读属性时退回 attribute */ }
      }
      setAttr(el, key, v);
    });
  }

  function appendChildren(parent, children) {
    if (children == null || children === false || children === true) return;
    if (Array.isArray(children)) {
      children.forEach(function (c) { appendChildren(parent, c); });
      return;
    }
    if (children instanceof Node) { parent.appendChild(children); return; }
    parent.appendChild(document.createTextNode(String(children)));
  }

  function h(tag, props) {
    const el = document.createElement(tag);
    applyProps(el, props);
    for (let i = 2; i < arguments.length; i++) {
      appendChildren(el, arguments[i]);
    }
    return el;
  }

  function frag() {
    const f = document.createDocumentFragment();
    for (let i = 0; i < arguments.length; i++) {
      appendChildren(f, arguments[i]);
    }
    return f;
  }

  function clear(node) {
    if (!node) return node;
    while (node.firstChild) { node.removeChild(node.firstChild); }
    return node;
  }

  /* ------------------------------------------------------------------ *
   * 4. 图标（全部内联 SVG，24x24 线稿，绝不用 emoji）
   * ------------------------------------------------------------------ */

  const ICONS = {
    calendar: [
      ['rect', { x: 3, y: 5, width: 18, height: 16, rx: 2.5 }],
      ['path', { d: 'M8 2.8v4M16 2.8v4M3 10.2h18' }]
    ],
    refresh: [
      ['path', { d: 'M20.5 4v5.2h-5.2' }],
      ['path', { d: 'M3.5 20v-5.2h5.2' }],
      ['path', { d: 'M5.2 9.2A7.6 7.6 0 0 1 18.7 7.4l1.8 1.8' }],
      ['path', { d: 'M18.8 14.8A7.6 7.6 0 0 1 5.3 16.6l-1.8-1.8' }]
    ],
    download: [
      ['path', { d: 'M12 3.2v11.6' }],
      ['path', { d: 'M7 10.2 12 15.2l5-5' }],
      ['path', { d: 'M4.2 19.4h15.6' }]
    ],
    copy: [
      ['rect', { x: 9, y: 9, width: 11.5, height: 11.5, rx: 2.4 }],
      ['path', { d: 'M15 5.6V5A1.8 1.8 0 0 0 13.2 3.2H5.3A1.8 1.8 0 0 0 3.5 5v7.9A1.8 1.8 0 0 0 5.3 14.7H6' }]
    ],
    close: [
      ['path', { d: 'M6 6 18 18M18 6 6 18' }]
    ],
    gear: [
      ['circle', { cx: 12, cy: 12, r: 6.2 }],
      ['circle', { cx: 12, cy: 12, r: 2.6 }],
      ['path', {
        d: 'M18.2 12L20.8 12M16.38 7.62L18.22 5.78M12 5.8L12 3.2M7.62 7.62L5.78 5.78' +
          'M5.8 12L3.2 12M7.62 16.38L5.78 18.22M12 18.2L12 20.8M16.38 16.38L18.22 18.22',
        'stroke-width': 2.2
      }]
    ],
    search: [
      ['circle', { cx: 10.5, cy: 10.5, r: 6.6 }],
      ['path', { d: 'M15.4 15.4 20.6 20.6' }]
    ],
    chart: [
      ['path', { d: 'M3.6 3.4v17h17' }],
      ['path', { d: 'M7.6 20.4v-6.6M12.4 20.4V8.8M17.2 20.4V5.2', 'stroke-width': 2.6 }]
    ],
    users: [
      ['circle', { cx: 9.2, cy: 8.2, r: 3.7 }],
      ['path', { d: 'M2.6 20.4a6.6 6.6 0 0 1 13.2 0' }],
      ['path', { d: 'M16.2 4.9a3.7 3.7 0 0 1 0 6.6' }],
      ['path', { d: 'M17.6 14.2a6.6 6.6 0 0 1 3.8 6.2' }]
    ],
    clock: [
      ['circle', { cx: 12, cy: 12, r: 8.6 }],
      ['path', { d: 'M12 6.9V12l3.4 2.1' }]
    ],
    alert: [
      ['path', { d: 'M12 3.6 21.4 20H2.6z' }],
      ['path', { d: 'M12 9.8v4.4' }],
      ['circle', { cx: 12, cy: 17.2, r: .95, fill: 'currentColor', stroke: 'none' }]
    ],
    check: [
      ['path', { d: 'm4.6 12.6 4.8 4.8 10-10.8' }]
    ],
    plus: [
      ['path', { d: 'M12 5v14M5 12h14' }]
    ],
    minus: [
      ['path', { d: 'M5 12h14' }]
    ],
    chevron: [
      ['path', { d: 'm7 10 5 5 5-5' }]
    ],
    external: [
      ['path', { d: 'M14 4.2h5.8V10' }],
      ['path', { d: 'M19.4 4.6 11 13' }],
      ['path', { d: 'M18.4 14.2v4.2a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2V7.6a2 2 0 0 1 2-2h4.2' }]
    ],
    trash: [
      ['path', { d: 'M4.4 6.6h15.2' }],
      ['path', { d: 'M9.4 6.6V4.8a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v1.8' }],
      ['path', { d: 'M6.4 6.6 7.3 19.2a1.6 1.6 0 0 0 1.6 1.4h6.2a1.6 1.6 0 0 0 1.6-1.4l.9-12.6' }]
    ],
    info: [
      ['circle', { cx: 12, cy: 12, r: 8.6 }],
      ['path', { d: 'M12 11.2v5.2' }],
      ['circle', { cx: 12, cy: 7.9, r: .95, fill: 'currentColor', stroke: 'none' }]
    ]
  };

  function icon(name, size) {
    const px = size || 16;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'yx-ico');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(px));
    svg.setAttribute('height', String(px));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const spec = ICONS[name];
    if (!spec) return svg;
    spec.forEach(function (item) {
      const node = document.createElementNS(SVG_NS, item[0]);
      const attrs = item[1];
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, String(attrs[k])); });
      svg.appendChild(node);
    });
    return svg;
  }

  /* ------------------------------------------------------------------ *
   * 5. mount / unmount
   * ------------------------------------------------------------------ */

  const HOSTS = new Map();
  let lastRoot = null;

  function mount(hostId) {
    const id = String(hostId || 'yxwt-host');
    const cached = HOSTS.get(id);
    if (cached && cached.host.isConnected && cached.host.shadowRoot) {
      lastRoot = cached.root;
      return cached;
    }
    let host = document.getElementById(id);
    // 同名节点不是我们建的（云效自己的元素）就别碰，另建一个
    if (host && !host.hasAttribute('data-yxwt')) { host = null; }
    if (!host) {
      host = document.createElement('div');
      host.id = id;
    }
    host.setAttribute('data-yxwt', '');
    host.style.cssText = HOST_STYLE;
    // 挂在 documentElement 上而不是 body：云效会重建 body 子树
    if (host.parentNode !== document.documentElement) {
      document.documentElement.appendChild(host);
    }
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    if (!root.querySelector('style[data-yxwt-css]')) {
      const style = document.createElement('style');
      style.setAttribute('data-yxwt-css', '');
      style.textContent = CSS;
      root.insertBefore(style, root.firstChild);
    }
    const rec = { host: host, root: root };
    HOSTS.set(id, rec);
    lastRoot = root;
    return rec;
  }

  function unmount(hostId) {
    const id = String(hostId || 'yxwt-host');
    const rec = HOSTS.get(id);
    HOSTS.delete(id);
    const host = (rec && rec.host) || document.getElementById(id);
    if (host && host.hasAttribute && host.hasAttribute('data-yxwt') && host.parentNode) {
      host.parentNode.removeChild(host);
    }
    if (rec && lastRoot === rec.root) { lastRoot = null; }
  }

  // 主题：'auto' 去掉 data-theme 跟随系统，'light'/'dark' 强制覆盖
  function setTheme(target, theme) {
    const host = resolveHost(target);
    if (!host) return;
    if (theme === 'light' || theme === 'dark') {
      host.setAttribute('data-theme', theme);
    } else {
      host.removeAttribute('data-theme');
    }
  }

  function resolveHost(target) {
    if (!target) return null;
    if (target.host && target.root) return target.host;              // mount() 的返回值
    if (typeof ShadowRoot !== 'undefined' && target instanceof ShadowRoot) return target.host;
    if (target.nodeType === 1) return target;
    if (typeof target === 'string') {
      const rec = HOSTS.get(target);
      return rec ? rec.host : null;
    }
    return null;
  }

  // 浮层 API 允许传 {host,root} / ShadowRoot / 元素 / hostId，统一归一化
  function resolveRoot(target) {
    if (target) {
      if (target.root) return target.root;
      if (typeof ShadowRoot !== 'undefined' && target instanceof ShadowRoot) return target;
      if (target.nodeType === 1 && target.shadowRoot) return target.shadowRoot;
      if (target.nodeType === 1) return target;
      if (typeof target === 'string') {
        const rec = HOSTS.get(target);
        if (rec) return rec.root;
      }
    }
    return lastRoot;
  }

  /* ------------------------------------------------------------------ *
   * 6. Toast
   * ------------------------------------------------------------------ */

  const TOAST_ICON = { info: 'info', success: 'check', error: 'alert', warn: 'alert' };
  const TOAST_MAX = 5;

  function toast(root, msg, type, opts) {
    const r = resolveRoot(root);
    if (!r) return null;
    const o = opts || {};
    const kind = TOAST_ICON[type] ? type : 'info';
    const duration = typeof o.duration === 'number' ? o.duration : 3000;

    let wrap = r.querySelector('.yx-toasts');
    if (!wrap) {
      wrap = h('div', { class: 'yx-toasts' });
      r.appendChild(wrap);
    }

    const el = h('div', {
      class: ['yx-toast', 'is-' + kind],
      attrs: { role: kind === 'error' ? 'alert' : 'status' },
      title: '点击关闭'
    },
      icon(TOAST_ICON[kind], 15),
      h('span', { class: 'yx-toast-t', text: msg == null ? '' : String(msg) })
    );

    let closed = false;
    let timer = 0;
    function close() {
      if (closed) return;
      closed = true;
      if (timer) { clearTimeout(timer); timer = 0; }
      el.classList.add('is-out');
      setTimeout(function () {
        if (el.parentNode) { el.parentNode.removeChild(el); }
        if (wrap && !wrap.firstChild && wrap.parentNode) { wrap.parentNode.removeChild(wrap); }
      }, 200);
    }
    el.addEventListener('click', close);
    el.__yxClose = close;

    wrap.appendChild(el);
    while (wrap.children.length > TOAST_MAX) {
      const first = wrap.firstElementChild;
      if (first && typeof first.__yxClose === 'function') { first.__yxClose(); }
      if (first && first.parentNode) { first.parentNode.removeChild(first); }
    }
    if (duration > 0) { timer = setTimeout(close, duration); }
    return el;
  }

  /* ------------------------------------------------------------------ *
   * 7. 确认弹窗
   * ------------------------------------------------------------------ */

  const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';

  function confirmDialog(root, opts) {
    const r = resolveRoot(root);
    const o = opts || {};
    if (!r) return Promise.resolve(false);

    return new Promise(function (resolve) {
      const danger = !!o.danger;
      const prevActive = (r.activeElement && r.activeElement !== r) ? r.activeElement : document.activeElement;

      const cancelBtn = h('button', {
        class: 'yx-btn', type: 'button', text: o.cancelText || '取消',
        onClick: function () { done(false); }
      });
      const okBtn = h('button', {
        class: ['yx-btn', danger ? 'is-danger' : 'is-primary'], type: 'button', text: o.okText || '确定',
        onClick: function () { done(true); }
      });

      const body = h('div', { class: 'yx-dlg-b' });
      appendChildren(body, o.body == null ? '' : o.body);

      const dlg = h('div', {
        class: ['yx-dlg', danger ? 'is-danger' : ''],
        attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '确认操作' }
      },
        h('div', { class: 'yx-dlg-h' },
          icon(danger ? 'alert' : 'info', 17),
          h('span', { text: o.title || '确认操作' })
        ),
        body,
        h('div', { class: 'yx-dlg-f' }, cancelBtn, okBtn)
      );

      const mask = h('div', { class: 'yx-dlgmask' }, dlg);
      mask.addEventListener('mousedown', function (e) {
        if (e.target === mask) { done(false); }
      });
      mask.addEventListener('keydown', onKey, true);
      r.appendChild(mask);

      // 焦点先落在「取消」，危险操作误触回车/空格时也是安全的一侧
      requestAnimationFrame(function () {
        try { cancelBtn.focus(); } catch (e) { /* 忽略 */ }
      });

      let settled = false;
      function done(v) {
        if (settled) return;
        settled = true;
        mask.removeEventListener('keydown', onKey, true);
        if (mask.parentNode) { mask.parentNode.removeChild(mask); }
        if (prevActive && prevActive.isConnected && typeof prevActive.focus === 'function') {
          try { prevActive.focus(); } catch (e) { /* 忽略 */ }
        }
        resolve(v);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          done(false);
          return;
        }
        if (e.key === 'Enter' && !e.isComposing) {
          // 回车只在焦点确实落在「确定」上时才确认。默认焦点在「取消」，此时不 preventDefault，
          // 交给按钮的原生激活走 done(false)——保证「焦点在哪，回车就是哪个动作」，
          // 不会让误触的回车触发不可撤销的写入。stopPropagation 是为了不把回车漏给云效页面。
          e.stopPropagation();
          const focused = r.activeElement || document.activeElement;
          if (focused === okBtn) {
            e.preventDefault();
            done(true);
          }
          return;
        }
        if (e.key === 'Tab') {
          // 焦点圈在弹窗里；用 getClientRects 判可见（弹窗是 fixed，offsetParent 恒为 null 不能用）
          const list = Array.prototype.filter.call(
            dlg.querySelectorAll(FOCUSABLE),
            function (n) { return n.getClientRects().length > 0; }
          );
          if (!list.length) return;
          const cur = r.activeElement;
          let idx = list.indexOf(cur);
          idx = e.shiftKey ? idx - 1 : idx + 1;
          if (idx < 0) { idx = list.length - 1; }
          if (idx >= list.length) { idx = 0; }
          e.preventDefault();
          try { list[idx].focus(); } catch (err) { /* 忽略 */ }
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */

  NS.ui = {
    CSS: CSS,
    Z_BASE: Z_BASE,
    h: h,
    frag: frag,
    clear: clear,
    icon: icon,
    iconNames: Object.keys(ICONS),
    mount: mount,
    unmount: unmount,
    setTheme: setTheme,
    toast: toast,
    confirmDialog: confirmDialog
  };
})();


  /* ================= src/panel.js ================= */
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
        if (state.booted && (
          before.taskScope !== next.taskScope ||
          before.workDiffBasis !== next.workDiffBasis ||
          before.hoursBasis !== next.hoursBasis ||
          before.warnMissingEst !== next.warnMissingEst ||
          before.dailyTargetHours !== next.dailyTargetHours
        )) renderAll();
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
      const rows = taskScopeRows();
      const bits = [state.start + ' ~ ' + state.end, '共 ' + rows.length + ' 条'];
      if (taskScope() === 'completed') bits.push('仅已完成');
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
      const scopedRows = taskScopeRows();
      if (state.dayFilter && scopedRows.every(function (r) { return r.date !== state.dayFilter; })) {
        state.dayFilter = null;
      }
      // 「只看未填预计」同理：新区间可能一条都不缺，留着筛选就是一张空表
      if (state.missingOnly && !countMissing(scopedRows)) state.missingOnly = false;
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
    const completedOnly = taskScope() === 'completed' && state.rows.length > 0;
    add(box, el('div', 'big', completedOnly ? '这个区间没有已完成任务' : '这个区间没有查到工作项'));
    add(box, el('div', 'msg', completedOnly
      ? '当前设置为“仅已完成”。可在设置页把“任务状态范围”改回“全部任务”。'
      : '试试换个时间范围，或把归集口径从「' + basisLabel(state.dateBasis) + '」换成别的；' +
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
    if (!taskScopeRows().length) { renderEmptyBody(); return; }
    showSections();
    renderOverview();
    renderCalendar();
    renderGroups();
    renderTable();
    renderStatus();
  }

  /* -------------------------------------------------- 统计展示口径（预计 / 实际 / 两者） */

  /**
   * 展示指标（热力图着色、日均、未填告警、分组排序）拿哪个字段当基准。
   * 天然双值的地方（预计/实际/偏差三张卡、明细两列、CSV）不受这里影响，它们本来就并排给。
   */
  function hoursBasis() {
    const b = state.prefs && state.prefs.hoursBasis;
    return b === 'actual' || b === 'both' ? b : 'estimated';
  }

  function taskScope() {
    return state.prefs && state.prefs.taskScope === 'completed' ? 'completed' : 'all';
  }

  function workDiffBasis() {
    const b = state.prefs && state.prefs.workDiffBasis;
    return b === 'estimated' || b === 'actual' ? b : 'max';
  }

  function workDiffBasisLabel() {
    const b = workDiffBasis();
    return b === 'estimated' ? '预计工时' : (b === 'actual' ? '实际工时' : '预计/实际逐任务取较大值');
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

  /** 设置里的任务状态范围统一作用于概览、日历、分组和明细。 */
  function taskScopeRows() {
    return NS.stats.filterByTaskScope(state.rows, taskScope());
  }

  /** 当前明细表可见的行（任务状态范围 + 搜索 + 选中某天 + 只看未填） */
  function visibleRows() {
    const q = state.search.trim().toLowerCase();
    const missOnly = state.missingOnly && canWarnMissing();
    return taskScopeRows().filter(function (r) {
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
    // 只用预计的团队不该看到实际工时那一套，反之亦然；「偏差」是两者相减，只有都用时才有意义
    if (usesEst()) {
      add(cards, card(fieldLabel('est'), hours(s.est), 'h',
        noEst ? '字段未识别，按 0 计算' : '', noEst ? 'yxp-warn' : ''));
    }
    if (usesAct()) {
      add(cards, card(fieldLabel('act'), hours(s.act), 'h',
        noAct ? '字段未识别，按 0 计算' : '', noAct ? 'yxp-warn' : ''));
    }

    if (hoursBasis() === 'both') {
      const diff = Number(s.diff) || 0;
      add(cards, card('偏差', (diff > 0 ? '+' : '') + hours(diff), 'h',
        fieldLabel('act') + ' − ' + fieldLabel('est'),
        diff < 0 ? 'yxp-good' : (diff > 0 ? 'yxp-warn' : '')));
    }

    const daysSub = (Number(s.days) || 0) + ' 个有效日';
    if (hoursBasis() === 'both') {
      add(cards, card('日均工时', hours(s.avgPerDay) + ' / ' + hours(s.avgPerDayAct), 'h',
        daysSub + ' · ' + fieldLabel('est') + ' / ' + fieldLabel('act')));
    } else {
      const v = hoursBasis() === 'actual' ? s.avgPerDayAct : s.avgPerDay;
      add(cards, card('日均工时', hours(v), 'h', daysSub));
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

    addWorkDiffCard(workCards, '工时偏差', rows, work.hours, '工作日总工时');

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

      addWorkDiffCard(workCards, '截止今日工时偏差', rows, through.hours, '截止今日工时');
    }

    add(sec, workCards);
  }

  /**
   * 「跟工作日目标比」的偏差卡使用独立设置，不影响热力图、日均等展示口径。
   */
  function addWorkDiffCard(box, label, rows, targetHours, targetName) {
    const total = NS.stats.workHoursTotal(rows, workDiffBasis());
    const diff = total - targetHours;
    const sign = (diff > 0 ? '+' : '') + hours(diff);
    const tone = diff > 0 ? 'yxp-bad' : (diff < 0 ? 'yxp-good' : '');
    add(box, card(label, sign, 'h', workDiffBasisLabel() + ' − ' + targetName, tone));
  }

  /**
   * 漏填工时的警示条。数字用的是**任务状态范围内的整个时间区间**，不随下面的搜索 /
   * 单日下钻变化——它回答的是「这次查的这段时间里有没有漏记」，一点筛选就跳数会看不懂。
   */
  function renderMissingBar(sec) {
    if (!canWarnMissing()) return;
    const rows = taskScopeRows();
    const total = countMissing(rows);
    if (!total) return;
    const bar = el('div', 'yxp-note yxp-badnote yxp-missbar');
    let what = '「' + fieldLabel('est') + '」';
    if (hoursBasis() === 'actual') what = '「' + fieldLabel('act') + '」';
    else if (hoursBasis() === 'both') {
      // both 口径下分别报数，只说「没填全」用户会不知道该补哪一个
      const m = NS.stats.missingHours(rows, 'both');
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
    const days = NS.stats.byDay(taskScopeRows(), state.start, state.end, {
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
      const tipParts = [];
      if (usesEst()) tipParts.push(fieldLabel('est') + ' ' + hours(d.est) + 'h');
      if (usesAct()) tipParts.push(fieldLabel('act') + ' ' + hours(d.act) + 'h');
      cell.title = d.ymd + ' · ' + d.count + ' 个任务 · ' + tipParts.join(' / ') +
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
        [g.count + ' 条'].concat(
          usesEst() ? [fieldLabel('est') + ' ' + hours(g.est) + 'h'] : [],
          usesAct() ? [fieldLabel('act') + ' ' + hours(g.act) + 'h'] : []
        ).join(' · '));
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

  /** 明细表当前该显示哪几列：只用预计就不摆实际那一列，反之亦然 */
  function visibleColumns() {
    return COLUMNS.filter(function (c) {
      if (c.key === 'est') return usesEst();
      if (c.key === 'act') return usesAct();
      return true;
    });
  }

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
      const missCount = countMissing(taskScopeRows());
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

    if (canEditAct && usesAct()) {
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
    } else if (!canEditAct && usesAct()) {
      add(bar, el('span', 'yxp-note', '未识别到「' + fieldLabel('act') + '」字段，这一列只读。'));
    } else if (!canEditField('est') && usesEst()) {
      add(bar, el('span', 'yxp-note', '未识别到「' + fieldLabel('est') + '」字段，这一列只读。'));
    }
    add(sec, bar);

    // 改动条
    refs.editBar = el('div', 'yxp-editbar yxp-hidden');
    add(sec, refs.editBar);

    const wrap = el('div', 'yxp-tablewrap');
    const table = el('table', 'yxp-table');
    const thead = el('thead', '');
    const tr = el('tr', '');
    // 排序列被口径藏掉了就退回默认，否则表头没有它、点不着也改不回来
    if (!visibleColumns().some(function (c) { return c.key === state.sortKey; })) {
      state.sortKey = 'planEnd';
      state.sortDir = 'desc';
    }
    visibleColumns().forEach(function (c) {
      const sortable = c.sortable !== false;
      const on = sortable && state.sortKey === c.key;
      const colLabel = c.key === 'est' ? fieldLabel('est')
        : (c.key === 'act' ? fieldLabel('act') : c.label);
      const th = el('th', c.cls + (sortable ? '' : ' nosort'), colLabel);
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
        th.title = '点击或按回车按「' + colLabel + '」排序';
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

    if (refs.tableCount) refs.tableCount.textContent = rows.length + ' / ' + taskScopeRows().length + ' 条';
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
    if (usesEst()) add(tr, numCell(r, 'est', tr));
    if (usesAct()) add(tr, numCell(r, 'act', tr));

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
        // 日报跟着统计口径走：只用预计的团队，日报里摆一列全 0 的实际工时纯属噪音
        basis: hoursBasis(),
        estLabel: fieldLabel('est'),
        actLabel: fieldLabel('act'),
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


  /* ================= src/summarybar.js ================= */
/**
 * YXWT.summarybar —— 云效工作项列表页底部常驻统计条。
 * 依赖（均在本文件之前加载）：util / summaryItems / store / api / detect / stats /
 * workcalendar / rangeData / ui / panel。
 * 原则：任何一步失败都静默降级，只把「统计失败，点击重试」写到条上，绝不弹窗打断云效。
 */
(function () {
  'use strict';

  const NS = (window.YXWT = window.YXWT || {});

  const HOST_ID = 'yxwt-summarybar';
  const PAGE_PAD = '48px';        // 给 <html> 垫的底部留白，避免盖住云效分页器
  const POLL_MS = 500;            // 云效是 SPA，切视图不一定触发 hashchange，靠轮询兜底
  const DEBOUNCE_MS = 800;
  const PAGE_SIZE = 200;
  const MAX_PAGES = 10;           // 2000 条安全阀，超出在条上标注「+」
  const BIG_LIST = 800;           // 超过这么多条就不自动统计，先问一句

  const PERSONAL_RE = /^\/projex\/workitem(?:\/|$)/;
  const PROJECT_RE = /^\/projex\/project\/([^/?#]+)\/(task|req|bug|workitem)(?:\/|$)/;
  const VIEW_RE = /[#&?]viewIdentifier=([^&#/?]+)/;

  // 路径段 -> 云效 category，让统计范围和用户当前看的 tab 对齐
  const CATEGORY_BY_SEG = { task: 'Task', req: 'Req', bug: 'Bug', workitem: '' };

  const FALLBACK_PREFS = {
    showSummaryBar: true,
    dailyTargetHours: 8,
    dateBasis: 'planEnd',
    defaultRange: 'thisWeek',
    summaryBarItems: [],
    includeSelf: true,
    taskScope: 'all',
    workDiffBasis: 'max',
    excludeCancelled: true,
    warnMissingEst: true,
    hoursBasis: 'estimated',
    theme: 'auto'
  };

  const CSS = [
    // 满宽条会盖住云效表格的横向滚动条、挡住点击，改成可拖拽的紧凑浮标：
    // 宽度按内容走，默认停在右下角，位置记在本地。
    '.yxwt-sb{',
    '  position:fixed;z-index:2147483000;',
    '  box-sizing:border-box;height:32px;padding:0 6px 0 10px;',
    '  display:inline-flex;align-items:center;gap:10px;width:max-content;max-width:none;',
    '  border-radius:16px;cursor:grab;user-select:none;touch-action:none;',
    '  font-family:-apple-system,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;',
    '  font-size:12px;line-height:1;letter-spacing:.01em;',
    '  color:var(--yxwt-fg,#1d2333);',
    '  background:var(--yxwt-bar-bg,rgba(255,255,255,.84));',
    '  -webkit-backdrop-filter:saturate(180%) blur(14px);',
    '  backdrop-filter:saturate(180%) blur(14px);',
    '  border:1px solid var(--yxwt-border,rgba(17,24,39,.12));',
    '  box-shadow:0 6px 20px rgba(17,24,39,.14);',
    '}',
    '.yxwt-sb.is-dragging{cursor:grabbing;box-shadow:0 10px 28px rgba(17,24,39,.22);}',
    // 折叠态：只留一个小圆点，完全不挡页面
    '.yxwt-sb.is-mini{padding:0 4px 0 8px;gap:6px;}',
    '.yxwt-sb.is-mini .yxwt-sb__msg,.yxwt-sb.is-mini .yxwt-sb__btn{display:none;}',
    '.yxwt-sb.is-mini .yxwt-sb__name{display:none;}',
    '.yxwt-sb__brand{appearance:none;border:0;font:inherit;cursor:grab;touch-action:none;}',
    '.yxwt-sb.is-dragging .yxwt-sb__brand{cursor:grabbing;}',
    '.yxwt-sb__brand{',
    '  flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;',
    '  padding:3px 8px;border-radius:999px;font-size:12px;font-weight:600;',
    '  color:var(--yxwt-accent,#2f6bff);',
    '  background:var(--yxwt-accent-soft,rgba(47,107,255,.10));',
    '}',
    '.yxwt-sb__dot{width:6px;height:6px;border-radius:50%;background:currentColor;}',
    // 指标值必须完整可读：消息区和整条浮标都按内容宽度展开，不收缩、不滚动、不显示省略号。
    '.yxwt-sb__msg{',
    '  flex:0 0 auto;min-width:max-content;display:flex;align-items:center;gap:14px;',
    '  overflow:visible;white-space:nowrap;',
    '}',
    '.yxwt-sb__item{display:inline-flex;align-items:baseline;gap:5px;',
    '  flex:0 0 auto;min-width:max-content;overflow:visible;}',
    '.yxwt-sb__k{color:var(--yxwt-muted,#6b7280);font-size:12px;white-space:nowrap;}',
    '.yxwt-sb__v{font-weight:600;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;',
    '  white-space:nowrap;}',
    '.yxwt-sb__v.is-good{color:var(--yxwt-good,#12855b);}',
    '.yxwt-sb__v.is-warn{color:var(--yxwt-warn,#c2670a);}',
    '.yxwt-sb__v.is-bad{color:var(--yxwt-bad,#d93a2b);}',
    '.yxwt-sb__v.is-dim{color:var(--yxwt-dim,#8a94a6);font-weight:400;}',
    '.yxwt-sb__text{color:var(--yxwt-muted,#6b7280);white-space:nowrap;}',
    '.yxwt-sb__text.is-error{color:var(--yxwt-danger,#c62f2f);}',
    '.yxwt-sb__btn{',
    '  flex:0 0 auto;appearance:none;border:0;cursor:pointer;',
    '  height:22px;padding:0 10px;border-radius:6px;',
    '  font-family:inherit;font-size:12px;font-weight:600;',
    '  color:#fff;background:var(--yxwt-accent,#2f6bff);',
    '  transition:filter .15s ease,transform .15s ease;',
    '}',
    '.yxwt-sb__btn:hover{filter:brightness(1.08);}',
    '.yxwt-sb__btn:active{transform:translateY(1px);}',
    // 重试必须是真 button：挂在 div 上键盘和读屏都够不着
    '.yxwt-sb__retry{',
    '  appearance:none;border:0;background:transparent;cursor:pointer;padding:0;',
    '  font:inherit;color:var(--yxwt-danger,#c62f2f);text-decoration:underline;',
    '}',
    '.yxwt-sb__icon{',
    '  flex:0 0 auto;appearance:none;border:0;cursor:pointer;background:transparent;',
    '  width:20px;height:20px;border-radius:5px;line-height:1;font-size:12px;font-family:inherit;',
    '  color:var(--yxwt-muted,#6b7280);',
    '}',
    '.yxwt-sb__icon:hover{background:var(--yxwt-accent-soft,rgba(47,107,255,.10));}',
    '.yxwt-sb__btn:focus-visible,.yxwt-sb__icon:focus-visible,.yxwt-sb__retry:focus-visible{',
    '  outline:2px solid var(--yxwt-accent,#2f6bff);outline-offset:2px;',
    '}',
    '@media (max-width:720px){',
    '  .yxwt-sb{gap:8px;padding:0 6px;}',
    '  .yxwt-sb__brand{display:none;}',
    '  .yxwt-sb__msg{gap:10px;}',
    '}',
    '@media (prefers-color-scheme:dark){',
    '  :host(:not([data-theme="light"])) .yxwt-sb{',
    '    color:var(--yxwt-fg,#e6e8ee);',
    '    background:var(--yxwt-bar-bg,rgba(24,26,32,.86));',
    '    border-top-color:var(--yxwt-border,rgba(255,255,255,.12));',
    '    box-shadow:0 -6px 20px rgba(0,0,0,.35);',
    '  }',
    '  :host(:not([data-theme="light"])) .yxwt-sb__k,',
    '  :host(:not([data-theme="light"])) .yxwt-sb__text{color:var(--yxwt-muted,#9aa4b2);}',
    '  :host(:not([data-theme="light"])) .yxwt-sb__v.is-good{color:var(--yxwt-good,#3ddc97);}',
    '  :host(:not([data-theme="light"])) .yxwt-sb__v.is-warn{color:var(--yxwt-warn,#f5a524);}',
    '  :host(:not([data-theme="light"])) .yxwt-sb__v.is-bad{color:var(--yxwt-bad,#ff6b5c);}',
    '  :host(:not([data-theme="light"])) .yxwt-sb__text.is-error{color:var(--yxwt-danger,#ff6b6b);}',
    '}',
    ':host([data-theme="dark"]) .yxwt-sb{',
    '  color:var(--yxwt-fg,#e6e8ee);',
    '  background:var(--yxwt-bar-bg,rgba(24,26,32,.86));',
    '  border-top-color:var(--yxwt-border,rgba(255,255,255,.12));',
    '  box-shadow:0 -6px 20px rgba(0,0,0,.35);',
    '}',
    ':host([data-theme="dark"]) .yxwt-sb__k,',
    ':host([data-theme="dark"]) .yxwt-sb__text{color:var(--yxwt-muted,#9aa4b2);}',
    ':host([data-theme="dark"]) .yxwt-sb__v.is-good{color:var(--yxwt-good,#3ddc97);}',
    ':host([data-theme="dark"]) .yxwt-sb__v.is-warn{color:var(--yxwt-warn,#f5a524);}',
    ':host([data-theme="dark"]) .yxwt-sb__v.is-bad{color:var(--yxwt-bad,#ff6b5c);}',
    ':host([data-theme="dark"]) .yxwt-sb__text.is-error{color:var(--yxwt-danger,#ff6b6b);}'
  ].join('\n');

  const HIDE_KEY = 'yxwt_sb_hidden';   // 本次会话内隐藏（sessionStorage，关标签页即失效）

  function isHiddenThisSession() {
    try {
      return sessionStorage.getItem(HIDE_KEY) === '1';
    } catch (e) {
      return false;   // 隐私模式下 sessionStorage 会抛，当作没隐藏
    }
  }

  function setHiddenThisSession(v) {
    try {
      if (v) sessionStorage.setItem(HIDE_KEY, '1');
      else sessionStorage.removeItem(HIDE_KEY);
    } catch (e) {
      // 存不下就只能这次点了没记住，不影响主流程
    }
  }

  const state = {
    started: false,
    enabled: false,
    mounted: false,
    host: null,
    root: null,
    els: null,
    prefs: null,
    seq: 0,          // 递增序号：只认最后一次请求的结果，过期响应直接丢弃
    abort: null,
    timer: null,
    lastHref: '',
    lastKey: '',
    groupedView: false,
    forceKey: Object.create(null),   // 用户对某个列表点过「仍要统计」
    forceRefresh: false,
    errored: false
  };

  function warn(e) {
    try {
      console.warn('[云效工时统计]', e);
    } catch (ignored) {
      // 控制台不可用时也不能抛
    }
  }

  function util() {
    return NS.util || null;
  }

  function fmtHours(n) {
    const u = util();
    if (u && typeof u.fmtHours === 'function') return u.fmtHours(n);
    const v = Number(n) || 0;
    return String(Math.round(v * 10) / 10);
  }

  function str(v) {
    return typeof v === 'string' ? v : (v === null || v === undefined ? '' : String(v));
  }

  function el(tag, cls, text) {
    const ui = NS.ui;
    if (ui && typeof ui.h === 'function') {
      return ui.h(tag, { class: cls || '', text: text === undefined ? '' : text });
    }
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  /* ---------------- 路由 ---------------- */

  function readViewId() {
    const hash = str(location.hash);
    let m = VIEW_RE.exec(hash);
    if (m) return decodeURIComponent(m[1]);
    m = VIEW_RE.exec(str(location.search));
    return m ? decodeURIComponent(m[1]) : '';
  }

  /** 当前页面是否是要注入的列表页；不是返回 null */
  function parseLocation() {
    const path = str(location.pathname);
    const viewId = readViewId();
    if (PERSONAL_RE.test(path)) {
      return { kind: 'user', projectId: '', category: '', viewId: viewId };
    }
    const m = PROJECT_RE.exec(path);
    if (m) {
      return {
        kind: 'project',
        projectId: m[1],
        category: CATEGORY_BY_SEG[m[2]] || '',
        viewId: viewId
      };
    }
    return null;
  }

  /** 只有这个 key 变了才值得重新拉数据（抽屉、选中项之类的 hash 变化不算） */
  function routeKey(ctx) {
    if (!ctx) return '';
    return ctx.kind + '|' + ctx.projectId + '|' + ctx.category + '|' + ctx.viewId;
  }

  /* ---------------- 视图 filter -> conditionGroups ---------------- */

  // 视图 filter -> conditionGroups 统一走 api.viewFilterToGroups（这段错了不报错、只会静默返回 0 条）
  function filterToConditionGroups(filter) {
    const groups = NS.api.viewFilterToGroups(filter);
    // 调用方靠 null 判断「没有可用条件」，保持原有语义
    return groups && groups.length && groups[0].length ? groups : null;
  }

  /* ---------------- 分组标签（页面上那排「已完成 2467 / 待处理 25」）---------------- */

  /**
   * 找出用户当前选中的分组标签。
   *
   * 不认云效的 class 名（`next-tabs-tab active` 这种随时会变），只认两样东西：
   *   1. 标准 ARIA：[role=tab] + aria-selected="true"
   *   2. 标签文字要能和后端返回的分组名对上
   * 页面上不止一处 tabs（工作项详情抽屉里也有「动态&评论/子项/工时」），
   * 所以先按「有几个标签名能对上后端分组」挑出正确的那一组 tabs。
   *
   * @param groups api.listGroups() 的结果 [{identifier, name, count}]
   * @return {identifier, name, count} | null（没分组 / 认不出来都返回 null）
   */
  function detectActiveGroup(groups) {
    if (!groups || !groups.length) return null;
    let tabs = [];
    try {
      tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
    } catch (e) {
      return null;
    }
    if (!tabs.length) return null;

    const byName = Object.create(null);
    groups.forEach(function (g) { byName[g.name] = g; });

    // 标签文字形如「已完成2467」：名字紧跟条数，把尾部数字剥掉
    const nameOf = function (tab) {
      const raw = String(tab.textContent || '').replace(/\s+/g, '').trim();
      if (byName[raw]) return raw;                       // 没带条数的情况
      const m = /^(.*?)(\d[\d,]*)$/.exec(raw);
      const stripped = m ? m[1] : raw;
      return byName[stripped] ? stripped : '';
    };

    // 按父节点分组，挑「命中后端分组名最多」的那一组 tabs
    const buckets = [];
    tabs.forEach(function (t) {
      const parent = t.parentElement || null;
      let b = null;
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].parent === parent) { b = buckets[i]; break; }
      }
      if (!b) { b = { parent: parent, tabs: [], hits: 0 }; buckets.push(b); }
      b.tabs.push(t);
      if (nameOf(t)) b.hits++;
    });
    buckets.sort(function (a, b) { return b.hits - a.hits; });
    const best = buckets[0];
    // 至少两个标签能对上才敢认，否则可能是页面上别处的 tabs
    if (!best || best.hits < 2) return null;

    let active = null;
    for (let i = 0; i < best.tabs.length; i++) {
      if (best.tabs[i].getAttribute('aria-selected') === 'true') { active = best.tabs[i]; break; }
    }
    if (!active) {
      // aria 缺失时的兜底：class 里带 active/selected/current
      for (let i = 0; i < best.tabs.length; i++) {
        if (/(^|[\s_-])(active|selected|current)([\s_-]|$)/i.test(String(best.tabs[i].className || ''))) {
          active = best.tabs[i];
          break;
        }
      }
    }
    if (!active) return null;

    const name = nameOf(active);
    if (!name) return null;
    const g = byName[name];

    // 交叉校验：标签上写的条数应该和后端给的对得上。对不上说明我们认错了标签，宁可不筛。
    const m = /(\d[\d,]*)$/.exec(String(active.textContent || '').replace(/\s+/g, ''));
    if (m && g.count) {
      const shown = Number(String(m[1]).replace(/,/g, ''));
      if (isFinite(shown) && shown !== g.count) return null;
    }
    return g;
  }

  /** 把选中的分组转成列表接口要的 groupCondition（实证形状见 docs/API-VERIFY.md） */
  function groupConditionOf(groupField, picked) {
    if (!groupField || !groupField.identifier || !picked) return null;
    return {
      fieldIdentifier: String(groupField.identifier),
      className: String(groupField.className || groupField.identifier),
      format: 'list',
      value: [String(picked.identifier)],
      operator: 'EQUALS'
    };
  }

  /* ---------------- 查询构造 ---------------- */

  async function buildQuery(ctx) {
    if (ctx.kind === 'project') {
      const q = {
        spaceType: 'Project',
        spaceIdentifier: ctx.projectId,
        category: ctx.category,
        conditionGroups: [[]],
        scopeText: '当前项目'
      };
      // 项目页同样要跟着当前视图的筛选走（SPEC 8），否则页面列表 30 条、合计条却统计全项目 800 条。
      // 注意：spaceType/spaceIdentifier 保持项目本身，不用 view 里的覆盖——项目视图的
      // spaceIdentifier 可能是 'system' 之类的非法值，拿去查会恒返回 0 条。
      if (!ctx.viewId) return q;
      let view = null;
      try {
        view = await NS.api.getView(ctx.viewId);
      } catch (e) {
        view = null;   // 视图取不到就退回「整个项目」，不让整条统计挂掉
      }
      if (!view) return q;
      const pgroups = filterToConditionGroups(view.filter);
      if (pgroups) q.conditionGroups = pgroups;
      if (view.name) q.scopeText = String(view.name);
      return q;
    }

    const me = await NS.detect.context();
    const query = {
      spaceType: 'User',
      spaceIdentifier: str(me && me.userId),
      scope: 'personal',
      category: '',
      conditionGroups: [[]],
      scopeText: '我的工作项'
    };
    if (!query.spaceIdentifier) throw new Error('未取到当前用户');
    if (!ctx.viewId) return query;

    let view = null;
    try {
      view = await NS.api.getView(ctx.viewId);
    } catch (e) {
      view = null;   // 视图取不到就退回「个人空间全部」，不让整条统计挂掉
    }
    if (!view) return query;

    // 内置视图的 spaceIdentifier 是字面量 'system'，直接拿去查会恒返回 0 条，
    // 统一交给 api.normalizeViewSpace 收敛（panel 的「导入同事」走的是同一个函数）
    const space = NS.api.normalizeViewSpace(view, query.spaceIdentifier);
    query.spaceType = space.spaceType;
    if (space.spaceIdentifier) query.spaceIdentifier = space.spaceIdentifier;
    if (space.scope === undefined) delete query.scope;
    else query.scope = space.scope;
    const groups = filterToConditionGroups(view.filter);
    if (groups) query.conditionGroups = groups;
    if (view.name) query.scopeText = String(view.name);
    // 视图开了分组时，页面上那排「已完成 2467 / 待处理 25」的标签是**额外的**筛选，
    // 不在 view.filter 里（云效是靠单独的 groupCondition 参数发的）。
    // 在支持它之前，必须说清楚浮标算的是整个视图，否则用户看到
    // 页面「共 25 条」而浮标「共 3307 条」，只会以为插件坏了。
    try {
      const gb = view.groupBy ? JSON.parse(view.groupBy) : null;
      if (gb && gb.fieldIdentifier) {
        query.groupField = {
          identifier: String(gb.fieldIdentifier),
          className: String(gb.className || gb.fieldIdentifier)
        };
      }
    } catch (e) { /* 解析不了就当没分组 */ }
    return query;
  }

  /* ---------------- 挂载 / 卸载 ---------------- */

  function applyTheme() {
    if (!state.host) return;
    const theme = state.prefs ? state.prefs.theme : 'auto';
    if (theme === 'dark' || theme === 'light') {
      state.host.setAttribute('data-theme', theme);
    } else {
      state.host.removeAttribute('data-theme');
    }
  }

  /**
   * 找出页面上真正在滚的容器。
   * 云效是 app shell 布局，滚动经常发生在内部 div 上而不是 <html>——
   * 那种情况下只给 <html> 加 padding-bottom 完全不产生位移，合计条会直接压住分页器。
   */
  function scrollContainers() {
    const out = [];
    const de = document.documentElement;
    if (de) out.push(de);
    if (!document.body || typeof window.getComputedStyle !== 'function') return out;

    const vh = window.innerHeight || 0;
    let nodes = [];
    try {
      nodes = document.body.querySelectorAll('div,main,section');
    } catch (e) {
      return out;
    }
    // 只看前若干个，避免在超大 DOM 上做全量 getComputedStyle
    const limit = Math.min(nodes.length, 400);
    for (let i = 0; i < limit && out.length < 4; i++) {
      const n = nodes[i];
      if (!n || n.clientHeight <= 0) continue;
      // 容器得撑满大半个视口，且内容确实溢出
      if (vh && n.clientHeight < vh * 0.5) continue;
      if (n.scrollHeight <= n.clientHeight + 8) continue;
      let oy = '';
      try {
        oy = window.getComputedStyle(n).overflowY;
      } catch (e) {
        continue;
      }
      if (oy !== 'auto' && oy !== 'scroll') continue;
      out.push(n);
    }
    return out;
  }

  function padNode(n) {
    if (!n || !n.style || !n.dataset) return;
    if (n.dataset.yxwtPad === '1') return;
    n.dataset.yxwtPadPrev = n.style.paddingBottom || '';
    n.dataset.yxwtPad = '1';
    n.style.paddingBottom = PAGE_PAD;
  }

  function unpadNode(n) {
    if (!n || !n.style || !n.dataset || n.dataset.yxwtPad !== '1') return;
    n.style.paddingBottom = n.dataset.yxwtPadPrev || '';
    delete n.dataset.yxwtPadPrev;
    delete n.dataset.yxwtPad;
  }

  // 浮标是紧凑的、可拖走的，不再需要给页面垫底部留白。
  // 保留 removePagePadding 是为了把**老版本**留在页面上的 padding 清掉，
  // 否则用户从旧版升级上来会看到云效底部凭空多一块空白。
  function addPagePadding() { /* 已改为浮标定位，不再垫页面 */ }

  const POS_KEY = '_sbPos';
  const MARGIN = 12;

  function clampPos(x, y, w, h) {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    return {
      x: Math.max(MARGIN, Math.min(x, vw - w - MARGIN)),
      y: Math.max(MARGIN, Math.min(y, vh - h - MARGIN))
    };
  }

  function applyPos(pos) {
    const bar = state.els && state.els.bar;
    if (!bar) return;
    const w = bar.offsetWidth || 320;
    const h = bar.offsetHeight || 32;
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    // 没存过位置就默认停右下角（避开云效自己的右下角悬浮球，往左让一点）
    const raw = pos && isFinite(pos.x) && isFinite(pos.y)
      ? pos
      : { x: vw - w - 72, y: vh - h - MARGIN };
    const p = clampPos(raw.x, raw.y, w, h);
    bar.style.left = p.x + 'px';
    bar.style.top = p.y + 'px';
    bar.style.right = 'auto';
    bar.style.bottom = 'auto';
  }

  const MINI_KEY = '_sbMini';

  function applyMini(on) {
    const bar = state.els && state.els.bar;
    if (!bar) return;
    if (on) bar.classList.add('is-mini');
    else bar.classList.remove('is-mini');
    keepInView();
  }

  function toggleMini() {
    const bar = state.els && state.els.bar;
    if (!bar) return;
    const next = !bar.classList.contains('is-mini');
    applyMini(next);
    if (NS.store && typeof NS.store.setPrefs === 'function') {
      const patch = {};
      patch[MINI_KEY] = next;
      NS.store.setPrefs(patch).catch(function () { /* 记不住只影响下次 */ });
    }
  }

  function keepInView() {
    const bar = state.els && state.els.bar;
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    if (!r.width) return;
    const p = clampPos(r.left, r.top, r.width, r.height);
    bar.style.left = p.x + 'px';
    bar.style.top = p.y + 'px';
  }

  function savePos(p) {
    if (!NS.store || typeof NS.store.setPrefs !== 'function') return;
    const patch = {};
    patch[POS_KEY] = { x: Math.round(p.x), y: Math.round(p.y) };
    NS.store.setPrefs(patch).catch(function () { /* 记不住只影响下次位置 */ });
  }

  /** 让浮标可以拖走。移动超过 3px 才算拖拽，否则当点击处理，不吞掉按钮 */
  function makeDraggable(bar) {
    let dragging = false;
    let moved = false;
    let captureTarget = null;
    let sx = 0, sy = 0, ox = 0, oy = 0;

    bar.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      // 普通按钮上按下不拖；品牌蓝色区域在展开/折叠两种状态下都同时支持点击和拖动。
      const t = e.target;
      const button = t && t.closest ? t.closest('button') : null;
      const brandButton = button && button.classList.contains('yxwt-sb__brand');
      if (button && !brandButton) return;
      dragging = true;
      moved = false;
      sx = e.clientX; sy = e.clientY;
      const r = bar.getBoundingClientRect();
      ox = r.left; oy = r.top;
      // 品牌按钮要自己持有 pointer capture，否则无移动点击会被重定向到外层 bar。
      captureTarget = brandButton ? button : bar;
      try { captureTarget.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器忽略 */ }
    });

    bar.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      if (!moved) { moved = true; bar.classList.add('is-dragging'); }
      const p = clampPos(ox + dx, oy + dy, bar.offsetWidth, bar.offsetHeight);
      bar.style.left = p.x + 'px';
      bar.style.top = p.y + 'px';
      e.preventDefault();
    });

    const end = function (e) {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove('is-dragging');
      try { if (captureTarget) captureTarget.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      captureTarget = null;
      if (!moved) return;
      const r = bar.getBoundingClientRect();
      savePos({ x: r.left, y: r.top });
      // pointerup 后浏览器还会派发 click；标记到当前任务结束，避免拖完品牌区又立即折叠/展开。
      bar.setAttribute('data-yxwt-dragged', '1');
      setTimeout(function () { bar.removeAttribute('data-yxwt-dragged'); }, 0);
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);

    // 窗口变小时别让浮标跑到视口外面去
    window.addEventListener('resize', function () {
      const r = bar.getBoundingClientRect();
      const p = clampPos(r.left, r.top, bar.offsetWidth, bar.offsetHeight);
      bar.style.left = p.x + 'px';
      bar.style.top = p.y + 'px';
    });
  }

  function removePagePadding() {
    const de = document.documentElement;
    unpadNode(de);
    let marked = [];
    try {
      marked = document.querySelectorAll('[data-yxwt-pad="1"]');
    } catch (e) {
      marked = [];
    }
    for (let i = 0; i < marked.length; i++) unpadNode(marked[i]);
  }

  function buildDom(root) {
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    const bar = el('div', 'yxwt-sb');
    const brand = el('button', 'yxwt-sb__brand');
    if (brand.setAttribute) {
      brand.setAttribute('type', 'button');
      brand.title = '点一下折叠/展开，按住可拖动（折叠后只剩一个小标记）';
    }
    brand.appendChild(el('span', 'yxwt-sb__dot'));
    brand.appendChild(el('span', 'yxwt-sb__name', '工时统计'));
    brand.addEventListener('click', function (e) {
      if (bar.getAttribute('data-yxwt-dragged') === '1') {
        e.preventDefault();
        return;
      }
      toggleMini();
    });
    const msg = el('div', 'yxwt-sb__msg');
    const btn = el('button', 'yxwt-sb__btn', '详细统计');
    if (btn.setAttribute) btn.setAttribute('type', 'button');

    // 设置入口：合计条上原本没有任何指引，用户想关掉只能自己去扩展管理里翻
    const gear = el('button', 'yxwt-sb__icon', '⚙');
    if (gear.setAttribute) {
      gear.setAttribute('type', 'button');
      gear.setAttribute('title', '打开插件设置');
      gear.setAttribute('aria-label', '打开插件设置');
    }

    // 关闭：只隐藏本次会话，重开标签页还在（永久关闭仍在设置页）
    const closeBtn = el('button', 'yxwt-sb__icon', '✕');
    if (closeBtn.setAttribute) {
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('title', '本次浏览会话内隐藏（想永久关闭请到插件设置）');
      closeBtn.setAttribute('aria-label', '隐藏合计条');
    }

    bar.appendChild(brand);
    bar.appendChild(msg);
    bar.appendChild(btn);
    bar.appendChild(gear);
    bar.appendChild(closeBtn);
    root.appendChild(bar);

    btn.addEventListener('click', function () {
      openPanel();
    });
    gear.addEventListener('click', function () {
      openOptions();
    });
    closeBtn.addEventListener('click', function () {
      setHiddenThisSession(true);
      unmount();
    });

    return { bar: bar, msg: msg, btn: btn };
  }

  function openOptions() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime &&
          typeof chrome.runtime.openOptionsPage === 'function') {
        chrome.runtime.openOptionsPage();
        return;
      }
    } catch (e) { /* 继续降级 */ }
    try {
      const p = chrome.runtime.sendMessage({ type: 'YXWT_OPEN_OPTIONS' });
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {
      warn(e);
    }
  }

  function ensureMounted() {
    if (state.mounted) return true;
    if (isHiddenThisSession()) return false;
    if (!document.body) return false;
    const ui = NS.ui;
    if (!ui || typeof ui.mount !== 'function') return false;

    let mounted = null;
    try {
      mounted = ui.mount(HOST_ID);
    } catch (e) {
      warn(e);
      return false;
    }
    if (!mounted || !mounted.root) return false;

    state.host = mounted.host || null;
    state.root = mounted.root;
    state.els = buildDom(mounted.root);
    state.mounted = true;
    applyTheme();
    // 老版本可能给页面垫过底部留白，升级上来要清掉，否则云效底部凭空多一块空白
    removePagePadding();
    applyMini(!!(state.prefs && state.prefs[MINI_KEY]));
    applyPos(state.prefs && state.prefs[POS_KEY]);
    makeDraggable(state.els.bar);
    return true;
  }

  function unmount() {
    state.seq++;   // 让在途请求的结果失效
    abortInFlight();
    if (!state.mounted) return;
    try {
      if (NS.ui && typeof NS.ui.unmount === 'function') NS.ui.unmount(HOST_ID);
    } catch (e) {
      warn(e);
    }
    removePagePadding();
    state.mounted = false;
    state.host = null;
    state.root = null;
    state.els = null;
    state.errored = false;
    state.lastKey = '';
  }

  function openPanel() {
    const panel = NS.panel;
    if (!panel || typeof panel.open !== 'function') {
      warn('面板模块未就绪');
      return;
    }
    try {
      const r = panel.open();
      if (r && typeof r.catch === 'function') r.catch(warn);
    } catch (e) {
      warn(e);
    }
  }

  /* ---------------- 渲染 ---------------- */

  function setText(text, isError) {
    if (!state.els) return;
    const msg = state.els.msg;
    clearNode(msg);
    if (isError) {
      // 重试做成真 <button>：原来是给 div 挂 click，键盘和读屏用户既感知不到也点不了
      const b = el('button', 'yxwt-sb__retry', text);
      if (b.setAttribute) b.setAttribute('type', 'button');
      b.addEventListener('click', function () { refreshNow(true); });
      msg.appendChild(b);
    } else {
      msg.appendChild(el('span', 'yxwt-sb__text', text));
    }
    state.errored = !!isError;
  }

  function setMetrics(items, title) {
    if (!state.els) return;
    const msg = state.els.msg;
    clearNode(msg);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const wrap = el('span', 'yxwt-sb__item');
      wrap.appendChild(el('span', 'yxwt-sb__k', it.k));
      wrap.appendChild(el('span', 'yxwt-sb__v' + (it.tone ? ' is-' + it.tone : ''), it.v));
      msg.appendChild(wrap);
    }
    // title 继续保留完整摘要，便于悬浮查看统计范围和快照时间。
    const full = items.map(function (it) {
      return (it.k ? it.k + ' ' : '') + it.v;
    }).join(' · ');
    if (msg.setAttribute) msg.setAttribute('title', full + (title ? '\n' + title : ''));
    state.errored = false;
    // 内容变了宽度就变了，重新夹一次，别让浮标被撑出视口
    keepInView();
  }

  function renderLoading(loaded, total) {
    if (total > 0 && loaded > 0 && loaded < total) {
      setText('统计中… ' + loaded + '/' + total, false);
    } else {
      setText('统计中…', false);
    }
  }

  /** 列表太大时不自动统计，给一个可点的入口，别让用户以为插件坏了 */
  function renderTooBig(total, key, scopeText) {
    if (!state.els) return;
    const msg = state.els.msg;
    clearNode(msg);
    const wrap = el('span', 'yxwt-sb__item');
    wrap.appendChild(el('span', 'yxwt-sb__k', '共'));
    wrap.appendChild(el('span', 'yxwt-sb__v', String(total) + ' 条'));
    msg.appendChild(wrap);
    const go = el('button', 'yxwt-sb__retry', '条数较多，点此统计');
    if (go.setAttribute) go.setAttribute('type', 'button');
    go.addEventListener('click', function () {
      state.forceKey[key] = true;
      refreshNow();
    });
    msg.appendChild(go);
    if (msg.setAttribute) {
      msg.setAttribute('title', '统计范围：' + (scopeText || '当前列表') +
        '\n共 ' + total + ' 条，超过 ' + BIG_LIST + ' 条不自动统计（要翻很多页，慢且占用云效资源）。' +
        '点一下就会统计，或者先用云效的筛选把范围缩小。');
    }
    state.errored = false;
    keepInView();
  }

  function renderError(e) {
    const raw = e && e.message ? String(e.message) : String(e || '');
    let tip = '统计失败，点击重试';
    if (raw === 'YXWT_NOT_LOGGED_IN') tip = '未登录云效，登录后点击重试';
    setText(tip, true);
    if (state.els && state.els.msg && state.els.msg.setAttribute && raw) {
      state.els.msg.setAttribute('title', raw);
    }
  }

  function customMetrics(sum, truncated, range, missing, rows, memberCount) {
    const prefs = state.prefs || FALLBACK_PREFS;
    const diff = Number(sum.diff) || 0;
    const overdue = NS.stats.overdue(rows, Date.now()) || { rate: 0 };
    const work = NS.workcalendar.summarize(range.start, range.end,
      prefs.dailyTargetHours, memberCount);
    const workDiff = NS.stats.workHoursTotal(rows, prefs.workDiffBasis) - work.hours;
    const avg = prefs.hoursBasis === 'both'
      ? fmtHours(sum.avgPerDay) + ' / ' + fmtHours(sum.avgPerDayAct)
      : fmtHours(prefs.hoursBasis === 'actual' ? sum.avgPerDayAct : sum.avgPerDay);
    const values = {
      range: { v: range.label },
      count: { v: String(Number(sum.count) || 0) + (truncated ? '+' : '') + ' 条' },
      estimated: { v: fmtHours(sum.est) + ' h' },
      actual: { v: fmtHours(sum.act) + ' h' },
      diff: {
        v: (diff > 0 ? '+' : '') + fmtHours(diff) + ' h',
        tone: diff > 0 ? 'warn' : (diff < 0 ? 'good' : '')
      },
      avgPerDay: { v: avg + ' h' },
      overdueRate: { v: fmtHours(overdue.rate) + ' %', tone: overdue.rate > 20 ? 'bad' : '' },
      missingEst: { v: String(Number(missing) || 0) + ' 条', tone: missing > 0 ? 'bad' : 'good' },
      workdayTotal: { v: fmtHours(work.hours) + ' h', tone: work.unsupportedYears.length ? 'warn' : '' },
      workdayDiff: {
        v: (workDiff > 0 ? '+' : '') + fmtHours(workDiff) + ' h',
        tone: workDiff > 0 ? 'bad' : (workDiff < 0 ? 'good' : '')
      }
    };

    if (range.key === 'thisWeek' || range.key === 'thisMonth') {
      const today = util().toYMD(new Date());
      const throughEnd = today < range.end ? today : range.end;
      const through = NS.workcalendar.summarize(range.start, throughEnd,
        prefs.dailyTargetHours, memberCount);
      const throughDiff = NS.stats.workHoursTotal(rows, prefs.workDiffBasis) - through.hours;
      values.throughToday = {
        v: fmtHours(through.hours) + ' h', tone: through.unsupportedYears.length ? 'warn' : ''
      };
      values.throughTodayDiff = {
        v: (throughDiff > 0 ? '+' : '') + fmtHours(throughDiff) + ' h',
        tone: throughDiff > 0 ? 'bad' : (throughDiff < 0 ? 'good' : '')
      };
    }

    const config = NS.summaryItems;
    const selected = config.normalize(prefs.summaryBarItems, range.key, prefs.hoursBasis);
    const byKey = Object.create(null);
    config.available(range.key, prefs.hoursBasis).forEach(function (item) { byKey[item.key] = item; });
    return selected.map(function (key) {
      const def = byKey[key];
      const value = values[key];
      return def && value ? { k: def.shortLabel, v: value.v, tone: value.tone || '' } : null;
    }).filter(Boolean);
  }

  function renderResult(sum, hasFieldMap, truncated, range, savedAt, missing, memberErrors, rows, memberCount) {
    const prefs = state.prefs || FALLBACK_PREFS;
    const selected = NS.summaryItems.normalize(prefs.summaryBarItems, range.key, prefs.hoursBasis);
    let items = null;
    if (selected.length) {
      items = customMetrics(sum, truncated, range, missing, rows, memberCount);
    } else {
      // 空配置严格保持旧版显示，避免升级后已有用户的悬浮条突然变化。
      items = [{ k: '范围', v: range.label }, {
        k: '共',
        v: String(Number(sum.count) || 0) + (truncated ? '+' : '') + ' 条'
      }];
      if (hasFieldMap) {
        // 只用预计的团队不该在浮标上看到实际和偏差；偏差是两者相减，只有都用时才有意义
        const hb = (state.prefs && state.prefs.hoursBasis) || 'estimated';
        const showEst = hb === 'estimated' || hb === 'both';
        const showAct = hb === 'actual' || hb === 'both';
        const diff = Number(sum.diff) || 0;
        if (showEst) items.push({ k: '预计', v: fmtHours(sum.est) + ' h' });
        if (showAct) items.push({ k: '实际', v: fmtHours(sum.act) + ' h' });
        if (hb === 'both') {
          items.push({
            k: '偏差',
            v: (diff > 0 ? '+' : '') + fmtHours(diff) + ' h',
            tone: diff > 0 ? 'warn' : (diff < 0 ? 'good' : '')
          });
        }
        // 漏填的工时会把上面的合计压低，不点出来根本发现不了
        if (missing > 0) {
          const mk = state.prefs && state.prefs.hoursBasis === 'actual' ? '未填实际'
            : (state.prefs && state.prefs.hoursBasis === 'both' ? '未填工时' : '未填预计');
          items.push({ k: mk, v: String(missing) + ' 条', tone: 'bad' });
        }
      } else {
        items.push({ k: '', v: '未识别到工时字段' });
      }
    }
    let title = '统计范围：' + range.label + '（' + range.start + ' ~ ' + range.end + '）';
    if (prefs.taskScope === 'completed') title += '\n任务状态范围：仅已完成';
    if (savedAt) title += '\n本地快照：' + new Date(savedAt).toLocaleString();
    if (missing > 0) {
      const what = state.prefs && state.prefs.hoursBasis === 'actual' ? '「实际工时」'
        : (state.prefs && state.prefs.hoursBasis === 'both' ? '工时（预计或实际缺一个就算）' : '「预计工时」');
      title += '\n⚠ ' + missing + ' 条没填' + what + '，上面的合计是偏低的；点「详细统计」可以标红置顶看是哪些。';
    }
    if (memberErrors && memberErrors.length) title += '\n⚠ ' + memberErrors.length + ' 位成员加载失败，本次统计不含其数据。';
    if (truncated) title += '\n数据达到分页上限，统计可能不完整。';
    if (!hasFieldMap) title += '；请到设置页手动指定预计/实际工时字段';
    setMetrics(items, title);
  }

  /* ---------------- 拉数 ---------------- */

  function abortInFlight() {
    if (state.abort) {
      try {
        state.abort.abort();
      } catch (e) {
        // AbortController 不可用时忽略
      }
      state.abort = null;
    }
  }

  function isAbort(e) {
    return !!e && (e.name === 'AbortError' || String(e.message || '').indexOf('abort') >= 0);
  }

  async function doRefresh() {
    const ctx = parseLocation();
    if (!ctx || !state.enabled || isHiddenThisSession()) {
      unmount();
      return;
    }
    if (!ensureMounted()) return;

    state.lastKey = routeKey(ctx);
    addPagePadding();   // SPA 换页后滚动容器可能换了，重算一次避让
    const seq = ++state.seq;
    abortInFlight();

    renderLoading(0, 0);

    try {
      const prefs = state.prefs || FALLBACK_PREFS;
      const range = NS.rangeData.rangeFromPrefs(prefs);
      const scope = await NS.rangeData.resolve(prefs);
      if (seq !== state.seq) return;
      const query = {
        start: range.start,
        end: range.end,
        dateBasis: prefs.dateBasis,
        excludeCancelled: prefs.excludeCancelled !== false
      };
      const force = state.forceRefresh;
      state.forceRefresh = false;
      const monthRange = NS.rangeData.currentMonthRange();
      const isCurrentMonth = query.start === monthRange.start && query.end === monthRange.end;
      let daily = null;
      // 次日首次访问自动全量刷新本月。面板同时打开时会复用 rangeData 内的同一个在途请求。
      if (!(force && isCurrentMonth)) {
        daily = await NS.rangeData.refreshThisMonthIfNeeded(scope, prefs, {
          onProgress: function (p) {
            if (seq === state.seq) setText('自动刷新本月… ' + p.done + '/' + p.total + ' 人', false);
          }
        });
        if (seq !== state.seq) return;
      }
      let snapshot = (!force && isCurrentMonth && daily && daily.snapshot) ? daily.snapshot : null;
      if (!snapshot && !force) snapshot = await NS.rangeData.readSnapshot(scope, query);
      if (!snapshot && isCurrentMonth && daily && daily.error) throw daily.error;
      if (!snapshot) {
        snapshot = await NS.rangeData.fetchSnapshot(scope, Object.assign({}, query, {
          onProgress: function (p) {
            if (seq === state.seq) setText('统计中… ' + p.done + '/' + p.total + ' 人', false);
          }
        }));
      }
      if (seq !== state.seq) return;

      const rows = NS.stats.filterByTaskScope(snapshot.rows || [], prefs.taskScope);
      const sum = NS.stats.summarize(rows);
      const fieldMap = scope.fieldMap;
      const hasFieldMap = !!(fieldMap && (fieldMap.estimated || fieldMap.actual));
      // 预计工时字段没识别出来时整表 est 都是 0，这时候提示「全都没填」是误报
      // 未填提醒跟着「统计口径」走：用实际工时统计的团队，「未填预计」对他们是噪音
      const basisPref = prefs.hoursBasis === 'actual' || prefs.hoursBasis === 'both'
        ? prefs.hoursBasis : 'estimated';
      const hasEstField = !!(fieldMap && fieldMap.estimated && fieldMap.estimated.id);
      const hasActField = !!(fieldMap && fieldMap.actual && fieldMap.actual.id);
      const fieldReady = basisPref === 'actual' ? hasActField
        : (basisPref === 'both' ? (hasEstField && hasActField) : hasEstField);
      const canWarnMissing = fieldReady && prefs.warnMissingEst !== false;
      const missBasis = basisPref === 'actual' ? 'act' : (basisPref === 'both' ? 'both' : 'est');
      const missing = canWarnMissing ? NS.stats.missingHours(rows, missBasis).count : 0;
      renderResult(sum, hasFieldMap, !!snapshot.truncated, range, snapshot.savedAt, missing,
        snapshot.memberErrors, rows, scope.members.length);
    } catch (e) {
      if (seq !== state.seq || isAbort(e)) return;
      warn(e);
      renderError(e);
    }
  }

  let scheduled = null;

  function scheduleRefresh() {
    if (!scheduled) {
      const u = util();
      scheduled = u && typeof u.debounce === 'function'
        ? u.debounce(runRefresh, DEBOUNCE_MS)
        : runRefresh;
    }
    scheduled();
  }

  function runRefresh() {
    doRefresh().catch(warn);
  }

  function refreshNow(force) {
    if (force === true) state.forceRefresh = true;
    state.lastKey = '';
    runRefresh();
  }

  /* ---------------- 路由监听 ---------------- */

  function onLocationMaybeChanged() {
    const href = location.href;
    if (href === state.lastHref) return;
    state.lastHref = href;

    const ctx = parseLocation();
    if (!ctx) {
      unmount();
      return;
    }
    const key = routeKey(ctx);
    if (state.mounted && key === state.lastKey) return;   // 只是抽屉/选中项变化，不重拉
    state.lastKey = key;
    scheduleRefresh();
  }

  function startWatch() {
    if (state.timer) return;
    window.addEventListener('hashchange', onLocationMaybeChanged, false);
    window.addEventListener('popstate', onLocationMaybeChanged, false);
    state.timer = setInterval(onLocationMaybeChanged, POLL_MS);
  }

  function stopWatch() {
    if (!state.timer) return;
    window.removeEventListener('hashchange', onLocationMaybeChanged, false);
    window.removeEventListener('popstate', onLocationMaybeChanged, false);
    clearInterval(state.timer);
    state.timer = null;
  }

  function apply() {
    const prefs = state.prefs || FALLBACK_PREFS;
    state.enabled = prefs.showSummaryBar !== false;
    if (!state.enabled) {
      stopWatch();
      unmount();
      return;
    }
    startWatch();
    state.lastHref = location.href;
    if (!parseLocation()) {
      unmount();
      return;
    }
    applyTheme();
    scheduleRefresh();
  }

  function samePrefs(a, b) {
    if (!a || !b) return false;
    return a.showSummaryBar === b.showSummaryBar &&
      a.dateBasis === b.dateBasis &&
      a.defaultRange === b.defaultRange &&
      JSON.stringify(a.summaryBarItems || []) === JSON.stringify(b.summaryBarItems || []) &&
      a.includeSelf === b.includeSelf &&
      a.taskScope === b.taskScope &&
      a.workDiffBasis === b.workDiffBasis &&
      a.excludeCancelled === b.excludeCancelled &&
      a.warnMissingEst === b.warnMissingEst &&
      a.hoursBasis === b.hoursBasis &&
      a.theme === b.theme;
  }

  async function init() {
    if (state.started) return;
    state.started = true;

    let cfg = null;
    try {
      cfg = await NS.store.get();
    } catch (e) {
      warn(e);
    }
    state.prefs = (cfg && cfg.prefs) || FALLBACK_PREFS;

    try {
      NS.store.onChange(function (next) {
        const prefs = (next && next.prefs) || FALLBACK_PREFS;
        if (samePrefs(prefs, state.prefs)) return;
        const wasEnabled = state.enabled;
        state.prefs = prefs;
        applyTheme();
        if (prefs.showSummaryBar === false || !wasEnabled) {
          apply();          // 开关变化：整体启停
        } else {
          refreshNow();     // 口径/主题变化：重算一次
        }
      });
    } catch (e) {
      warn(e);
    }

    apply();
  }

  NS.summarybar = {
    // 仅供测试：分组标签检测依赖页面 DOM，是最容易悄悄失效的一段
    _detectActiveGroup: detectActiveGroup,
    _groupConditionOf: groupConditionOf,
    init: init,
    refresh: refreshNow,
    unmount: unmount,
    isMounted: function () {
      return state.mounted;
    }
  };
})();


  /* ================= src/userscript-boot.js ================= */
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


  /* ================= src/content.js ================= */
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


})(new Proxy({}, {
  get: function (_t, key) {
    const shim = window.YXWT && window.YXWT.__chromeShim;
    return shim ? shim[key] : undefined;
  },
  has: function (_t, key) {
    const shim = window.YXWT && window.YXWT.__chromeShim;
    return !!shim && key in shim;
  }
}));
