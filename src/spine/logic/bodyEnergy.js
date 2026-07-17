// LifeOS — Body V3 (Piece 5): the Energy section's one non-trivial pure getter.
// Compute-on-read. Everything else the section needs (today's active via todaySoFar,
// the period averages via rolling[7|30|90].avg) already exists on the activity view —
// this file only adds the per-day STACK the bars need.

import { shiftYMD } from "./gymDates.js";
import { aggregateDaily } from "./healthActivity.js";

// Average daily total over the last `days` COMPLETED days ending on `end` (pass yesterday
// so today's partial day never drags the average down). Works for ANY window length —
// activity's rolling getter only has 7/30/90 presets, and the 14-day default needs this.
// → the mean kcal/day, or null when the window holds no data.
export function avgPerDay(rows, end, days) {
  const daily = aggregateDaily(rows, "sum");
  const start = shiftYMD(end, -(days - 1));
  const vals = daily
    .filter((d) => d.ymd >= start && d.ymd <= end && Number.isFinite(d.value))
    .map((d) => d.value);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

// Per-day stacked burn for the trailing `days` ending on `end` (TODAY INCLUDED — its bar
// is the partial day-so-far, so it reads a little short; the section marks it terracotta).
// Active + resting are aligned by day; a day with no row reads 0 (an empty bar, not a gap).
// → [{ ymd, resting, active, total, isToday }] oldest-first.
export function stackedDaily(activeRows, restingRows, end, days) {
  const active = new Map(aggregateDaily(activeRows, "sum").map((d) => [d.ymd, d.value]));
  const resting = new Map(aggregateDaily(restingRows, "sum").map((d) => [d.ymd, d.value]));
  const val = (m, ymd) => (Number.isFinite(m.get(ymd)) ? m.get(ymd) : 0);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const ymd = shiftYMD(end, -i);
    const a = val(active, ymd);
    const r = val(resting, ymd);
    out.push({ ymd, active: a, resting: r, total: a + r, isToday: ymd === end });
  }
  return out;
}

// Per-WEEK stacked burn (Piece 9): one bar per 7-day bucket ending at `end`, each summing
// that week's active + resting totals. For the long history windows (6-month / 1-year),
// where 180–365 daily slivers are illegible — the same problem Sleep's 90-day view solved
// by collapsing to weekly. → [{ ymd:weekStart, resting, active, total, isToday }] oldest-first.
export function stackedByWeek(activeRows, restingRows, end, days) {
  const active = new Map(aggregateDaily(activeRows, "sum").map((d) => [d.ymd, d.value]));
  const resting = new Map(aggregateDaily(restingRows, "sum").map((d) => [d.ymd, d.value]));
  const val = (m, ymd) => (Number.isFinite(m.get(ymd)) ? m.get(ymd) : 0);
  const weeks = Math.ceil(days / 7);
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const wEnd = shiftYMD(end, -7 * w);
    const wStart = shiftYMD(wEnd, -6);
    let a = 0;
    let r = 0;
    let hasToday = false;
    for (let i = 0; i < 7; i++) {
      const ymd = shiftYMD(wStart, i);
      a += val(active, ymd);
      r += val(resting, ymd);
      if (ymd === end) hasToday = true;
    }
    out.push({ ymd: wStart, active: a, resting: r, total: a + r, isToday: hasToday });
  }
  return out;
}

// The bars for a viewed window: daily up to COLLAPSE_ABOVE_DAYS, weekly beyond it. → { bars, weekly }.
// ⚠️ COLLAPSE_ABOVE_DAYS = 90 is a chosen threshold (flagged): Today (14) + 3-month (90) stay DAILY;
// 6-month (180 → ~26 weeks) + 1-year (365 → ~53 weeks) collapse to weekly. (Sleep collapses AT 90
// nights to ~13 weekly columns; Body keeps 90 daily because the prompt scoped collapse to 6mo/1yr and
// 90 bars still read across the full-width row — a different call for a different data shape.)
export const COLLAPSE_ABOVE_DAYS = 90;
export function stackedSeries(activeRows, restingRows, end, days) {
  if (days > COLLAPSE_ABOVE_DAYS) {
    return { bars: stackedByWeek(activeRows, restingRows, end, days), weekly: true };
  }
  return { bars: stackedDaily(activeRows, restingRows, end, days), weekly: false };
}
