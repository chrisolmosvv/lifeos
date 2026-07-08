// LifeOS — Health → Activity (S5 + V2 P0c): activity transforms (PURE).
//
// Takes raw activity_hourly rows for ONE metric + "today", and returns daily
// totals and rolling figures. Aggregation per metric type:
//   SUM metrics  (steps, active_energy, resting_energy, stand_minutes,
//                 flights_climbed) → SUMMED across the day's hours.
//   AVG metrics  (walking_speed, walking_heart_rate_avg, walking_step_length)
//                → AVERAGED across the day's ACTIVE hours only (see next note).
//
// ⚠️ WHY THE AVG PATH SKIPS ZERO HOURS (V2 P0c — do NOT "fix" this back to a plain
// mean): activity_hourly stores a row for EVERY hour, but a mobility metric only has
// a real value in the hours you were actually walking. For these metrics a 0-value
// hour means "the activity didn't happen", NOT "the rate was 0" — so it is NOT a
// sample of the rate and must be excluded from the daily average. Including it buries
// one real reading under 23 idle zeros (walking HR read 4.7 instead of 113.5 on real
// data). A day with NO active hour has no value (a gap), never a fabricated 0.
// SAFETY CAVEAT: this is only correct where 0 genuinely means "didn't happen". It is
// applied to AVG metrics only; SUM metrics keep every hour (a 0 adds nothing anyway).
//
// The partial CURRENT day is reported as "so far" but EXCLUDED from trend/rolling
// comparisons — only completed days count in the maths. So every window ends on
// YESTERDAY, and today is reported separately.

import { amsTodayYMD, shiftYMD } from "./gymDates.js";
import { statsForRange, presetRange, weekOverWeek, DEADBAND, PRESETS } from "./healthStats.js";

// Daily TOTAL display metrics (summed across the day's hours).
export const ACTIVITY_SUM_METRICS = [
  "steps",
  "active_energy",
  "resting_energy",
  "stand_minutes",
  "flights_climbed",
];
// Daily AVERAGE display metrics (mean of the day's ACTIVE hours — see header note).
export const ACTIVITY_AVG_METRICS = [
  "walking_speed",
  "walking_heart_rate_avg",
  "walking_step_length",
];
// The full activity display list (sum group then avg group).
export const ACTIVITY_METRICS = [...ACTIVITY_SUM_METRICS, ...ACTIVITY_AVG_METRICS];

const SUM_METRICS = new Set(ACTIVITY_SUM_METRICS);
export function aggMode(metric) {
  return SUM_METRICS.has(metric) ? "sum" : "avg"; // walking_* (and any new) → avg
}

// Collapse hourly rows to one value per day. Returns { ymd, value, at, hours }
// oldest-first, where `hours` is the count of hours that fed `value`:
//   sum → total of EVERY hour (a 0 hour adds nothing); hours = all hours present.
//   avg → mean of the ACTIVE (value > 0) hours only (see header note); hours =
//         the active-hour count. A day with no active hour has value = null (a gap).
export function aggregateDaily(rows, mode) {
  const byDay = new Map();
  for (const r of rows || []) {
    if (!r?.day || !Number.isFinite(r.value)) continue;
    let d = byDay.get(r.day);
    if (!d) {
      d = { ymd: r.day, sumAll: 0, hoursAll: 0, sumActive: 0, hoursActive: 0 };
      byDay.set(r.day, d);
    }
    d.sumAll += r.value;
    d.hoursAll += 1;
    if (r.value > 0) {
      d.sumActive += r.value;
      d.hoursActive += 1;
    }
  }
  return [...byDay.values()]
    .map((d) => {
      const value = mode === "avg"
        ? (d.hoursActive > 0 ? d.sumActive / d.hoursActive : null) // gap, not a fake 0
        : d.sumAll;
      const hours = mode === "avg" ? d.hoursActive : d.hoursAll;
      return { ymd: d.ymd, value, at: d.ymd, hours };
    })
    .sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : 0));
}

// 7/30/90 averages over COMPLETED days (window ends yesterday), with the daily
// values used. "Average" here = the average of the daily totals.
function rolling(daily, end) {
  const out = {};
  for (const days of PRESETS) {
    const { start } = presetRange(days, end);
    const values = daily.filter((p) => p.ymd >= start && p.ymd <= end);
    out[days] = { avg: statsForRange(daily, start, end).avg, values };
  }
  return out;
}

// The full view-model for ONE activity metric.
export function metricView(metric, rows, now = Date.now()) {
  const today = amsTodayYMD(now);
  const end = shiftYMD(today, -1); // yesterday — last COMPLETED day
  const mode = aggMode(metric);
  const all = aggregateDaily(rows, mode);

  const todayRow = all.find((p) => p.ymd === today) || null;
  const completed = all.filter((p) => p.ymd <= end); // partial today excluded
  const latestCompleted = completed.length ? completed[completed.length - 1] : null;
  const trend = weekOverWeek(completed, { end, deadband: DEADBAND[metric] });

  return {
    metric,
    mode,
    unit: rows?.find?.((r) => r.unit)?.unit ?? null,
    today,
    completedThrough: end,
    todaySoFar: todayRow ? { value: todayRow.value, hours: todayRow.hours } : null,
    latestCompleted, // {ymd, value} — the "raw" latest number beside the arrow
    rolling: rolling(completed, end),
    trend,
  };
}

// activityDaysHit — X of N days in the window that hit a daily target (the "move-goal"
// days-hit tally, mirroring nightsHitGoal — a simple count, NO streak). For a SUM metric
// (active_energy): a day hits when its daily total ≥ target ('up') or ≤ target ('down').
// The window ENDS ON `end` (yesterday for activity, so the partial current day never
// counts) and spans `days`. → { hit, total, withData } or null with no usable target.
export function activityDaysHit(rows, { target, direction = "up", end, days = 7 }) {
  if (!Number.isFinite(target)) return null;
  const start = shiftYMD(end, -(days - 1));
  const daily = aggregateDaily(rows, "sum"); // energy is a daily SUM
  let hit = 0, withData = 0;
  for (const d of daily) {
    if (d.ymd < start || d.ymd > end || !Number.isFinite(d.value)) continue;
    withData += 1;
    if (direction === "down" ? d.value <= target : d.value >= target) hit += 1;
  }
  return { hit, total: days, withData };
}
