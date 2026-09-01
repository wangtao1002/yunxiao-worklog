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
