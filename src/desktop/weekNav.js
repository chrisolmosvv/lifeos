// Pure date math for the Calendar's time navigation (spec §2). No network, no
// data. Two states:
//   • HOME — today-anchored rolling: today is column 1, the next six days follow.
//   • WEEK — a standard Monday–Sunday week (its Monday is `nav.monday`).
// Jump rules (from the home view):
//   Next → the Monday AFTER this week's Monday (skips into next week).
//   Prev → the current calendar week (this week's Monday).
//   Further arrows step whole Mon–Sun weeks. "Back to this week" → HOME.
// The V2-5 swipe steps whole Mon-weeks via these same navNext/navPrev (one path
// with the arrows) — there is no free/any-day window.

import { startOfWeek } from '../spine/logic/dateUtils'

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
  return nav.mode === 'home' ? sevenFrom(today) : sevenFrom(nav.monday)
}

export function navNext(nav, today) {
  const monday = nav.mode === 'home' ? addDays(startOfWeek(today), 7) : addDays(nav.monday, 7)
  return { mode: 'week', monday }
}

export function navPrev(nav, today) {
  const monday = nav.mode === 'home' ? startOfWeek(today) : addDays(nav.monday, -7)
  return { mode: 'week', monday }
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
