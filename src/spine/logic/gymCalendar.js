// LifeOS — Health → Gym V2 (Piece 10): calendar-month Consistency calc (PURE).
//
// Turns the workout history into real CALENDAR-MONTH grids (Sun→Sat columns), plus the routine-
// scoped hero numbers. The three-state day cell (Piece 10) needs to know WHICH routine trained
// each day — real data is 1:1 (108 workouts across 108 distinct days, verified: zero multi-
// session days), so a day → routine map is exact. ⚠️ If a future day ever had two workouts of
// DIFFERENT routines this map would keep the LAST one — a tie-break rule to decide THEN; not
// built now because no such day exists.

import { amsYMD, amsTodayYMD, shiftYMD, humanDayShort } from "./gymDates.js";
import { classifyRoutine, ROUTINES } from "./gymRoutine.js";

// Piece 17: the Today view's Consistency grid is a ROLLING window of this many days ending today
// (was a calendar-month-to-date view). This is Consistency's OWN window definition — separate from
// Health.jsx's shared paged `days` (which also happens to be 30) by design; Consistency never sees
// that value. Both heroInfo's today-count and the rangeGrid builder read this one constant.
export const TODAY_WINDOW_DAYS = 30;

// Weekday of an Amsterdam calendar date as Mon=0 … Sun=6 (noon-UTC never crosses midnight).
const weekdayMon = (ymd) => (new Date(`${ymd}T12:00:00Z`).getUTCDay() + 6) % 7;

// Amsterdam day (YYYY-MM-DD) → routine id, one per day (see caveat above).
export function sessionDayMap(workouts) {
  const m = new Map();
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (ymd) m.set(ymd, classifyRoutine(w.title));
  }
  return m;
}

const pad = (n) => String(n).padStart(2, "0");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// One calendar month, MONDAY-start weeks (matches the Piece-2 M/T/W/T/F/S/S convention).
// `month` is 0-11. → { label, year, month, weeks, count } where a cell is
// { state:'blank'|'none'|'on'|'other', day?, ymd?, isToday? }. `count` = the routine-scoped
// session count for the month (all-days if selectedRoutine==='all').
export function monthGrid(dayMap, { year, month, selectedRoutine, today }) {
  const sundayFirst = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0=Sun..6=Sat
  const firstWeekday = (sundayFirst + 6) % 7; // shift to Monday-first: Mon=0 … Sun=6
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ state: "blank" });
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${year}-${pad(month + 1)}-${pad(d)}`;
    const routine = dayMap.get(ymd);
    const matches = routine && (selectedRoutine === "all" || routine === selectedRoutine);
    if (matches) count += 1;
    const state = !routine ? "none" : matches ? "on" : "other";
    cells.push({ state, day: d, ymd, isToday: ymd === today });
  }
  while (cells.length % 7 !== 0) cells.push({ state: "blank" });
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { label: `${MONTHS[month]} ${year}`, year, month, weeks, count };
}

// Piece 17 — a ROLLING date-range grid for the Today view. Same shape monthGrid returns
// ({ label, weeks, count }, cells { state, day, ymd, isToday }), but spanning an arbitrary
// [start, end] window instead of a calendar month, so it crosses month boundaries cleanly.
// Leading/trailing days pad to Monday-first full weeks exactly like monthGrid — so GymMonth
// renders it with NO changes. `label` is the human range, e.g. "30 Jun – 29 Jul".
export function rangeGrid(dayMap, { start, end, selectedRoutine, today }) {
  const cells = [];
  for (let i = 0, lead = weekdayMon(start); i < lead; i++) cells.push({ state: "blank" });
  let count = 0;
  for (let ymd = start; ymd <= end; ymd = shiftYMD(ymd, 1)) {
    const routine = dayMap.get(ymd);
    const matches = routine && (selectedRoutine === "all" || routine === selectedRoutine);
    if (matches) count += 1;
    const state = !routine ? "none" : matches ? "on" : "other";
    cells.push({ state, day: Number(ymd.slice(8, 10)), ymd, isToday: ymd === today });
  }
  while (cells.length % 7 !== 0) cells.push({ state: "blank" });
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { label: `${humanDayShort(start)} – ${humanDayShort(end)}`, start, end, weeks, count };
}

// The list of {year, month} for a windowed (tiled) view — the last N calendar months incl. the
// current one, oldest first. 3mo→3, 6mo→6, 1yr→12; anything else → just the current month.
export function monthsInWindow(win, now = Date.now()) {
  const N = { "3mo": 3, "6mo": 6, "1yr": 12 }[win] || 1;
  const [y, m] = amsTodayYMD(now).split("-").map(Number); // m is 1-12
  const out = [];
  for (let i = N - 1; i >= 0; i--) {
    let mm = m - 1 - i, yy = y;
    while (mm < 0) { mm += 12; yy -= 1; }
    out.push({ year: yy, month: mm });
  }
  return out;
}

// The hero number + primary caption, per window + routine selection.
//   Today       → { number: <count in rolling window>, caption: "[Routine ]sessions · last 30 days" }
//   3/6/12 mo   → { number: <window total>, caption: "avg N/month · last X months[, Routine]" }
export function heroInfo(dayMap, routine, win, now = Date.now()) {
  const label = routine === "all" ? "" : (ROUTINES.find((r) => r.id === routine)?.label || "");
  const inScope = (r) => routine === "all" || r === routine;

  if (win === "today") {
    // Piece 17: sessions in the rolling last-30-days window (inclusive of today), not the month.
    const end = amsTodayYMD(now);
    const start = shiftYMD(end, -(TODAY_WINDOW_DAYS - 1));
    let count = 0;
    for (const [ymd, r] of dayMap) if (ymd >= start && ymd <= end && inScope(r)) count += 1;
    return { number: count, caption: label ? `${label} sessions · last 30 days` : "sessions · last 30 days" };
  }

  const months = monthsInWindow(win, now);
  const prefixes = new Set(months.map((mm) => `${mm.year}-${pad(mm.month + 1)}`));
  let total = 0;
  for (const [ymd, r] of dayMap) if (prefixes.has(ymd.slice(0, 7)) && inScope(r)) total += 1;
  const avg = (total / months.length).toFixed(1).replace(/\.0$/, "");
  const winLabel = { "3mo": "last 3 months", "6mo": "last 6 months", "1yr": "last year" }[win];
  return { number: total, caption: `avg ${avg}/month · ${winLabel}${label ? `, ${label}` : ""}` };
}
