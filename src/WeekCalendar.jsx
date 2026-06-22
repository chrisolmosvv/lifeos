import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import {
  HOURS,
  HOUR_HEIGHT,
  formatHour,
  isSameDay,
  dayName,
  formatRange,
  nowScrollTop,
} from './dateUtils'
import { orderedTree, isInbox } from './categoryTree'
import DayColumn from './DayColumn'
import EventPanel from './EventPanel'
import WeekDragPreview from './WeekDragPreview'
import { useEventDrag } from './useEventDrag'
import './calendar.css'

// Desktop week view: seven day columns Mon–Sun. Now interactive (4g): tap an
// event to edit it, drag any block to move it — vertically for the time,
// horizontally across columns to change the day. Reuses the day column's drag
// hook (with week geometry), the shared DayColumn render and the edit panel.
// Resize + create on the week are the next piece (4h). Writes only existing time
// columns — no schema change.
export default function WeekCalendar({ days, today }) {
  const scrollRef = useRef(null)
  const bodyRef = useRef(null)
  const [events, setEvents] = useState([])
  const [scheduled, setScheduled] = useState([])
  const [cats, setCats] = useState([])
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState(null)

  async function load() {
    const weekStart = new Date(days[0])
    const weekEnd = new Date(days[0])
    weekEnd.setDate(weekEnd.getDate() + 7)
    const inWeek = (q, col) =>
      q.gte(col, weekStart.toISOString()).lt(col, weekEnd.toISOString())

    const [evRes, taskRes, catRes] = await Promise.all([
      inWeek(
        supabase.from('events').select('id, title, notes, start_at, end_at, location, category_id'),
        'start_at',
      ).order('start_at', { ascending: true }),
      inWeek(
        supabase
          .from('tasks')
          .select('id, title, status, category_id, scheduled_start, scheduled_end'),
        'scheduled_start',
      ),
      supabase.from('categories').select('id, name, color, parent_id, sort_order'),
    ])
    setEvents(evRes.data || [])
    setScheduled(taskRes.data || [])
    setCats(catRes.data || [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = nowScrollTop(el.clientHeight)
  }, [])

  // Writes (reload after). Event saves return a plain message for the panel.
  async function writeEvent(query) {
    setBusy(true)
    const { error } = await query
    setBusy(false)
    if (error)
      return error.code === '23514'
        ? 'That event ends before it starts — check the times.'
        : error.message || 'Something went wrong.'
    await load()
    return null
  }
  const onSaveEvent = (id, fields) =>
    writeEvent(supabase.from('events').update(fields).eq('id', id))
  const onDeleteEvent = (id) =>
    writeEvent(supabase.from('events').delete().eq('id', id))
  const onScheduleTask = (id, startIso, endIso) =>
    writeEvent(
      supabase
        .from('tasks')
        .update({ scheduled_start: startIso, scheduled_end: endIso })
        .eq('id', id),
    )

  // Week geometry: which day-column the pointer is over, and the minutes down
  // the shared hour grid. This is what makes cross-day dragging work.
  const geometry = {
    minutesAt: (clientY) => {
      const b = bodyRef.current.getBoundingClientRect()
      return ((clientY - b.top) / HOUR_HEIGHT) * 60
    },
    dayStartMsAt: (clientX) => {
      const b = bodyRef.current.getBoundingClientRect()
      const colW = (b.width - 56) / 7
      const idx = Math.max(0, Math.min(6, Math.floor((clientX - b.left - 56) / colW)))
      const d = days[idx]
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    },
  }

  const drag = useEventDrag({
    geometry,
    scrollRef,
    allowResize: false, // resize on the week is 4h
    allowUnschedule: false,
    onSelect: (item) => {
      if (item.kind === 'event') setPanel({ mode: 'edit', event: item })
    },
    onDrop: (item, startIso, endIso) => {
      if (item.kind === 'task') onScheduleTask(item.id, startIso, endIso)
      else onSaveEvent(item.id, { start_at: startIso, end_at: endIso })
    },
  })

  const pickable = orderedTree(cats).filter((c) => !isInbox(c))
  const catById = new Map(cats.map((c) => [c.id, c]))

  // The item under an active drag, for the floating preview.
  let dragItem = null
  let dragIndex = -1
  if (drag.preview) {
    const ev = events.find((e) => e.id === drag.preview.id)
    const tk = scheduled.find((t) => t.id === drag.preview.id)
    dragItem = ev
      ? { ...ev, kind: 'event' }
      : tk
        ? { title: tk.title, kind: 'task', category_id: tk.category_id }
        : null
    dragIndex = days.findIndex((d) =>
      isSameDay(d, new Date(drag.preview.dayStartMs)),
    )
  }

  return (
    <div className="cal-week">
    <div className="cal-scroll" ref={scrollRef}>
      <div className="cal-head">
        <div className="cal-corner">
          <span className="cal-range">{formatRange(days)}</span>
        </div>
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={'cal-dayhead' + (isSameDay(d, today) ? ' is-today' : '')}
          >
            <span className="dh-name">{dayName(d)}</span>
            <span className="dh-num">{d.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="cal-body" ref={bodyRef}>
        <div className="cal-times">
          {HOURS.map((h) => (
            <div className="cal-time-cell" key={h}>
              <span>{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {days.map((d) => {
          const isToday = isSameDay(d, today)
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
          return (
            <DayColumn
              key={d.toISOString()}
              events={events.filter((e) => isSameDay(new Date(e.start_at), d))}
              scheduledTasks={scheduled.filter((t) =>
                isSameDay(new Date(t.scheduled_start), d),
              )}
              cats={cats}
              dayStart={dayStart}
              showNow={isToday}
              className={isToday ? 'is-today' : ''}
              interactive
              resizable={false}
              bind={drag.bind}
              ghostId={drag.preview?.id}
            />
          )
        })}

        {dragItem && dragIndex >= 0 && (
          <WeekDragPreview
            preview={drag.preview}
            item={dragItem}
            cat={dragItem.category_id ? catById.get(dragItem.category_id) : null}
            dayIndex={dragIndex}
          />
        )}
      </div>
    </div>

      {panel && (
        <EventPanel
          mode={panel.mode}
          event={panel.event}
          pickable={pickable}
          busy={busy}
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}
