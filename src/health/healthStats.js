// LifeOS — Health → Sleep & Body (S5): the metrics ENGINE (PURE).
//
// PURE FUNCTIONS ONLY. No database, no fetch, no React, no hidden clock — "today"
// is always passed IN (Amsterdam day via gymDates) so every function is a
// unit-testable input→output map. This is the important boundary: healthLoad
// fetches, this computes.
//
// The whole layer composes from ONE primitive — statsForRange — so 7/30/90-day
// figures are just presets of an arbitrary [start, end] window, and a custom
// date-range picker (S6+) drops in for free.
//
// NORMALISED POINT shape every series uses: { ymd, value, at }.
//   ymd   = the Amsterdam calendar day "YYYY-MM-DD" the reading belongs to.
//   value = a finite number (a null/NaN value is a GAP — skipped, never faked).
//   at    = exact timestamp (ISO) for "latest"; falls back to ymd when absent.

import { amsTodayYMD, shiftYMD } from "../gym/gymDates.js";

// ── DEAD-BAND CONFIG (the ONE place to tune "flat") ──────────────────────────
// Week-over-week change inside this band reads as "flat" (no arrow direction).
// Starting values — we tune these against real data in the S5 VERIFY step.
// Each metric is EITHER absolute (`abs`, in the metric's own units per week) OR
// relative (`rel`, a fraction of the prior week's level).
export const DEADBAND = {
  weight: { abs: 0.2 }, //              kg per week
  body_fat: { abs: 0.2 }, //            % per week
  lean_mass: { abs: 0.2 }, //           kg per week
  resting_heart_rate: { abs: 1 }, //    bpm per week
  respiratory_rate: { abs: 0.3 }, //    breaths/min per week
  sleep_duration: { abs: 10 }, //       minutes per week
  steps: { rel: 0.05 }, //              5% — daily steps swing a lot, so relative
  active_energy: { rel: 0.05 }, //      5% — same reasoning as steps
  // V2 P0c — starting values, tunable once ~2 weeks of real data exist (like the above).
  resting_energy: { abs: 50 }, //       kcal/day — basal energy is stable day to day
  stand_minutes: { rel: 0.1 }, //       10% — stand minutes swing, so relative
  flights_climbed: { abs: 2 }, //       flights/day
  walking_speed: { abs: 0.1 }, //       m/s
  walking_heart_rate_avg: { abs: 2 }, // bpm (noisier than resting HR)
  walking_step_length: { abs: 1 }, //   cm
  bmi: { abs: 0.2 }, //                 BMI points/week (mirrors weight)
  blood_oxygen: { abs: 0.5 }, //        % SpO2
};

// The named rolling-window presets, all built on the arbitrary-range engine.
export const PRESETS = [7, 30, 90];

// A finite number, else null. Keeps gaps OUT of the maths (never carried forward).
function finite(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ── THE PRIMITIVE ────────────────────────────────────────────────────────────
// statsForRange(points, start, end) → { count, avg, min, max, latest, latestAt }.
// Filters to the inclusive Amsterdam-day window [start, end], SKIPS gaps (an
// average is the mean of whatever real readings exist — never fabricated), and
// returns nulls when the window holds no data. "latest" = the value with the
// greatest timestamp (ties/absent `at` fall back to the ymd order).
export function statsForRange(points, start, end) {
  const inWin = [];
  for (const p of points || []) {
    if (!p || p.ymd < start || p.ymd > end) continue;
    const v = finite(p.value);
    if (v == null) continue; // a gap — skip, never carry forward
    inWin.push({ value: v, at: p.at || p.ymd });
  }
  if (inWin.length === 0) {
    return { count: 0, avg: null, min: null, max: null, latest: null, latestAt: null };
  }
  let sum = 0,
    min = Infinity,
    max = -Infinity,
    latest = null,
    latestAt = null;
  for (const p of inWin) {
    sum += p.value;
    if (p.value < min) min = p.value;
    if (p.value > max) max = p.value;
    if (latestAt == null || p.at > latestAt) {
      latestAt = p.at;
      latest = p.value;
    }
  }
  return { count: inWin.length, avg: sum / inWin.length, min, max, latest, latestAt };
}

// The inclusive [start, end] window for an N-day preset ending on `end`
// (end + the N-1 prior days). Body passes end = today; activity passes
// end = yesterday so the partial current day is excluded from rolling figures.
export function presetRange(days, end) {
  return { start: shiftYMD(end, -(days - 1)), end };
}

// Average over an N-day preset window ending on `end`. null if no data. The
// 7/30/90 headline figures are just this with days = 7 / 30 / 90.
export function rollingAvg(points, days, end) {
  const { start } = presetRange(days, end);
  return statsForRange(points, start, end).avg;
}

// ── DAILY-AVERAGE COLLAPSE ───────────────────────────────────────────────────
// Body rolling averages roll over the DAILY-AVERAGE series, not raw readings: so
// three weigh-ins in one day count once. Collapse points to one-per-day where the
// day's value = mean of that day's readings, and `at` = that day's latest reading.
// Returns a series sorted oldest-first.
export function collapseDaily(points) {
  const byDay = new Map();
  for (const p of points || []) {
    const v = finite(p?.value);
    if (v == null || !p.ymd) continue;
    let d = byDay.get(p.ymd);
    if (!d) {
      d = { ymd: p.ymd, sum: 0, n: 0, at: null };
      byDay.set(p.ymd, d);
    }
    d.sum += v;
    d.n += 1;
    const at = p.at || p.ymd;
    if (d.at == null || at > d.at) d.at = at;
  }
  return [...byDay.values()]
    .map((d) => ({ ymd: d.ymd, value: d.sum / d.n, at: d.at }))
    .sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : 0));
}

// ── WEEK-OVER-WEEK ARROW ─────────────────────────────────────────────────────
// Trend = avg(last 7 days) vs avg(prior 7 days), ending on `end` (today for body;
// yesterday for activity, so the partial day never skews it). Returns the two
// averages plus a direction read through the per-metric dead-band:
//   diff >  band → 'up' ; diff < -band → 'down' ; else 'flat'.
// dir = null (render "—") when EITHER 7-day window has no data — we never guess.
// `deadband` is a DEADBAND entry: { abs } or { rel } (rel = fraction of priorAvg).
// NOTE: 'up'/'down' is the RAW direction of the number. Whether that's GOOD is
// goal-aware and lives in healthGoals (down can be the win, e.g. weight).
export function weekOverWeek(series, { end, deadband }) {
  const curr = statsForRange(series, shiftYMD(end, -6), end);
  const prior = statsForRange(series, shiftYMD(end, -13), shiftYMD(end, -7));
  if (curr.avg == null || prior.avg == null) {
    return { dir: null, diff: null, currAvg: curr.avg, priorAvg: prior.avg };
  }
  const diff = curr.avg - prior.avg;
  const band =
    deadband?.rel != null ? Math.abs(prior.avg) * deadband.rel : deadband?.abs ?? 0;
  const dir = diff > band ? "up" : diff < -band ? "down" : "flat";
  return { dir, diff, band, currAvg: curr.avg, priorAvg: prior.avg };
}

// Convenience: today's Amsterdam day and yesterday, for callers wiring windows.
export function today(now = Date.now()) {
  return amsTodayYMD(now);
}
export function yesterday(now = Date.now()) {
  return shiftYMD(amsTodayYMD(now), -1);
}
