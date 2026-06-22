import { useEffect, useState } from 'react'
import { HOURS, HOUR_HEIGHT, formatHour } from './dateUtils'
import NowLine from './NowLine'
import EventBlock from './EventBlock'
import EventPanel from './EventPanel'
import { layoutEvents } from './eventLayout'
import { useEventDrag } from './useEventDrag'
import './dayTimeline.css'

// "The Day" column: a 24-hour grid showing today's events (solid blocks) and
// scheduled tasks (dashed blocks — still tasks, just a time view) in one shared
// overlap layout. Editable: tap empty to create an event, tap an event to edit,
// drag any block to move/resize, drag a task block off the right edge (or its ×)
// to unschedule. `scrollRef` is owned by Today (so the schedule-drop shares it).
export default function DayTimeline({
  events,
  scheduledTasks,
  cats,
  today,
  pickable,
  busy,
  scrollRef,
  onSaveEvent,
  onDeleteEvent,
  onScheduleTask,
  onUnscheduleTask,
}) {
  const [panel, setPanel] = useState(null) // null | {mode, event?, start?, end?}

  const drag = useEventDrag({
    today,
    scrollRef,
    onSelect: (item) => {
      if (item.kind === 'event') setPanel({ mode: 'edit', event: item })
    },
    onDrop: (item, startIso, endIso) => {
      if (item.kind === 'task') onScheduleTask(item.id, startIso, endIso)
      else onSaveEvent(item.id, { start_at: startIso, end_at: endIso })
    },
    onUnschedule: (item) => onUnscheduleTask(item.id),
  })

  // Open centred around now, or at ~7am if now is outside working hours.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const now = new Date()
    const h = now.getHours()
    if (h >= 7 && h < 22) {
      const nowTop = (h + now.getMinutes() / 60) * HOUR_HEIGHT
      el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2)
    } else {
      el.scrollTop = 7 * HOUR_HEIGHT
    }
  }, [scrollRef])

  function openNewAt(hour) {
    const start = new Date(today)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start)
    end.setHours(start.getHours() + 1)
    setPanel({ mode: 'new', start, end })
  }
  const openNewNext = () => openNewAt(Math.min(23, new Date().getHours() + 1))
  function onGridClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const hour = Math.floor((e.clientY - rect.top) / HOUR_HEIGHT)
    openNewAt(Math.max(0, Math.min(23, hour)))
  }

  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const catById = new Map(cats.map((c) => [c.id, c]))

  // Events + scheduled tasks share one overlap layout.
  const items = [
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
  const laidOut = layoutEvents(items, dayStart)

  return (
    <div className="dt">
      <div className="dt-bar">
        <button className="dt-add" onClick={openNewNext}>
          + Add event
        </button>
      </div>

      <div className="dt-scroll" ref={scrollRef}>
        <div className="dt-grid">
          <div className="cal-times">
            {HOURS.map((h) => (
              <div className="cal-time-cell" key={h}>
                <span>{formatHour(h)}</span>
              </div>
            ))}
          </div>

          <div className="cal-col is-today dt-col" onClick={onGridClick}>
            {HOURS.map((h) => (
              <div className="cal-hour-cell" key={h} />
            ))}

            {laidOut.map((it) => {
              const dragging = drag.preview?.id === it.ev.id
              return (
                <EventBlock
                  key={it.ev.kind + ':' + it.ev.id}
                  ev={it.ev}
                  cat={it.ev.category_id ? catById.get(it.ev.category_id) : null}
                  top={dragging ? drag.preview.top : it.top}
                  height={dragging ? drag.preview.height : it.height}
                  col={dragging ? 0 : it.col}
                  cols={dragging ? 1 : it.cols}
                  dragging={dragging}
                  removing={dragging && drag.preview.removing}
                  handlers={drag.bind(it.ev)}
                  onUnschedule={() => onUnscheduleTask(it.ev.id)}
                />
              )
            })}

            <NowLine />
          </div>
        </div>
      </div>

      {panel && (
        <EventPanel
          mode={panel.mode}
          event={panel.event}
          start={panel.start}
          end={panel.end}
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
