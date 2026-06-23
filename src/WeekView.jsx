import { useRef, useState } from 'react'
import { orderedTree, isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { useWeekData } from './useWeekData'
import { useWeekGrid } from './kit/useWeekGrid'
import WeekGrid from './kit/WeekGrid'
import EventPanel from './EventPanel'
import TaskPanel from './TaskPanel'

// One week's data + interactions + the (still-current) edit panels (Phase 7, C2).
// Mounted with a `key` per week (see CalendarWeek) so navigating remounts it and
// useWeekData reloads — the shared hook stays untouched. Gestures come from
// useWeekGrid (the documented sibling of Today's useTodayGrid); all writes go
// through the EXISTING useWeekData paths (no schema change). Create + edit still
// use the current EventPanel/TaskPanel — the converged shared form is C3.
export default function WeekView({ days, today }) {
  const { events, scheduled, cats, busy, onSaveEvent, onDeleteEvent, onScheduleTask, onUpdateTask } =
    useWeekData(days)
  const [panel, setPanel] = useState(null) // {mode:'edit',event} | {mode:'new',start,end}
  const [taskPanelId, setTaskPanelId] = useState(null)
  const scrollRef = useRef(null)
  const bodyRef = useRef(null)

  const pickable = orderedTree(cats).filter((c) => !isInbox(c))
  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const editingTask = taskPanelId ? scheduled.find((t) => t.id === taskPanelId) : null

  const grid = useWeekGrid({
    scrollRef,
    bodyRef,
    days,
    // Create → open the current event panel preset to the drawn slot (event;
    // the task/event toggle is C3). Click = 1h, drag = the exact span.
    onCreate: (startIso, endIso) =>
      setPanel({ mode: 'new', start: new Date(startIso), end: new Date(endIso) }),
    // Move / resize / re-day → write through the existing paths, by kind.
    onMove: (item, startIso, endIso) =>
      item.kind === 'event'
        ? onSaveEvent(item.id, { start_at: startIso, end_at: endIso })
        : onScheduleTask(item.id, startIso, endIso),
    // Drag a TASK off-grid → clear its scheduled time (it leaves the week and
    // survives in Today's lists until the C5 tray). Events snap back (no write).
    onUnschedule: (item) =>
      onUpdateTask(item.id, { scheduled_start: null, scheduled_end: null }),
    // Tap → open the existing editor (no preview step).
    onSelect: (item) =>
      item.kind === 'event'
        ? setPanel({ mode: 'edit', event: events.find((e) => e.id === item.id) })
        : setTaskPanelId(item.id),
  })

  return (
    <>
      <WeekGrid
        days={days}
        today={today}
        events={events}
        scheduled={scheduled}
        cats={cats}
        scrollRef={scrollRef}
        bodyRef={bodyRef}
        blockBind={grid.blockBind}
        backgroundBind={grid.backgroundBind}
        blockPreview={grid.blockPreview}
        createDraft={grid.createDraft}
        dragLabel={grid.dragLabel}
      />

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
    </>
  )
}
