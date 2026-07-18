// LifeOS — Health → Gym V2 (Piece 2): the Consistency grid calc (PURE).
//
// Turns the workout history into a WEEKDAY-BY-WEEK grid: `weeks` CALENDAR weeks (Monday-
// started, Amsterdam), each with a 7-cell Mon→Sun row saying whether a session happened on
// that weekday and whether it set a PR. Oldest week first; the last entry is the CURRENT
// (partial) week. Reuses recentSessions for the day + PR flag (no second PR path) and
// gymDates for all calendar-day reasoning. Display layers only READ this.
//
// STREAK — there is NO stored weekly session goal anywhere in the app (Ground-confirmed:
// health_goals has no gym/sessions goal_type). So "streak" is defined SELF-REFERENTIALLY,
// with no invented target: consecutive weeks (counting back from the current week) whose
// session count ≥ the person's own `weeks`-window AVERAGE (rounded, floor 1). The current
// PARTIAL week can only EXTEND the streak (if it has already met the bar) — it never BREAKS
// it, because an unfinished week can't be judged a miss yet. FLAGGED for the owner: this
// definition is a proposal, not a precedent — tune the threshold rule freely.

import { amsTodayYMD, shiftYMD } from "./gymDates.js";
import { recentSessions } from "./gymSessions.js";

const DAY_MS = 86400000;
const noonMs = (ymd) => new Date(`${ymd}T12:00:00Z`).getTime();
// Weekday of an Amsterdam calendar date as Mon=0 … Sun=6 (noon-UTC never crosses midnight).
function weekdayMon(ymd) {
  return (new Date(`${ymd}T12:00:00Z`).getUTCDay() + 6) % 7;
}
const emptyCells = () => Array.from({ length: 7 }, () => ({ trained: false, isPR: false }));

// Consecutive weeks (from the current week back) with count ≥ threshold. A current partial
// week under the bar is SKIPPED (not a break) so an unfinished week never severs the streak.
function computeStreak(counts, threshold) {
  let i = counts.length - 1;
  if (i >= 0 && counts[i] < threshold) i -= 1; // current week not there YET → don't break on it
  let streak = 0;
  for (; i >= 0; i--) {
    if (counts[i] >= threshold) streak += 1;
    else break;
  }
  return streak;
}

// consistencyGrid(workouts, { weeks, now }) →
//   { weeks:[{ mondayYMD, count, cells:[{trained,isPR}×7] }…oldest→current],
//     thisWeek, average, threshold, streak }
export function consistencyGrid(workouts, { weeks = 13, now = Date.now() } = {}) {
  const today = amsTodayYMD(now);
  const curMonday = shiftYMD(today, -weekdayMon(today)); // Monday of the current week
  const grid = [];
  for (let c = 0; c < weeks; c++) {
    grid.push({ mondayYMD: shiftYMD(curMonday, -7 * (weeks - 1 - c)), count: 0, cells: emptyCells() });
  }
  const firstMonday = grid[0].mondayYMD;
  const firstMs = noonMs(firstMonday);

  for (const s of recentSessions(workouts)) {
    const ymd = s.dateYMD;
    if (!ymd || ymd < firstMonday) continue;
    const idx = Math.floor((noonMs(ymd) - firstMs) / DAY_MS / 7);
    if (idx < 0 || idx >= weeks) continue; // future-dated guard
    const cell = grid[idx].cells[weekdayMon(ymd)];
    cell.trained = true;
    if (s.isPR) cell.isPR = true;
    grid[idx].count += 1;
  }

  const counts = grid.map((w) => w.count);
  const average = weeks ? counts.reduce((a, b) => a + b, 0) / weeks : 0;
  const threshold = Math.max(1, Math.round(average));
  return {
    weeks: grid,
    thisWeek: counts[weeks - 1] || 0,
    average,
    threshold,
    streak: computeStreak(counts, threshold),
  };
}
