// Pure date math for the masthead — NO network, NO app data. Two jobs:
//   1) the live dateline: a 24-hour "HH:MM" + the weekday, and "D Month YYYY".
//   2) the "personal edition": age in whole years + which day of the current
//      personal year it is, counting the birthday itself as Day 1.
// The owner's birthday is 29 March 2002. (So 23 June 2026 → YEAR 24 · DAY 87.)

const WD_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MO_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const BIRTHDAY = { year: 2002, month: 2, day: 29 } // month index 2 = March

const pad = (n) => String(n).padStart(2, '0')
const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

// "14:35" — 24-hour, zero-padded, to the minute (no seconds).
export function mastTime(now) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}
export function mastWeekday(now) {
  return WD_FULL[now.getDay()]
}
// "23 June 2026"
export function mastDate(now) {
  return `${now.getDate()} ${MO_FULL[now.getMonth()]} ${now.getFullYear()}`
}

// { age, day } — age = whole years old; day = day-of-personal-year (birthday = Day 1).
export function personalEdition(now) {
  let lastBday = new Date(now.getFullYear(), BIRTHDAY.month, BIRTHDAY.day)
  if (stripTime(now) < stripTime(lastBday)) {
    lastBday = new Date(now.getFullYear() - 1, BIRTHDAY.month, BIRTHDAY.day)
  }
  const age = lastBday.getFullYear() - BIRTHDAY.year
  const day = Math.floor((stripTime(now) - stripTime(lastBday)) / 86400000) + 1
  return { age, day }
}
