// Pure date math for the Calendar's time navigation (spec §2). No network, no
// data. Three states:
//   • HOME — today-anchored rolling: today is column 1, the next six days follow.
//   • WEEK — a standard Monday–Sunday week (its Monday is `nav.monday`).
//   • FREE — (V2-5) any day-aligned 7-day window from a swipe (its start is
//     `nav.start`). Arrows from FREE snap to the nearest Mon–Sun week (the seam).
// Jump rules (from the home view):
//   Next → the Monday AFTER this week's Monday (skips into next week).
//   Prev → the current calendar week (this week's Monday).
//   Further arrows step whole Mon–Sun weeks. "Back to this week" → HOME.

import { startOfWeek } from './dateUtils'

export const HOME = { mode: 'home' }

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function midnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
// Seven local-midnight days starting at `start`.
function sevenFrom(start) {
  const s = midnight(start)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

export function isHome(nav) {
  return nav.mode === 'home'
}

// The seven Date columns for the current nav state.
export function navDays(nav, today) {
  if (nav.mode === 'home') return sevenFrom(today)
  if (nav.mode === 'free') return sevenFrom(nav.start)
  return sevenFrom(nav.monday)
}

// The Monday a FREE window snaps to on an arrow = the Monday of the week
// containing its start (then Next/Prev step from there) — the seam (Batch 5).
function baseMonday(nav, today) {
  if (nav.mode === 'home') return startOfWeek(today)
  if (nav.mode === 'free') return startOfWeek(nav.start)
  return nav.monday
}

export function navNext(nav, today) {
  // From home/free the first Next skips to the week AFTER the containing one
  // (matching the home rule); from a week it steps +7.
  const monday = nav.mode === 'week' ? addDays(nav.monday, 7) : addDays(baseMonday(nav, today), 7)
  return { mode: 'week', monday }
}

export function navPrev(nav, today) {
  // From home/free, Prev lands on the containing/current Mon-week; from a week, −7.
  const monday = nav.mode === 'week' ? addDays(nav.monday, -7) : baseMonday(nav, today)
  return { mode: 'week', monday }
}

// V2-5: a free swipe shifts the current window by whole days, landing on ANY
// day-aligned 7-day window. Snapping exactly back onto today's rolling window
// returns HOME (so the home semantics / "Back to this week" resume).
export function navShift(nav, today, dayShift) {
  const start = midnight(addDays(navDays(nav, today)[0], dayShift))
  if (start.getTime() === midnight(today).getTime()) return HOME
  return { mode: 'free', start }
}

// Jump to the week containing `day` (used by Month's day-clicks) — per the same
// rules: if the day is inside the rolling-home window (today..+6) show HOME, else
// the standard Monday–Sunday week containing it.
export function navToDay(day, today) {
  const win = sevenFrom(today)
  const d = midnight(day).getTime()
  const inHome = d >= win[0].getTime() && d <= win[6].getTime()
  return inHome ? HOME : { mode: 'week', monday: startOfWeek(day) }
}
