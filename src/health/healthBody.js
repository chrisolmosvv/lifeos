// LifeOS — Health → Body (S5): body-metric transforms (PURE, generic).
//
// Works for ANY body metric_type the scale writes. Takes raw body_metrics rows
// for ONE metric (multiple readings/day are normal) + that metric's resolved goal
// + "today", and returns the view-model. Rolling averages roll over the DAILY-
// AVERAGE series (three weigh-ins in one day count once) — the locked rule.
//
// BODY_METRICS is just the DISPLAY list (which metrics the Body page shows). The
// vs-goal logic is generic and goal-driven, so a new goal on any metric lights up
// automatically — the list never gates the maths.

import { amsTodayYMD } from "../gym/gymDates.js";
import {
  statsForRange,
  presetRange,
  collapseDaily,
  weekOverWeek,
  DEADBAND,
  PRESETS,
} from "./healthStats.js";
import { vsGoal, arrowVerdict } from "./healthGoals.js";

export const BODY_METRICS = [
  "weight",
  "body_fat",
  "lean_mass",
  "resting_heart_rate",
  "respiratory_rate",
];

// Raw reading points: { ymd: metric_date, value, at: reading_at }.
function bodyPoints(rows) {
  return (rows || [])
    .filter((r) => r?.metric_date)
    .map((r) => ({ ymd: r.metric_date, value: r.value, at: r.reading_at || r.metric_date }));
}

// The single most recent raw reading by reading_at. → { value, at, unit } | null.
function latestRaw(rows) {
  let best = null;
  for (const r of rows || []) {
    const at = r?.reading_at || r?.metric_date;
    if (at == null || !Number.isFinite(r.value)) continue;
    if (best == null || at > best.at) best = { value: r.value, at, unit: r.unit ?? null };
  }
  return best;
}

// Today's headline = today's daily AVERAGE (mean of today's readings). Includes
// the raw readings it averaged, for the debug readout. null if no reading today.
function todayHeadline(rows, today) {
  const readings = bodyPoints(rows)
    .filter((p) => p.ymd === today && Number.isFinite(p.value))
    .map((p) => ({ value: p.value, at: p.at }));
  if (readings.length === 0) return null;
  const avg = readings.reduce((a, b) => a + b.value, 0) / readings.length;
  return { ymd: today, value: avg, readings };
}

// 7/30/90 averages over the daily-average series, each with the daily values used.
function rolling(daily, today) {
  const out = {};
  for (const days of PRESETS) {
    const { start, end } = presetRange(days, today);
    const values = daily.filter((p) => p.ymd >= start && p.ymd <= end);
    out[days] = { avg: statsForRange(daily, start, end).avg, values };
  }
  return out;
}

// The full view-model for ONE body metric. goal = resolved goal for this metric
// (or null). The "current value" compared to a goal is the latest DAILY-AVERAGE
// value (today's if present, else the most recent day) — consistent with the
// daily-average headline rule.
export function metricView(metric, rows, goal, now = Date.now()) {
  const today = amsTodayYMD(now);
  const daily = collapseDaily(bodyPoints(rows)); // oldest-first daily-average series
  const last = daily.length ? daily[daily.length - 1] : null;
  const trend = weekOverWeek(daily, { end: today, deadband: DEADBAND[metric] });
  const goalRes = goal ? vsGoal(last?.value, goal) : null;
  return {
    metric,
    unit: latestRaw(rows)?.unit ?? goal?.unit ?? null,
    todayHeadline: todayHeadline(rows, today),
    latestRaw: latestRaw(rows),
    latestDaily: last, // {ymd, value} — the value used for vs-goal
    rolling: rolling(daily, today),
    trend,
    vsGoal: goalRes,
    arrowVerdict: arrowVerdict(trend.dir, goal?.direction),
  };
}
