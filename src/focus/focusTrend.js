// LifeOS — Focus module P1: week + range aggregates (PURE — the calc layer for the
// foot ring-strip, the lead trend, and the stacked-bar range view). Weeks are
// ROLLING 7-Amsterdam-day windows ending today (Planner ruling A) — the SAME
// definition Gym uses, so the trend and the weekly goal always agree. Shares the
// ONE day helper (gymDates); never recomputes a duration (defers to focusCalc).

import { amsTodayYMD, shiftYMD } from "../gym/gymDates.js";
import { sessionFocusSeconds, sessionsOnDay } from "./focusCalc.js";

// Focus seconds logged on one Amsterdam day (thin wrapper over focusCalc for reuse).
function focusOnDay(sessions, ymd) {
  return sessionsOnDay(sessions, ymd).reduce((t, s) => t + sessionFocusSeconds(s), 0);
}

// The foot mini-ring strip: today + the 6 prior Amsterdam days, oldest first →
// [{ ymd, focusSeconds }]. This IS "this week" (ruling A: rolling 7-day window).
export function weekRingStrip(sessions, { now = Date.now() } = {}) {
  const today = amsTodayYMD(now);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const ymd = shiftYMD(today, -i);
    out.push({ ymd, focusSeconds: focusOnDay(sessions, ymd) });
  }
  return out;
}

// `n` rolling weekly day-sets, oldest first. Week 0 (the last entry) ends today →
// its days are the ring-strip's days; week i ends 7*i days before today.
function weekBuckets(n, now) {
  const today = amsTodayYMD(now);
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const days = [];
    for (let d = 0; d < 7; d++) days.push(shiftYMD(today, -7 * i - d));
    weeks.push({ endsIndex: i, days });
  }
  return weeks;
}

// Total focus seconds across a set of Amsterdam days.
function focusOverDays(sessions, days) {
  return days.reduce((t, ymd) => t + focusOnDay(sessions, ymd), 0);
}

// The lead trend: this week vs the trailing 6-week average (ruling A windows).
// weeksSoFar = how many of the trailing 6 weeks actually have data (so the UI can
// disclose "N weeks so far" until the baseline is full); baselineFull once all 6
// carry data. thisWeekSeconds is always real; trailingAvgSeconds/deltaSeconds are
// null until there IS a baseline (weeks 0–1 → "building your baseline").
export function weekVsTrailingAvg(sessions, { now = Date.now(), baselineWeeks = 6 } = {}) {
  const buckets = weekBuckets(baselineWeeks + 1, now); // [oldest … week1, week0]
  const week0 = buckets[buckets.length - 1];
  const trailing = buckets.slice(0, buckets.length - 1); // the 6 weeks before this one

  const thisWeekSeconds = focusOverDays(sessions, week0.days);
  const weekTotals = trailing.map((w) => focusOverDays(sessions, w.days));
  const withData = weekTotals.filter((t) => t > 0);
  const weeksSoFar = withData.length;

  const trailingAvgSeconds = weeksSoFar ? withData.reduce((a, b) => a + b, 0) / weeksSoFar : null;
  const deltaSeconds = trailingAvgSeconds == null ? null : thisWeekSeconds - trailingAvgSeconds;

  return {
    thisWeekSeconds,
    trailingAvgSeconds,
    deltaSeconds,
    weeksSoFar,
    baselineFull: weeksSoFar >= baselineWeeks,
  };
}

const RANGE_DAYS = { week: 7, month: 30, ninety: 90 };

// The stacked-bar range view: per Amsterdam day (oldest first) over the range, each
// day's total focus + a per-category breakdown for the stack, plus the period total.
//   → { days:[{ ymd, total, segments:[{ categoryId, focusSeconds }] }], total }
// segments are sorted biggest-first so the stack renders stably.
export function rangeBars(sessions, { range = "week", now = Date.now() } = {}) {
  const n = RANGE_DAYS[range] || RANGE_DAYS.week;
  const today = amsTodayYMD(now);
  const days = [];
  let total = 0;
  for (let i = n - 1; i >= 0; i--) {
    const ymd = shiftYMD(today, -i);
    const byCat = new Map();
    let dayTotal = 0;
    for (const s of sessionsOnDay(sessions, ymd)) {
      const secs = sessionFocusSeconds(s);
      if (secs <= 0) continue;
      const key = s.category_id ?? null;
      byCat.set(key, (byCat.get(key) || 0) + secs);
      dayTotal += secs;
    }
    const segments = [...byCat.entries()]
      .map(([categoryId, focusSeconds]) => ({ categoryId, focusSeconds }))
      .sort((a, b) => b.focusSeconds - a.focusSeconds);
    days.push({ ymd, total: dayTotal, segments });
    total += dayTotal;
  }
  return { days, total };
}
