// LifeOS — Body composition chart (Var 2): the PURE calc behind the trend chart.
// Compute-on-read — the smoothed series is DERIVED here every render, never stored.
//
// smoothedSeries — for each day that has a weigh-in: that day's value (`raw`), the
//   trailing N-CALENDAR-day smoothed mean (`smoothed`), and a soft spread band
//   (`lo`/`hi` = mean ± the window's standard deviation). Smoothing runs over the
//   FULL daily series so a day sitting at the display window's LEFT edge still uses
//   its real prior days; only then do we slice to [start, end] for display. A day
//   with no weigh-in is simply absent — a gap is never faked.
//
// The series is the DAILY-AVERAGE one (three weigh-ins in one day count once) — the
// locked Body rule, via the shared collapseDaily primitive.

import { shiftYMD } from "./gymDates.js";
import { collapseDaily } from "./healthStats.js";

// Raw body_metrics rows → { ymd, value, at } daily-average series, oldest-first.
function dailySeries(rows) {
  const pts = (rows || [])
    .filter((r) => r?.metric_date)
    .map((r) => ({ ymd: r.metric_date, value: r.value, at: r.reading_at || r.metric_date }));
  return collapseDaily(pts);
}

// The per-day smoothed series. `withBand` adds the ±1-SD spread edges (weight wants
// the band; body fat is a shape-only line, so it passes withBand:false). start/end
// (Amsterdam ymds) clip the OUTPUT only — the maths always sees the full history.
export function smoothedSeries(rows, { start = null, end = null, smooth = 7, withBand = true } = {}) {
  const daily = dailySeries(rows);
  const out = daily.map((p) => {
    const winStart = shiftYMD(p.ymd, -(smooth - 1)); // the trailing N calendar days
    const win = daily.filter((q) => q.ymd >= winStart && q.ymd <= p.ymd).map((q) => q.value);
    const n = win.length || 1;
    const mean = win.reduce((a, b) => a + b, 0) / n;
    let lo = null;
    let hi = null;
    if (withBand) {
      const variance = win.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
      const sd = Math.sqrt(variance);
      lo = mean - sd;
      hi = mean + sd;
    }
    return { ymd: p.ymd, raw: p.value, smoothed: mean, lo, hi, at: p.at, n: win.length };
  });
  return out.filter((p) => (!start || p.ymd >= start) && (!end || p.ymd <= end));
}

// The value of a smoothed series ON a given day (raw if that day has a weigh-in, else
// null). Used by the scrub to read body fat on a day the crosshair snapped to via weight.
export function valueOn(series, ymd) {
  const hit = (series || []).find((p) => p.ymd === ymd);
  return hit ? { raw: hit.raw, smoothed: hit.smoothed } : null;
}

// ── GOAL ZONE ────────────────────────────────────────────────────────────────
// The shaded goal zone comes from the SINGLE stored weight target ± a tolerance (kg).
// The Body goal is one target_value (there is no stored range — confirmed against the
// health_goals shape), so the zone is target ± tol: a visual "close enough" band, NOT
// a second configured goal.
//
// ⚠️ GOAL_ZONE_TOLERANCE_KG is a BUILD DEFAULT invented here (±1.0 kg) — flagged for
// the owner to confirm, not a settled number. Change it in this ONE place.
export const GOAL_ZONE_TOLERANCE_KG = 1.0;
export function goalZone(goal, tol = GOAL_ZONE_TOLERANCE_KG) {
  const t = goal?.target_value;
  if (!Number.isFinite(t)) return null; // no weight goal set → no zone (never faked)
  return { target: t, lo: t - tol, hi: t + tol, tol };
}
