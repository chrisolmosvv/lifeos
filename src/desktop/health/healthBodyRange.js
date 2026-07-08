// LifeOS — Health → Body (S7-prep): the range/band/composition getters the Body
// page needs and S5 does NOT already expose (PURE, no DB, no React, "today" passed
// in as an Amsterdam-day `end`). S5's healthBody.metricView already gives latest
// reading, daily-average series, 7/30/90 rolling averages, week-over-week trend and
// vs-goal — those are reused as-is. This file adds ONLY the genuinely-new pieces:
//
//   windowDelta   — generalises week-over-week to ANY window (month 30v30, 90v90).
//   baselineBand  — a metric's personal "normal range" (p10–p90 over ~90 days).
//   composition   — fat mass kg + the fat-vs-lean split for the composition bar.
//   goalProgress  — a 0–1 bar anchored at the first-ever reading.
//
// Everything rolls over the DAILY-AVERAGE series (three weigh-ins in one day count
// once) — the locked Body rule — via the shared collapseDaily primitive.

import { shiftYMD } from "../gym/gymDates.js";
import { statsForRange, collapseDaily } from "./healthStats.js";

// ── TUNABLE CONSTANTS (the one place to retune the personal band) ─────────────
export const BAND_WINDOW_DAYS = 90; //   the "typical range" looks back this far
export const BAND_MIN_READINGS = 14; //  fewer daily readings than this → band hides
export const BAND_LO_PCT = 10; //        lower edge of the band (10th percentile)
export const BAND_HI_PCT = 90; //        upper edge of the band (90th percentile)

// Raw body_metrics rows → the normalised point shape the engine uses. Mirrors
// healthBody.bodyPoints (kept local so this file stays self-contained).
function dailySeries(rows) {
  const points = (rows || [])
    .filter((r) => r?.metric_date)
    .map((r) => ({ ymd: r.metric_date, value: r.value, at: r.reading_at || r.metric_date }));
  return collapseDaily(points); // one-per-day average, oldest-first
}

// Linear-interpolated percentile of a numeric array (p in 0..100). Sorts a copy;
// returns null for an empty array. p50 = median, etc.
function percentile(values, p) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  if (xs.length === 1) return xs[0];
  const rank = (p / 100) * (xs.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return xs[lo];
  return xs[lo] + (xs[hi] - xs[lo]) * (rank - lo);
}

// ── fixedBand (V2 P0c) ───────────────────────────────────────────────────────
// The counterpart to the PERSONAL baselineBand: a FIXED, constant healthy range for
// metrics with a known clinical normal (bmi 18.5–25, blood_oxygen 95–100). Unlike
// baselineBand it needs NO history (no 14-reading floor) — the band is given, so it
// shows from the first reading. Returns the band + where `value` (the latest daily-
// average) sits within it. Unknown metric → null (the caller omits the band).
//   verdict: 'below' (under lo) | 'in' (lo..hi) | 'above' (over hi) | null (no value)
// → { lo, hi, value, verdict, hasBand: true }
export const FIXED_BANDS = {
  bmi: { lo: 18.5, hi: 25 },
  blood_oxygen: { lo: 95, hi: 100 },
};
export function fixedBand(metric, value) {
  const b = FIXED_BANDS[metric];
  if (!b) return null;
  const v = Number.isFinite(value) ? value : null;
  const verdict = v == null ? null : v < b.lo ? "below" : v > b.hi ? "above" : "in";
  return { lo: b.lo, hi: b.hi, value: v, verdict, hasBand: true };
}

// ── windowDelta ──────────────────────────────────────────────────────────────
// This range's average vs the SAME-length window immediately before it, ending on
// `end`. days=7 reproduces S5's week-over-week; days=30/90 are the month/90 views.
//   curr  = [end-(days-1) .. end]
//   prior = [end-(2·days-1) .. end-days]
// GUARD: if EITHER window has no data — including the very common "no prior 90-day
// window exists yet" — dir & diff are null so the page renders a clean "—", never a
// fabricated zero. `deadband` is a DEADBAND entry ({ abs } or { rel }); the same
// per-week band is reused as the "flat" floor for longer windows (tune later).
// → { dir: 'up'|'down'|'flat'|null, diff, band, currAvg, priorAvg }
export function windowDelta(rows, days, { end, deadband } = {}) {
  const series = dailySeries(rows);
  const curr = statsForRange(series, shiftYMD(end, -(days - 1)), end);
  const prior = statsForRange(series, shiftYMD(end, -(2 * days - 1)), shiftYMD(end, -days));
  if (curr.avg == null || prior.avg == null) {
    return { dir: null, diff: null, band: null, currAvg: curr.avg, priorAvg: prior.avg };
  }
  const diff = curr.avg - prior.avg;
  const band =
    deadband?.rel != null ? Math.abs(prior.avg) * deadband.rel : deadband?.abs ?? 0;
  const dir = diff > band ? "up" : diff < -band ? "down" : "flat";
  return { dir, diff, band, currAvg: curr.avg, priorAvg: prior.avg };
}

// ── baselineBand ─────────────────────────────────────────────────────────────
// A metric's personal "normal range": the p10–p90 spread of its daily-average
// values over the last BAND_WINDOW_DAYS, ending on `end`. Percentile (not mean±SD)
// so one freak reading — a post-coffee resting-HR spike — can't blow the band out.
// `hasEnoughData` is false until BAND_MIN_READINGS daily readings exist (a "typical
// range" from 2 points is meaningless); the vitals tiles hide the band until then.
// → { lo, hi, mid, n, hasEnoughData }
export function baselineBand(rows, { end } = {}) {
  const series = dailySeries(rows);
  const start = shiftYMD(end, -(BAND_WINDOW_DAYS - 1));
  const values = series.filter((p) => p.ymd >= start && p.ymd <= end).map((p) => p.value);
  const n = values.length;
  return {
    lo: percentile(values, BAND_LO_PCT),
    hi: percentile(values, BAND_HI_PCT),
    mid: percentile(values, 50),
    n,
    hasEnoughData: n >= BAND_MIN_READINGS,
  };
}

// ── composition ──────────────────────────────────────────────────────────────
// The fat-vs-lean split for the composition bar, from the LATEST readings.
//   fatMassKg = weight × fat% / 100   (a cross-metric derived NUMBER → lives here,
//                                       never inlined in the component)
//   remainderKg = weight − (fat + lean): bone/water the scale doesn't split out.
// GUARD: fat + lean will NOT exactly equal scale weight. If the remainder comes out
// NEGATIVE (readings overlap), `remainderValid` is false and `mode` is 'ratio' — the
// bar then shows fat:lean as a proportion instead of drawing a negative segment.
// Any missing input → that field is null; the component degrades gracefully.
// → { weightKg, fatPct, fatMassKg, leanKg, knownKg, remainderKg, remainderValid, mode }
export function composition(latestWeightKg, latestFatPct, latestLeanKg) {
  const w = Number.isFinite(latestWeightKg) ? latestWeightKg : null;
  const fp = Number.isFinite(latestFatPct) ? latestFatPct : null;
  const lean = Number.isFinite(latestLeanKg) ? latestLeanKg : null;
  const fatMassKg = w != null && fp != null ? (w * fp) / 100 : null;
  const knownKg = fatMassKg != null && lean != null ? fatMassKg + lean : null;
  const remainderKg = w != null && knownKg != null ? w - knownKg : null;
  const remainderValid = remainderKg != null && remainderKg >= 0;
  const haveSplit = fatMassKg != null && lean != null;
  return {
    weightKg: w,
    fatPct: fp,
    fatMassKg,
    leanKg: lean,
    knownKg,
    remainderKg,
    remainderValid,
    // 'remainder' = draw fat / lean / unlabelled remainder; 'ratio' = fat:lean only.
    mode: haveSplit ? (remainderValid && w != null ? "remainder" : "ratio") : "none",
  };
}

// ── goalProgress ─────────────────────────────────────────────────────────────
// A 0–1 progress bar toward a goal, anchored at the FIRST-EVER reading ("how far
// you've come"). start = earliest daily-average, current = latest daily-average.
// Direction-aware: 'down' (weight) progresses as the number falls; 'up' as it rises.
//   fraction = (distance moved the right way) / (start → target distance), CLAMPED
//   to [0,1] — so it handles BOTH ends honestly:
//     • not started / moved the WRONG way → fraction 0 (empty bar, no fake progress)
//     • met or OVERSHOT past the target   → fraction 1, and `met` flips true.
//   met is computed straight from the direction comparison (independent of the
//   clamp), so an overshoot reads as met even though the bar simply caps at full.
//   If the start was ALREADY at/past target (denominator ≤ 0), fraction is 1 when
//   currently met, else 0 — never a divide-by-zero.
// No goal, no usable direction, or no readings → null (the page omits the bar).
// → { start, startYmd, current, currentYmd, target, direction, fraction, met, remaining }
export function goalProgress(rows, goal, { end } = {}) {
  const series = dailySeries(rows);
  if (!goal || goal.target_value == null || !goal.direction || series.length === 0) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const start = first.value;
  const current = last.value;
  const target = goal.target_value;
  const dir = goal.direction;
  if (dir !== "down" && dir !== "up") return null; // by_time etc. → no progress bar

  const met = dir === "down" ? current <= target : current >= target;
  const moved = dir === "down" ? start - current : current - start; // + = right way
  const total = dir === "down" ? start - target : target - start; //   start→target
  let fraction;
  if (total <= 0) {
    fraction = met ? 1 : 0; // started already at/past target — no real distance to cover
  } else {
    fraction = Math.max(0, Math.min(1, moved / total));
  }
  return {
    start,
    startYmd: first.ymd,
    current,
    currentYmd: last.ymd,
    target,
    direction: dir,
    fraction,
    met,
    remaining: current - target, // signed gap still to close, in the metric's units
  };
}
