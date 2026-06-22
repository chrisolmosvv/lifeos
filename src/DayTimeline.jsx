import { useEffect, useState } from 'react'
import { HOURS, HOUR_HEIGHT, formatHour, nowScrollTop } from './dateUtils'
import EventPanel from './EventPanel'
import TaskPanel from './TaskPanel'
import DayColumn from './DayColumn'
import { useEventDrag } from './useEventDrag'
import './dayTimeline.css'

// "The Day" column on Today: a single interactive day (the shared DayColumn,
// with drag/create wired in) plus the create/edit panel. The hour-grid render,
// the event/task blocks and the overlap layout all live in DayColumn — this
// file is just the interaction wiring. `scrollRef` is owned by Today (shared
// with the schedule-drop).
export default function DayTimeline({
  events,
  scheduledTasks,
  cats,
  today,
  pickable,
  inboxColor,
  busy,
  scrollRef,
  onSaveEvent,
  onDeleteEvent,
  onScheduleTask,
  onUnscheduleTask,
  onUpdateTask,
}) {
  const [panel, setPanel] = useState(null) // null | {mode, event?, start?, end?}
  const [taskPanelId, setTaskPanelId] = useState(null)
  const editingTask = taskPanelId
    ? scheduledTasks.find((t) => t.id === taskPanelId)
    : null

  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()

  // Geometry for the single day column: minutes from the grid top; the day is
  // always today (no horizontal day-axis here).
  const geometry = {
    minutesAt: (clientY) => {
      const el = scrollRef.current
      const top = el.getBoundingClientRect().top
      return ((clientY - top + el.scrollTop) / HOUR_HEIGHT) * 60
    },
    dayStartMsAt: () => dayStart,
  }

  const drag = useEventDrag({
    geometry,
    scrollRef,
    allowResize: true,
    allowUnschedule: true,
    onSelect: (item) => {
      if (item.kind === 'event') setPanel({ mode: 'edit', event: item })
      else setTaskPanelId(item.id) // tapping a task block edits the task
    },
    onDrop: (item, startIso, endIso) => {
      if (item.kind === 'task') onScheduleTask(item.id, startIso, endIso)
      else onSaveEvent(item.id, { start_at: startIso, end_at: endIso })
    },
    onUnschedule: (item) => onUnscheduleTask(item.id),
  })

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = nowScrollTop(el.clientHeight)
  }, [scrollRef])

  function openNewAt(hour) {
    const start = new Date(today)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start)
    end.setHours(start.getHours() + 1)
    setPanel({ mode: 'new', start, end })
  }
  const openNewNext = () => openNewAt(Math.min(23, new Date().getHours() + 1))
  function onColClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const hour = Math.floor((e.clientY - rect.top) / HOUR_HEIGHT)
    openNewAt(Math.max(0, Math.min(23, hour)))
  }

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

          <DayColumn
            events={events}
            scheduledTasks={scheduledTasks}
            cats={cats}
            dayStart={dayStart}
            showNow
            className="is-today dt-col"
            interactive
            onColClick={onColClick}
            bind={drag.bind}
            preview={drag.preview}
            onUnscheduleTask={onUnscheduleTask}
          />
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
