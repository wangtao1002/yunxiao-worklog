/**
 * background service worker（SPEC 第 10 节）
 *
 * 职责只有两件：
 *   1. 点击工具栏图标 -> 通知当前云效标签页开关面板；不在云效页面就打开云效
 *   2. 首次安装打开设置页
 * 没有网络请求，没有埋点，不持有任何业务状态。
 */
'use strict';

const YX_PREFIX = 'https://devops.aliyun.com/';
const YX_ENTRY = 'https://devops.aliyun.com/projex/workitem';

function isYunxiaoUrl(url) {
  return typeof url === 'string' && url.indexOf(YX_PREFIX) === 0;
}

function hasTabId(tab) {
  return !!tab && typeof tab.id === 'number' && tab.id >= 0;
}

const HINT_TITLE = '插件已更新，请刷新这个云效页面（F5）后再点';
const HINT_MS = 6000;

/**
 * content script 没就绪时的提示：只改图标徽标与悬浮文案，不碰页面。
 * 用徽标而不是 chrome.notifications，是为了不额外申请 notifications 权限。
 */
async function hintReload(tabId) {
  try {
    await chrome.action.setBadgeText({ tabId: tabId, text: '刷新' });
    await chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#dd8400' });
    await chrome.action.setTitle({ tabId: tabId, title: HINT_TITLE });
  } catch (e) {
    console.warn('[YXWT] 设置提示徽标失败：', e);
    return;
  }
  setTimeout(function () {
    chrome.action.setBadgeText({ tabId: tabId, text: '' }).catch(function () {});
    chrome.action.setTitle({ tabId: tabId, title: '云效工时统计（Alt+H）' }).catch(function () {});
  }, HINT_MS);
}

chrome.action.onClicked.addListener(async function (tab) {
  try {
    // tab.url 依赖 host_permissions；非云效页面拿不到 url，同样走「打开云效」分支
    if (!isYunxiaoUrl(tab && tab.url) || !hasTabId(tab)) {
      await chrome.tabs.create({ url: YX_ENTRY });
      return;
    }
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'YXWT_TOGGLE_PANEL' });
    } catch (e) {
      // 插件刚安装/刚更新时老标签页里没有 content script，sendMessage 会 reject。
      // 这里绝不能替用户 reload：云效工作项的描述框、评论框都是不自动保存的长文本，
      // 一次静默刷新就全没了；而 sendMessage 失败的原因也不止「没注入」一种。
      // 改成在图标上提示用户自己刷新。
      await hintReload(tab.id);
    }
  } catch (e) {
    console.warn('[YXWT] 处理图标点击失败：', e);
  }
});

// content script 里没有 chrome.runtime.openOptionsPage，面板的「打开设置」要转给这里代开
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== 'YXWT_OPEN_OPTIONS') {
    return undefined;
  }
  try {
    const ret = chrome.runtime.openOptionsPage();
    if (ret && typeof ret.then === 'function') {
      ret.then(function () { sendResponse({ ok: true }); }, function (e) {
        sendResponse({ ok: false, error: (e && e.message) || String(e) });
      });
      return true;
    }
    sendResponse({ ok: true });
  } catch (e) {
    sendResponse({ ok: false, error: (e && e.message) || String(e) });
  }
  return false;
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (!details || details.reason !== 'install') {
    return;
  }
  try {
    const ret = chrome.runtime.openOptionsPage();
    if (ret && typeof ret.catch === 'function') {
      ret.catch(function (e) {
        console.warn('[YXWT] 打开设置页失败：', e);
      });
    }
  } catch (e) {
    console.warn('[YXWT] 打开设置页失败：', e);
  }
});
