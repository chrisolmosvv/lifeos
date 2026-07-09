// LifeOS — Food → calc layer: RANGE getters (week/month) (PURE, compute-on-read).
//
// Separated from foodCalc.js (the day-level getters) to keep both files under the
// 250-line ceiling. Dependency: range → day (imports NUTRIENTS + vsGoal).

import { presetRange, statsForRange } from "./healthStats.js";
import { NUTRIENTS, vsGoal } from "./foodCalc.js";

// ── rangeTotals (REUSES presetRange + statsForRange) ─────────────────────────
// Week/Month: the AVERAGE daily total per nutrient over the window ending on `end`, averaged
// over LOGGED days only (statsForRange skips gap days — a day with no entries is NOT a 0).
// `daily` = dailyTotals() output. nDays = how many logged days fell in the window.
// → { days, start, end, perNutrient: { kcal:{avg,nDays}, … } }
export function rangeTotals(daily, days, { end } = {}) {
  const { start } = presetRange(days, end);
  const perNutrient = {};
  for (const k of NUTRIENTS) {
    const points = (daily || []).map((d) => ({ ymd: d.ymd, value: d[k] }));
    const s = statsForRange(points, start, end);
    perNutrient[k] = { avg: s.avg, nDays: s.count };
  }
  return { days, start, end, perNutrient };
}

// ── perGoalHits (Nutrition Slice 2) ─────────────────────────────────────────────
// Per-goal on-target counts over LOGGED DAYS ONLY (the honest denominator). For each goaled
// nutrient, counts how many logged days hit that goal (vsGoal status === "on", the ±10% band).
// Unlogged days are NOT counted as misses — the count is X of N logged days, always.
// → { loggedDays, goals: { calories: { hit, of }, protein: { hit, of }, ... } }
const GOAL_KEYS = [["calories", "kcal"], ["protein", "protein"], ["carbs", "carbs"], ["fat", "fat"]];
export function perGoalHits(daily, goalMap, { start, end } = {}) {
  const rows = (daily || []).filter((d) => d?.ymd && d.ymd >= start && d.ymd <= end);
  const loggedDays = rows.length;
  const goals = {};
  for (const [type, key] of GOAL_KEYS) {
    const target = goalMap?.get?.(type)?.target_value;
    if (target == null) continue;
    let hit = 0;
    for (const day of rows) {
      const s = vsGoal(day[key], target);
      if (s && s.status === "on") hit++;
    }
    goals[type] = { hit, of: loggedDays };
  }
  return { loggedDays, goals };
}

// ── rangeAdherence (V2 P0) ─────────────────────────────────────────────────────
// How many days in a window were "on target", over a CALENDAR-day denominator (an UNTRACKED day
// counts against you — stricter, LOCKED). The on-target rule (LOCKED): a day counts iff its
// CALORIES are goaled AND 'on' (within the ±10% inclusive band — read from the EXISTING vsGoal,
// the band is NOT re-implemented here), AND every OTHER macro THAT HAS A GOAL SET is also 'on'.
// A macro with NO goal is SKIPPED, never a failure — so a calories-only day CAN be on target.
//
// TWO DENOMINATOR GUARDS (or a fresh week reads wrong):
//   1) NO FUTURE DAYS — count only up to `today` (Amsterdam) or `end`, whichever is EARLIER. A
//      day that hasn't happened isn't a failure (a current partial week counts only to today).
//   2) NO PRE-DATA DAYS — the count starts no earlier than the FIRST logged day (daily is sorted
//      oldest-first, so daily[0].ymd), so calendar days before any data don't count against you.
// Within the bounded [lo, hi] span: a day WITH a log is judged by the rule; a day with NO log is
// counted in `total` but not in `onTarget` (that's the "untracked counts against you" intent).
//   • `daily`   = dailyTotals() output (one summed row per logged day: { ymd, kcal, protein, … }).
//   • `goalMap` = the resolved goals Map (get(type)?.target_value); goal_type 'calories' ↔ kcal.
//   • window    = { start, end, today } — Amsterdam-day strings, inclusive; `today` passed IN (no
//                 Date.now here). Omitting `today` disables the future cap (hi = end).
// → { onTarget, total }. "X of N" presentation is the caller's, at P4.
const ADHERENCE_MACROS = [["protein", "protein"], ["carbs", "carbs"], ["fat", "fat"]];
const MS_PER_DAY = 86400000;
export function rangeAdherence(daily, goalMap, { start, end, today } = {}) {
  const rows = (daily || []).filter((d) => d?.ymd);
  if (!rows.length || start == null || end == null) return { onTarget: 0, total: 0 };
  const firstLogged = rows.reduce((m, d) => (m == null || d.ymd < m ? d.ymd : m), null);
  const lo = firstLogged > start ? firstLogged : start;        // guard 2: no pre-data days
  const hi = today != null && today < end ? today : end;       // guard 1: no future days
  if (hi < lo) return { onTarget: 0, total: 0 };
  const total = Math.round((Date.parse(hi) - Date.parse(lo)) / MS_PER_DAY) + 1; // calendar days, inclusive
  let onTarget = 0;
  for (const day of rows) {
    if (day.ymd < lo || day.ymd > hi) continue; // logged days outside the bounded span don't count
    const cal = vsGoal(day.kcal, goalMap?.get?.("calories")?.target_value);
    if (!cal || cal.status !== "on") continue; // calories must be goaled AND 'on'
    let ok = true;
    for (const [type, key] of ADHERENCE_MACROS) {
      const s = vsGoal(day[key], goalMap?.get?.(type)?.target_value);
      if (s && s.status !== "on") { ok = false; break; } // a goaled macro off → day fails
    }
    if (ok) onTarget += 1;
  }
  return { onTarget, total };
}
