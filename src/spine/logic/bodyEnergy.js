// LifeOS — Body V3 (Piece 5): the Energy section's one non-trivial pure getter.
// Compute-on-read. Everything else the section needs (today's active via todaySoFar,
// the period averages via rolling[7|30|90].avg) already exists on the activity view —
// this file only adds the per-day STACK the bars need.

import { shiftYMD } from "./gymDates.js";
import { aggregateDaily } from "./healthActivity.js";

// The Energy window per page range: the number of trailing days the bars show and the
// window the ring/split average over. "Latest" defaults to a trailing FORTNIGHT (Piece 8
// owner ruling — 14 days of context; was 7).
export const ENERGY_WINDOW = { latest: 14, week: 7, month: 30, "90": 90 };

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
