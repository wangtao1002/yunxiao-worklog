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
