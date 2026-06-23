import { startOfWeek } from './dateUtils'

// Pure layout for the Month grid (Phase 7, C6). No React, no data access — given
// the month + the range's events/tasks, returns the 42 grid days, each day's
// single-day items, and the multi-day strips per week-row (with greedy lane
// assignment so overlapping spans stack). Read-only maths.
const DAY = 86400000
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

function dateFromYMD(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function monthLayout(monthAnchor, events, tasks) {
  const gridStart = startOfWeek(monthAnchor) // Monday on/before the 1st
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const gridStartMs = midnight(gridStart).getTime()
  const idxOf = (d) => Math.floor((midnight(d).getTime() - gridStartMs) / DAY)

  const itemsByDay = new Map() // dayKey -> { events:[], tasks:[] }
  const ensure = (k) => {
    if (!itemsByDay.has(k)) itemsByDay.set(k, { events: [], tasks: [] })
    return itemsByDay.get(k)
  }

  const multi = [] // { event, startIdx, endIdx } — spans >1 calendar day
  for (const ev of events) {
    const startIdx = idxOf(new Date(ev.start_at))
    const lastIdx = idxOf(new Date(new Date(ev.end_at).getTime() - 1)) // end-exclusive
    if (lastIdx <= startIdx) {
      if (startIdx >= 0 && startIdx < 42) ensure(dayKey(days[startIdx])).events.push(ev)
    } else {
      const a = Math.max(0, startIdx)
      const b = Math.min(41, lastIdx)
      if (b >= 0 && a < 42) multi.push({ event: ev, startIdx: a, endIdx: b })
    }
  }

  for (const t of tasks) {
    const when = t.scheduled_start
      ? new Date(t.scheduled_start)
      : t.due_date
        ? dateFromYMD(t.due_date)
        : null
    if (!when) continue
    const i = idxOf(when)
    if (i >= 0 && i < 42) ensure(dayKey(days[i])).tasks.push(t)
  }

  // Per-week-row strips with greedy lane assignment.
  const strips = []
  const laneCountByRow = [0, 0, 0, 0, 0, 0]
  for (let r = 0; r < 6; r++) {
    const rowStart = r * 7
    const rowEnd = rowStart + 6
    const lanes = [] // lane -> last endCol used
    const inRow = multi
      .filter((m) => m.startIdx <= rowEnd && m.endIdx >= rowStart)
      .sort((a, b) => a.startIdx - b.startIdx || b.endIdx - a.endIdx)
    for (const m of inRow) {
      const startCol = Math.max(m.startIdx, rowStart) - rowStart
      const endCol = Math.min(m.endIdx, rowEnd) - rowStart
      let lane = lanes.findIndex((endUsed) => startCol > endUsed)
      if (lane === -1) {
        lane = lanes.length
        lanes.push(endCol)
      } else {
        lanes[lane] = endCol
      }
      strips.push({ event: m.event, row: r, lane, startCol, endCol })
    }
    laneCountByRow[r] = lanes.length
  }

  return { days, itemsByDay, strips, laneCountByRow }
}
