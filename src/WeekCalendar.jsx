import { useEffect, useRef, useState } from 'react'
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
import { INBOX_COLOR } from './palette'
import DayColumn from './DayColumn'
import EventPanel from './EventPanel'
import TaskPanel from './TaskPanel'
import WeekDragPreview from './WeekDragPreview'
import { useEventDrag } from './useEventDrag'
import { useWeekData } from './useWeekData'
import './calendar.css'

// Desktop week view: seven day columns Mon–Sun, at full parity with the day
// column (4h): tap an event to edit / a task to edit it (stays a task); drag to
// move (vertical = time; horizontal across columns = the day); drag an edge to
// resize; tap an empty slot or "+ Add event" to create. Reuses the shared drag
// hook (week geometry), DayColumn, EventPanel and TaskPanel. The data + writes
// live in useWeekData. No schema change — writes only existing columns.
export default function WeekCalendar({ days, today }) {
  const scrollRef = useRef(null)
  const bodyRef = useRef(null)
  const [panel, setPanel] = useState(null)
  const [taskPanelId, setTaskPanelId] = useState(null)
  const { events, scheduled, cats, busy, onSaveEvent, onDeleteEvent, onScheduleTask, onUpdateTask } =
    useWeekData(days)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = nowScrollTop(el.clientHeight)
  }, [])

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
    allowResize: true, // edge-grab resizes (middle-grab still moves / crosses days)
    allowUnschedule: false,
    onSelect: (item) => {
      if (item.kind === 'event') setPanel({ mode: 'edit', event: item })
      else setTaskPanelId(item.id) // tapping a task block edits the task
    },
    onDrop: (item, startIso, endIso) => {
      if (item.kind === 'task') onScheduleTask(item.id, startIso, endIso)
      else onSaveEvent(item.id, { start_at: startIso, end_at: endIso })
    },
  })

  // Create: tap an empty slot in a day's column → a one-hour event at that
  // day/time; "+ Add event" → today (or the first day) at the next hour.
  function openNewAt(day, e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_HEIGHT)))
    const start = new Date(day)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start)
    end.setHours(hour + 1)
    setPanel({ mode: 'new', start, end })
  }
  function openNewDefault() {
    const base = days.find((d) => isSameDay(d, today)) || days[0]
    const hour = Math.min(23, new Date().getHours() + 1)
    const start = new Date(base)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start)
    end.setHours(hour + 1)
    setPanel({ mode: 'new', start, end })
  }

  const pickable = orderedTree(cats).filter((c) => !isInbox(c))
  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const catById = new Map(cats.map((c) => [c.id, c]))
  const editingTask = taskPanelId
    ? scheduled.find((t) => t.id === taskPanelId)
    : null

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
    <div className="cal-bar">
      <button className="dt-add" onClick={openNewDefault}>
        + Add event
      </button>
    </div>
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
              bind={drag.bind}
              ghostId={drag.preview?.id}
              onColClick={(e) => openNewAt(d, e)}
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
          start={panel.start}
          end={panel.end}
          pickable={pickable}
          busy={busy}
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
          onClose={() => setPanel(null)}
        />
      )}

      {editingTask && (
        <TaskPanel
          task={editingTask}
          pickable={pickable}
          inboxColor={inboxColor}
          busy={busy}
          onUpdate={onUpdateTask}
          onClose={() => setTaskPanelId(null)}
        />
      )}
    </div>
  )
}
