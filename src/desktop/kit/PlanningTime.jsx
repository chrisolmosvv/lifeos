import { useRef, useState } from 'react'
import { buildPlanning, planDrop } from '../planningModel'
import { progressOf } from '../subtasks'
import TodayTaskRow from './TodayTaskRow'
import PlanningColumn from './PlanningColumn'
import TriagePopover from './TriagePopover'

// PlanningTime — time mode of the Planning view (P1 render + P2 drag; P5 makes the
// Inbox rail interactive). An Inbox side rail + four date-derived lanes; dragging a
// card between lanes → `planDrop` → the parent's existing update → the re-read
// re-derives placement. P5: the RAIL is now a drag SOURCE (drop onto a lane = the
// same handleDrop/planDrop, which dates a dump → it leaves the rail) and tapping a
// rail card opens TriagePopover (one-tap date chips + CategoryPicker). The two triage
// axes stay independent (date writes due_date, category writes category_id). Overdue
// is drag-FROM only. Sealed kit block; the parent owns the data + writes.
//
// Props: tasks, cats (for the triage category picker), catsById, dispCat (task→cat row),
//        inboxColor, byParent (for x/N), busy, onUpdate(id, fields) (existing
//        task-update path, returns an error msg | null), onOpenTask(task), onError(msg).
const LANES = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'later', label: 'Later' },
]

export default function PlanningTime({ tasks, cats, catsById, dispCat, inboxColor, byParent, busy, onUpdate, onOpenTask, onError }) {
  const [draggingId, setDraggingId] = useState(null)
  const [triage, setTriage] = useState(null) // the tapped rail task | null
  const triageAnchor = useRef(null) // the rail card element the popover points at
  const lanes = buildPlanning(tasks, new Date())

  // --- Rail triage (P5) ---------------------------------------------------
  const closeTriage = () => setTriage(null)
  // Date axis: reuse planDrop (a rail card is undated → it sets ONLY due_date).
  const triageDate = async (lane) => {
    const patch = planDrop(triage, lane, new Date())
    closeTriage()
    if (!patch) return
    const msg = await onUpdate(triage.id, patch)
    if (msg) onError(msg)
  }
  // Category axis: write ONLY category_id (no-op if unchanged).
  const triageCategory = async (catId) => {
    const t = triage
    closeTriage()
    if (!t || (catId ?? null) === (t.category_id ?? null)) return
    const msg = await onUpdate(t.id, { category_id: catId })
    if (msg) onError(msg)
  }
  // A rail card tap opens triage, anchored to the tapped element.
  const openTriage = (t, el) => {
    triageAnchor.current = el
    setTriage(t)
  }
  const renderRailRow = (t) => (
    <div key={t.id} onClickCapture={(e) => (triageAnchor.current = e.currentTarget)}>
      <TodayTaskRow
        task={t}
        cat={dispCat(t)}
        catsById={catsById}
        inboxColor={inboxColor}
        busy={busy}
        progress={progressOf(t.id, byParent)}
        onOpen={() => openTriage(t, triageAnchor.current)}
      />
    </div>
  )

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
      catsById={catsById}
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
        renderRow={renderRailRow}
        draggable
        draggingId={draggingId}
        onDragStartTask={(t) => setDraggingId(t.id)}
        onDragEndTask={() => setDraggingId(null)}
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

      {triage && (
        <TriagePopover
          task={triage}
          anchorRef={triageAnchor}
          cats={cats}
          inboxColor={inboxColor}
          onSetDate={triageDate}
          onSetCategory={triageCategory}
          onOpenEditor={() => {
            const t = triage
            closeTriage()
            onOpenTask(t)
          }}
          onClose={closeTriage}
        />
      )}
    </>
  )
}
