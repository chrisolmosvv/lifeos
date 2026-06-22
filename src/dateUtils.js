// Small date helpers for the calendar shell. No data — just shaping dates
// into the week grid and the labels around it.

// How tall one hour row is, in pixels. Must match the value in calendar.css.
export const HOUR_HEIGHT = 48

// 0..23 — one entry per hour of the day.
export const HOURS = Array.from({ length: 24 }, (_, i) => i)

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const MO = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const MO_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// The Monday that starts the week containing `date`.
export function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const shift = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + shift)
  d.setHours(0, 0, 0, 0)
  return d
}

// The seven days (Mon..Sun) of the week containing `date`.
export function weekDays(date) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function dayName(d) {
  return WD[d.getDay()]
}

export function dayNameFull(d) {
  return WD_FULL[d.getDay()]
}

// "7 AM", "12 PM", etc.
export function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// The range shown in the header, e.g. "Jun 16–22, 2026".
export function formatRange(days) {
  const a = days[0]
  const b = days[6]
  if (a.getFullYear() !== b.getFullYear()) {
    return `${MO[a.getMonth()]} ${a.getDate()}, ${a.getFullYear()} – ${MO[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`
  }
  if (a.getMonth() !== b.getMonth()) {
    return `${MO[a.getMonth()]} ${a.getDate()} – ${MO[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`
  }
  return `${MO[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}`
}

// "June 21, 2026" style (used on the phone day view).
export function formatLongDate(d) {
  return `${MO[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// The masthead dateline: "Monday, June 22, 2026".
export function formatMastheadDate(d) {
  return `${WD_FULL[d.getDay()]}, ${MO_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// The live clock, zero-padded 24-hour: "09:07:32".
export function formatClock(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// Where an hour-grid should open: centred around now during working hours, else
// at ~7am. Shared by the day column and the week view so they behave the same.
export function nowScrollTop(viewportH) {
  const now = new Date()
  const h = now.getHours()
  if (h >= 7 && h < 22) {
    return Math.max(0, (h + now.getMinutes() / 60) * HOUR_HEIGHT - viewportH / 2)
  }
  return 7 * HOUR_HEIGHT
}
