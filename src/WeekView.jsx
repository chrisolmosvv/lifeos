import { useState } from 'react'
import { orderedTree, isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { useWeekData } from './useWeekData'
import WeekGrid from './kit/WeekGrid'
import EventPanel from './EventPanel'
import TaskPanel from './TaskPanel'

// One week's data + the PRESERVED edit panels (Phase 7, C1). This is mounted with
// a `key` per week (see CalendarWeek) so navigating weeks remounts it and
// useWeekData re-loads for the new range — the shared data hook is left untouched.
// Display only: tapping a block opens the EXISTING event/task editor (so view /
// edit / delete keep working). Click-to-create and drag/resize return in C2.
export default function WeekView({ days, today }) {
  const { events, scheduled, cats, busy, onSaveEvent, onDeleteEvent, onUpdateTask } =
    useWeekData(days)
  const [panel, setPanel] = useState(null) // { event } in edit mode
  const [taskPanelId, setTaskPanelId] = useState(null)

  const pickable = orderedTree(cats).filter((c) => !isInbox(c))
  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const editingTask = taskPanelId ? scheduled.find((t) => t.id === taskPanelId) : null

  return (
    <>
      <WeekGrid
        days={days}
        today={today}
        events={events}
        scheduled={scheduled}
        cats={cats}
        onOpenEvent={(id) => {
          const e = events.find((x) => x.id === id)
          if (e) setPanel({ event: e })
        }}
        onOpenTask={(id) => setTaskPanelId(id)}
      />

      {panel && (
        <EventPanel
          mode="edit"
          event={panel.event}
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
