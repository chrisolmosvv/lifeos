import { HOUR_HEIGHT } from './dateUtils'

// Pure layout for the day timeline. Given today's events and the ms timestamp of
// 00:00 local today, return each event with its pixel top/height and its
// side-by-side column slot for overlaps. No React, no data access — just maths,
// so it's easy to reason about and test.
//
// Overlap rule (the owner's choice): when events overlap in time, the lane
// splits into columns so each is visible but narrower. Each event takes the
// first column where it doesn't collide; a cluster's column count is the most
// that overlap at once. Nothing is ever hidden.
export function layoutEvents(events, dayStart) {
  const MIN_HOURS = 0.5 // a very short event still gets a readable block

  const items = events.map((ev) => {
    const s = new Date(ev.start_at).getTime()
    const e = new Date(ev.end_at).getTime()
    const startH = clamp((s - dayStart) / 3600000, 0, 24)
    let endH = clamp((e - dayStart) / 3600000, 0, 24)
    if (endH - startH < MIN_HOURS) endH = Math.min(startH + MIN_HOURS, 24)
    return {
      ev,
      _s: s,
      _e: e,
      top: startH * HOUR_HEIGHT,
      height: (endH - startH) * HOUR_HEIGHT,
      col: 0,
      cols: 1,
    }
  })

  // Sort by start, then end — needed for both clustering and column packing.
  items.sort((a, b) => a._s - b._s || a._e - b._e)

  // Walk in order, gathering a cluster of transitively-overlapping events; when
  // an event starts at/after the cluster's running end, the cluster is closed
  // and its columns are assigned.
  let cluster = []
  let clusterEnd = -Infinity
  const flush = () => {
    const colEnds = [] // running end time per column
    for (const it of cluster) {
      let col = colEnds.findIndex((end) => it._s >= end)
      if (col === -1) {
        col = colEnds.length
        colEnds.push(it._e)
      } else {
        colEnds[col] = it._e
      }
      it.col = col
    }
    for (const it of cluster) it.cols = colEnds.length
  }

  for (const it of items) {
    if (cluster.length && it._s >= clusterEnd) {
      flush()
      cluster = []
      clusterEnd = -Infinity
    }
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it._e)
  }
  if (cluster.length) flush()

  return items
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// Merge a day's events and scheduled tasks into one list of timeline blocks, so
// both the day column and the week column lay them out (and split overlaps) the
// same way. Events keep their start_at/end_at; a scheduled task is mapped onto
// the same shape from its scheduled_start/scheduled_end and tagged kind:'task'
// (it stays a task — this is just its block view).
export function buildDayItems(events, scheduledTasks) {
  return [
    ...events.map((e) => ({ ...e, kind: 'event' })),
    ...scheduledTasks.map((t) => ({
      id: t.id,
      kind: 'task',
      title: t.title,
      category_id: t.category_id,
      status: t.status,
      start_at: t.scheduled_start,
      end_at: t.scheduled_end,
    })),
  ]
}
