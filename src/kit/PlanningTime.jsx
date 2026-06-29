import { useState } from 'react'
import { buildPlanning, planDrop } from '../planningModel'
import { progressOf } from '../subtasks'
import TodayTaskRow from './TodayTaskRow'
import PlanningColumn from './PlanningColumn'

// PlanningTime — time mode of the Planning view (P1 render + P2 drag), extracted
// verbatim from Planning.jsx so the shell can host three modes under the ~250-line
// rule. Behaviour is unchanged: an Inbox side rail + four date-derived lanes; drag a
// card between lanes → `planDrop` computes the patch → the parent's existing task
// update writes → the re-read re-derives placement. Overdue is drag-FROM only; the
// rail is display-only. Sealed kit block; the parent owns the data + writes.
//
// Props: tasks, dispCat (task→cat row), inboxColor, byParent (for x/N), busy,
//        onUpdate(id, fields) (existing task-update path, returns an error msg | null),
//        onOpenTask(task), onError(msg).
const LANES = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'later', label: 'Later' },
]

export default function PlanningTime({ tasks, dispCat, inboxColor, byParent, busy, onUpdate, onOpenTask, onError }) {
  const [draggingId, setDraggingId] = useState(null)
  const lanes = buildPlanning(tasks, new Date())

  // Drop a dragged card on a lane: planDrop decides the patch (or null = no-op /
  // rejected, e.g. Overdue or the same lane). Write-then-reload via the EXISTING
  // task path — on failure nothing moves and the error line shows (no phantom).
  const handleDrop = async (lane) => {
    const id = draggingId
    setDraggingId(null)
    const t = (tasks || []).find((x) => x.id === id)
    if (!t) return
    const patch = planDrop(t, lane, new Date())
    if (!patch) return
    const msg = await onUpdate(id, patch)
    if (msg) onError(msg)
  }

  // One time-lane line — reuses Today's row (status pill + tap-to-edit, existing paths).
  const renderRow = (t) => (
    <TodayTaskRow
      key={t.id}
      task={t}
      cat={dispCat(t)}
      inboxColor={inboxColor}
      busy={busy}
      progress={progressOf(t.id, byParent)}
      onSetStatus={(status) => onUpdate(t.id, { status })}
      onOpen={() => onOpenTask(t)}
    />
  )

  return (
    <>
      <PlanningColumn
        tag="aside"
        className="pl-rail"
        label="Inbox"
        count={lanes.inbox.length}
        items={lanes.inbox}
        emptyText="Nothing waiting."
        renderRow={renderRow}
      />

      <div className="pl-lanes">
        {LANES.map((lane) => (
          <PlanningColumn
            key={lane.id}
            className={'pl-lane pl-lane-' + lane.id}
            label={lane.label}
            count={lanes[lane.id].length}
            items={lanes[lane.id]}
            emptyText="—"
            renderRow={renderRow}
            draggable
            draggingId={draggingId}
            onDragStartTask={(t) => setDraggingId(t.id)}
            onDragEndTask={() => setDraggingId(null)}
            dropLane={lane.id === 'overdue' ? undefined : lane.id}
            onDropTask={handleDrop}
          />
        ))}
      </div>
    </>
  )
}
