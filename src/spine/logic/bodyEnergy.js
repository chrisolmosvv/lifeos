// LifeOS — Body V3 (Piece 5): the Energy section's one non-trivial pure getter.
// Compute-on-read. Everything else the section needs (today's active via todaySoFar,
// the period averages via rolling[7|30|90].avg) already exists on the activity view —
// this file only adds the per-day STACK the bars need.

import { shiftYMD } from "./gymDates.js";
import { aggregateDaily } from "./healthActivity.js";

// The Energy window per page range: the number of trailing days the bars show and the
// rolling preset the ring/split average over. "Latest" defaults to a trailing WEEK
// (owner ruling — the same 7-day context Sleep's Last-night page always shows).
export const ENERGY_WINDOW = { latest: 7, week: 7, month: 30, "90": 90 };

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
