import { supabase } from '../spine/data/supabaseClient'
import { startOfDay, addDays, localDateStr } from '../spine/data/useTodayData'
import { useGridDrag } from './kit/useGridDrag'

// useTodayGrid — Today's wiring for the SHARED drag engine (useGridDrag).
// (Piece 0 split: moved verbatim out of Today.jsx; no behaviour changed.)
//
// Today's config: a SINGLE day (dayStartMsAt ignores x), the 7am lane offset, and
// the two right-column modules as the "off-grid" drop target — drag a block off the
// sheet and onto a module and the task loses its scheduled time and is re-dated
// (onto "tasks today" → the viewed day; onto "the next 7 days" → a week out).
// Every write goes through the caller's existing task/event paths.
export function useTodayGrid({
  viewed,
  bucketFor,
  laneRef,
  scrollRef,
  todayModRef,
  weekModRef,
  writeTask,
  writeEvent,
  setForm,
  onOpenEvent,
  onOpenTask,
}) {
  const dayStartMs = startOfDay(viewed).getTime()

  const inRect = (ref, x, y) => {
    const el = ref.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }
  const moduleAt = (x, y) =>
    inRect(todayModRef, x, y) ? 'today' : inRect(weekModRef, x, y) ? 'next7' : null

  return useGridDrag({
    geomRef: laneRef,
    scrollRef,
    startMin: 7 * 60,
    dayStartMsAt: () => dayStartMs,
    offAt: moduleAt,
    eventsShowOff: false,
    onSelect: (item) => (item.kind === 'event' ? onOpenEvent(item.id) : onOpenTask(item.id)),
    onCreate: (startIso, endIso) =>
      setForm({
        kind: 'event',
        create: true,
        item: {
          start_at: startIso,
          end_at: endIso,
          scheduled_start: startIso,
          scheduled_end: endIso,
          time_bucket: bucketFor(viewed),
          due_date: localDateStr(viewed),
        },
      }),
    onMove: (item, startIso, endIso) =>
      item.kind === 'event'
        ? writeEvent(supabase.from('events').update({ start_at: startIso, end_at: endIso }).eq('id', item.id))
        : writeTask(supabase.from('tasks').update({ scheduled_start: startIso, scheduled_end: endIso }).eq('id', item.id)),
    onSchedule: (id, startIso, endIso) =>
      writeTask(supabase.from('tasks').update({ scheduled_start: startIso, scheduled_end: endIso }).eq('id', id)),
    onOff: (item, target) => {
      const fields =
        target === 'today'
          ? { scheduled_start: null, scheduled_end: null, due_date: localDateStr(viewed), time_bucket: bucketFor(viewed) }
          : { scheduled_start: null, scheduled_end: null, due_date: localDateStr(addDays(viewed, 7)), time_bucket: 'This Week' }
      return writeTask(supabase.from('tasks').update(fields).eq('id', item.id))
    },
  })
}
