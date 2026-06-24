// LifeOS — Health → Gym: the consistency-heatmap data (PURE — calc layer).
//
// Builds a grid of the last `weeks` weeks as ROLLING 7-Amsterdam-day columns
// ending today (the newest column's last cell IS today), so the most-recent
// column is exactly the box score's last-7-days window — the heatmap, band, trend
// and streak all share the ONE gymDates definition and agree by construction.
// The chart only DISPLAYS this; it never recomputes a date.

import { amsYMD, amsTodayYMD, shiftYMD, humanDayShort } from "./gymDates.js";

// weeks × 7-day columns (oldest column first; within a column, oldest day on top,
// today at the bottom of the last column). Each day cell carries whether it was
// trained and a calm intensity tier (0 rest, 1–3 by sets that day).
export function heatmap(workouts, { weeks = 12, now = Date.now() } = {}) {
  const today = amsTodayYMD(now);
  const firstYMD = shiftYMD(today, -(7 * weeks - 1)); // oldest day shown

  const trained = new Set();
  const setsByDay = {};
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (!ymd) continue;
    trained.add(ymd);
    let s = 0;
    for (const ex of w.exercises || []) s += (ex.sets || []).length;
    setsByDay[ymd] = (setsByDay[ymd] || 0) + s;
  }

  const columns = [];
  for (let c = 0; c < weeks; c++) {
    const lastDay = shiftYMD(today, -7 * (weeks - 1 - c)); // this column's most-recent day
    const cells = [];
    for (let r = 0; r < 7; r++) {
      const ymd = shiftYMD(lastDay, -(6 - r)); // row 0 = oldest, row 6 = lastDay
      const isTrained = trained.has(ymd);
      const sets = setsByDay[ymd] || 0;
      const tier = !isTrained ? 0 : sets < 12 ? 1 : sets < 24 ? 2 : 3;
      cells.push({ ymd, trained: isTrained, sets, tier });
    }
    columns.push({ startYMD: shiftYMD(lastDay, -6), cells });
  }

  // Sessions per week = workouts whose Amsterdam day is in the window / weeks.
  let totalSessions = 0;
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (ymd && ymd >= firstYMD && ymd <= today) totalSessions++;
  }

  return {
    columns,
    weeks,
    totalSessions,
    avgPerWeek: weeks > 0 ? totalSessions / weeks : 0,
    rangeLabel: `${humanDayShort(firstYMD)} – ${humanDayShort(today)}`,
  };
}
