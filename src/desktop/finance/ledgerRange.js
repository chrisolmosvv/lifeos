// LifeOS — Finance ledger range + date utilities. Pure functions, no React.
// Computes the from/to date window for a given range unit + offset, and
// formats the label for the masthead.

const pad = (n) => String(n).padStart(2, '0')

// Today's date parts in local time.
function todayParts() {
  const d = new Date()
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() }
}

// The from/to date range for a unit ('month'|'quarter'|'year') at an offset
// (0 = current, -1 = previous, etc.). Returns { from, to } as YYYY-MM-DD.
export function dateRange(unit, offset) {
  const { y, m } = todayParts()
  if (unit === 'month') {
    const mo = m + offset
    const ry = y + Math.floor(mo / 12)
    const rm = ((mo % 12) + 12) % 12
    const last = new Date(ry, rm + 1, 0).getDate()
    return { from: `${ry}-${pad(rm + 1)}-01`, to: `${ry}-${pad(rm + 1)}-${pad(last)}` }
  }
  if (unit === 'quarter') {
    const baseQ = Math.floor(m / 3)
    const q = baseQ + offset
    const ry = y + Math.floor(q / 4)
    const rq = ((q % 4) + 4) % 4
    const startMo = rq * 3
    const endMo = startMo + 2
    const last = new Date(ry, endMo + 1, 0).getDate()
    return { from: `${ry}-${pad(startMo + 1)}-01`, to: `${ry}-${pad(endMo + 1)}-${pad(last)}` }
  }
  // year
  const ry = y + offset
  return { from: `${ry}-01-01`, to: `${ry}-12-31` }
}

// A human-readable label for the current range window.
export function rangeLabel(unit, offset) {
  const { from, to } = dateRange(unit, offset)
  const fmtMonth = (ymd) => {
    try { return new Date(ymd + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
    catch { return ymd }
  }
  if (unit === 'month') return fmtMonth(from)
  if (unit === 'quarter') {
    const q = Math.floor(parseInt(from.slice(5, 7), 10) / 3) // 0-indexed quarter from the start month (1-indexed)
    // recalculate: month 1→Q1, 4→Q2, 7→Q3, 10→Q4
    const qNum = Math.floor((parseInt(from.slice(5, 7), 10) - 1) / 3) + 1
    return `Q${qNum} ${from.slice(0, 4)}`
  }
  return from.slice(0, 4) // year
}

// Whether offset 0 is the current period (so "next" should be disabled).
export function isCurrentPeriod(offset) {
  return offset >= 0
}
