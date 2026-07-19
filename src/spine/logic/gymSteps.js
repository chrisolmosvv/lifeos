// LifeOS — Health → Gym V2 (Piece 4): the steps chart calc (PURE).
//
// Builds the rows for the vertical, REVERSE-CHRONOLOGICAL steps chart (most recent at the
// TOP, stepping backward down the column). Daily totals normally; above a window threshold
// it COLLAPSES to weekly averages (rolling 7-day blocks from the window end). Reuses
// aggregateDaily (steps is a SUM metric) — no second aggregation path.
//
// A day/week with NO underlying data is a GAP (value null) — rendered as an honest empty
// row, NEVER a fabricated 0. A real 0-step day (rows present, summing to 0) is value 0, kept
// distinct from a gap. Steps history is shallow (~3 weeks as of 2026-07), so at long windows
// most rows are honestly empty — expected, not a bug.
//
// COLLAPSE THRESHOLD: 90 days — ALIGNED to the app's existing precedent (Body's Energy day-bars
// collapse at COLLAPSE_ABOVE_DAYS = 90, Sleep at 90 nights), so the 3-Month view stays DAILY
// everywhere and the three modules behave consistently (was a 60-day placeholder in Piece 4;
// reconciled 2026-07-19). With ~3 weeks of steps data it rarely triggers yet regardless.

import { shiftYMD, humanDayShort } from "./gymDates.js";
import { aggregateDaily } from "./healthActivity.js";

export const STEPS_COLLAPSE_ABOVE_DAYS = 90;

// stepsChart(rawHourlyRows, { start, end, windowDays }) →
//   { mode:'daily'|'weekly', rows:[{ key, label, value|null }]…most-recent-first, max }
export function stepsChart(rawRows, { start, end, windowDays, collapseAbove = STEPS_COLLAPSE_ABOVE_DAYS }) {
  if (!start || !end || end < start) return { mode: "daily", rows: [], max: 0 };
  const daily = aggregateDaily(rawRows, "sum"); // [{ymd, value}] — only days with data present
  const byDay = new Map(daily.map((d) => [d.ymd, d.value]));
  const weekly = windowDays > collapseAbove;
  const rows = [];

  if (!weekly) {
    for (let ymd = end; ymd >= start; ymd = shiftYMD(ymd, -1)) {
      rows.push({ key: ymd, label: humanDayShort(ymd), value: byDay.has(ymd) ? byDay.get(ymd) : null });
    }
  } else {
    // Rolling 7-day blocks from the window END backward; each = average of its days-WITH-data.
    let blockEnd = end;
    while (blockEnd >= start) {
      const blockStart = shiftYMD(blockEnd, -6);
      let sum = 0, n = 0;
      for (let d = blockEnd; d >= blockStart; d = shiftYMD(d, -1)) {
        if (byDay.has(d)) { sum += byDay.get(d); n += 1; }
      }
      rows.push({ key: blockStart, label: humanDayShort(blockStart), value: n > 0 ? Math.round(sum / n) : null });
      blockEnd = shiftYMD(blockStart, -1);
    }
  }

  const vals = rows.map((r) => r.value).filter((v) => v != null);
  return { mode: weekly ? "weekly" : "daily", rows, max: vals.length ? Math.max(...vals) : 0 };
}
