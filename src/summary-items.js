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
    { key: 'estimated', label: '预计工时', shortLabel: '预计' },
    { key: 'actual', label: '实际工时', shortLabel: '实际' },
    { key: 'diff', label: '偏差', shortLabel: '偏差' },
    { key: 'avgPerDay', label: '日均工时', shortLabel: '日均' },
    { key: 'overdueRate', label: '逾期率', shortLabel: '逾期率' },
    { key: 'missingEst', label: '未填预计', shortLabel: '未填预计' },
    { key: 'workdayTotal', label: '工作日总工时', shortLabel: '工作日总工时' },
    { key: 'workdayDiff', label: '工时偏差', shortLabel: '工时偏差' },
    { key: 'throughToday', label: '截止今日工时', shortLabel: '截止今日工时', currentOnly: true },
    { key: 'throughTodayDiff', label: '截止今日工时偏差', shortLabel: '截止今日工时偏差', currentOnly: true }
  ];

  function available(rangeKey) {
    const current = !!CURRENT_RANGES[String(rangeKey || '')];
    return ITEMS.filter(function (item) { return !item.currentOnly || current; });
  }

  /**
   * 空数组表示兼容旧版默认显示；非空数组表示自定义显示，并强制包含 range。
   * 返回值按指标目录排序、去重，同时剔除当前时间范围不存在的指标。
   */
  function normalize(value, rangeKey) {
    if (!Array.isArray(value) || !value.length) return [];
    const picked = Object.create(null);
    value.forEach(function (key) { picked[String(key || '')] = true; });
    const list = available(rangeKey).filter(function (item) { return !!picked[item.key]; })
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
