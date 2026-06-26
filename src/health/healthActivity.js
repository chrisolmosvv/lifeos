// LifeOS — Health → Activity (S5): activity transforms (PURE).
//
// Takes raw activity_hourly rows for ONE metric + "today", and returns daily
// totals and rolling figures. Aggregation per the locked rule (#10):
//   steps / active_energy → SUMMED across the day's hours.
//   heart_rate           → AVERAGED across the hours (and it's the SECONDARY
//                          cardiac number; the headline is resting_heart_rate,
//                          which lives in body_metrics, handled by healthBody).
//
// The partial CURRENT day is reported as "so far" but EXCLUDED from trend/rolling
// comparisons — only completed days count in the maths. So every window ends on
// YESTERDAY, and today is reported separately.

import { amsTodayYMD, shiftYMD } from "../gym/gymDates.js";
import { statsForRange, presetRange, weekOverWeek, DEADBAND, PRESETS } from "./healthStats.js";

export const ACTIVITY_METRICS = ["steps", "active_energy"]; // summed display metrics

const SUM_METRICS = new Set(["steps", "active_energy"]);
export function aggMode(metric) {
  return SUM_METRICS.has(metric) ? "sum" : "avg"; // heart_rate (and others) → avg
}

// Collapse hourly rows to one value per day. sum → total of the day's hours;
// avg → mean of the day's hours. Returns { ymd, value, at, hours } oldest-first.
export function aggregateDaily(rows, mode) {
  const byDay = new Map();
  for (const r of rows || []) {
    if (!r?.day || !Number.isFinite(r.value)) continue;
    let d = byDay.get(r.day);
    if (!d) {
      d = { ymd: r.day, sum: 0, hours: 0 };
      byDay.set(r.day, d);
    }
    d.sum += r.value;
    d.hours += 1;
  }
  return [...byDay.values()]
    .map((d) => ({
      ymd: d.ymd,
      value: mode === "avg" ? d.sum / d.hours : d.sum,
      at: d.ymd,
      hours: d.hours,
    }))
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
