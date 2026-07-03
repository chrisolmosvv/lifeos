// LifeOS — the recurrence engine (T10, Piece 2A). PURE date/timezone maths, no
// data access, no React, no dependencies. Two jobs:
//   occurrencesBetween(recipe, fromYMD, toYMD) → the list of occurrence DATES the
//     recipe produces inside a window, honoring the pattern + end condition.
//   wallTimeToInstant(ymd, wallTime, tz) → the DST-correct UTC instant for a
//     calendar date + a wall-clock time in a fixed zone (so "09:00 every Monday"
//     stays 09:00 across the daylight-saving change).
// Dates are "YYYY-MM-DD" strings throughout; date arithmetic uses a noon-UTC anchor
// so a DST hour can never shift the calendar day (the same trick gymDates.js uses).

const pad = (n) => String(n).padStart(2, '0')
const noon = (ymd) => new Date(`${ymd}T12:00:00Z`) // canonical instant for a calendar day
const ymdOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const mk = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const partsOf = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return { y, m, d } }
// Days in month m (1..12) of year y — Date.UTC(y, m, 0) is the last day of month m.
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()

// "YYYY-MM-DD" shifted by `n` days (n may be negative). Noon-UTC → no DST drift.
export function addDaysYMD(ymd, n) {
  const d = noon(ymd)
  d.setUTCDate(d.getUTCDate() + n)
  return ymdOf(d)
}
// "YYYY-MM-DD" shifted by `n` months, keeping the same day-of-month; returns null
// if that day doesn't exist in the target month (e.g. the 31st of a short month).
export function addMonthsYMD(ymd, n) {
  const { y, m, d } = partsOf(ymd)
  let ny = y + Math.floor((m - 1 + n) / 12)
  let nm = ((m - 1 + n) % 12 + 12) % 12 + 1
  if (d > daysInMonth(ny, nm)) return null
  return mk(ny, nm, d)
}
// The weekday of a calendar date, JS getDay convention (0=Sun..6=Sat).
export function weekdayYMD(ymd) {
  return noon(ymd).getUTCDay()
}

// A generator of candidate occurrence dates from start_date forward, per freq.
// Returns a { next() } that yields the next "YYYY-MM-DD" (or null when it can't
// advance — only monthly/yearly can run dry, and they just skip to the next period).
function stepper(freq, weekdays, startYMD) {
  if (freq === 'daily') {
    let cur = null
    return { next: () => (cur = cur == null ? startYMD : addDaysYMD(cur, 1)) }
  }
  if (freq === 'weekly') {
    const days = new Set(weekdays && weekdays.length ? weekdays : [weekdayYMD(startYMD)])
    let cur = addDaysYMD(startYMD, -1)
    return {
      next: () => {
        do { cur = addDaysYMD(cur, 1) } while (!days.has(weekdayYMD(cur)))
        return cur
      },
    }
  }
  // monthly / yearly: step whole periods, SKIPPING a period whose target day
  // doesn't exist (the 31st of a short month; Feb 29 of a common year).
  const stepMonths = freq === 'yearly' ? 12 : 1
  let offset = -stepMonths
  return {
    next: () => {
      // advance until the same-day-of-month exists in the target period
      for (let guard = 0; guard < 4800; guard++) { // ~400 years cap, safety only
        offset += stepMonths
        const d = addMonthsYMD(startYMD, offset)
        if (d) return d
      }
      return null
    },
  }
}

// The occurrence DATES the recipe makes inside [fromYMD, toYMD] (inclusive).
// `count` end-condition counts occurrences from start_date (not from `fromYMD`),
// so a lazy top-up window can ask for a slice and still respect "after N times".
export function occurrencesBetween(recipe, fromYMD, toYMD) {
  const { freq, weekdays, end_kind, end_count, end_until, start_date } = recipe
  const until = end_kind === 'until' ? end_until : null
  const limit = end_kind === 'count' ? end_count : Infinity
  const out = []
  const step = stepper(freq, weekdays, start_date)
  let made = 0
  for (let guard = 0; guard < 200000; guard++) { // safety net against any bad recipe
    const d = step.next()
    if (d == null) break
    if (made >= limit) break
    if (until && d > until) break
    if (d > toYMD) break
    if (d >= fromYMD) out.push(d)
    made++
  }
  return out
}

// --- DST-correct time -------------------------------------------------------
// The UTC offset (ms) of zone `tz` at a given instant: read the instant's wall
// clock in tz, treat those wall parts AS IF UTC, and subtract the instant.
function tzOffsetMs(instantMs, tz) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(instantMs))
  const g = {}
  for (const x of p) if (x.type !== 'literal') g[x.type] = Number(x.value)
  const asUTC = Date.UTC(g.year, g.month - 1, g.day, g.hour % 24, g.minute, g.second)
  return asUTC - instantMs
}

// A calendar date "YYYY-MM-DD" + a wall-clock time ("HH:MM" or "HH:MM:SS") in zone
// `tz` → the exact UTC instant, as a Date. DST-correct: the offset is resolved at
// the target instant, so 09:00 local maps to 07:00Z in summer and 08:00Z in winter.
export function wallTimeToInstant(ymd, wallTime, tz = 'Europe/Amsterdam') {
  const { y, m, d } = partsOf(ymd)
  const [h, mi = 0] = String(wallTime).split(':').map(Number)
  const wallAsUTC = Date.UTC(y, m - 1, d, h, mi, 0)
  // Two passes converge everywhere except the twice-a-year DST gap/fold (not 09:00).
  let inst = wallAsUTC - tzOffsetMs(wallAsUTC, tz)
  inst = wallAsUTC - tzOffsetMs(inst, tz)
  return new Date(inst)
}
