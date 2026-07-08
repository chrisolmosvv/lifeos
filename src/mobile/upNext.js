// The first event or scheduled task starting AFTER now, from the day's data.
// Pure: arrays in → one item out. ~5 lines of logic; the mobile Today subline
// feeds from this ("Up next · Dentist, 14:00").

export function upNext(events, tasks, now) {
  const ms = now.getTime()
  const items = []
  for (const e of events) {
    if (!e.all_day) items.push({ title: e.title, start: new Date(e.start_at) })
  }
  for (const t of tasks || []) {
    if (t.scheduled_start) items.push({ title: t.title, start: new Date(t.scheduled_start) })
  }
  items.sort((a, b) => a.start - b.start)
  return items.find((it) => it.start.getTime() > ms) || null
}

export function formatUpNext(item) {
  if (!item) return null
  const h = item.start.getHours()
  const m = item.start.getMinutes()
  const time = h + ':' + String(m).padStart(2, '0')
  return 'Up next \u00b7 ' + item.title + ', ' + time
}
