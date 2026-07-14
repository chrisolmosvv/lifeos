import { useState } from 'react'
import { isInbox, descendantIds } from '../../spine/logic/categoryTree'
import { buildBoard } from '../planningModel'
import PlanningColumn from './PlanningColumn'
import PlanningCard from './PlanningCard'
import './planningBoard.css'

// PlanningBoard — board mode (P3): a kanban by STATUS. Three columns — To do
// ('open') / In progress ('in_progress') / Done ('done') — of top-level task cards.
// Drag a card to a column → set status via the parent's existing write path (the
// same one the status pill uses; the DB trigger handles completed_at). Cards are
// derived from status at render (compute-on-read). A calm filter (category subtree +
// time-lane, same laneOf vocabulary as time mode) narrows what shows. Done shows all
// done, newest first, scrolling internally. Reuses PlanningColumn's draggable cards
// + drop target. Tasks only (events have no status). Sealed kit block.
//
// Props: tasks (top-level + subtasks, all statuses), cats, dispCat (task→cat row),
//        inboxColor, byParent (for x/N), progressOf, today, busy,
//        onSetStatus(id, status), onOpenTask(task).
const COLS = [
  { id: 'open', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
]

export default function PlanningBoard({
  tasks,
  cats,
  dispCat,
  inboxColor,
  byParent,
  progressOf,
  today,
  onSetStatus,
  onOpenTask,
}) {
  const [catFilter, setCatFilter] = useState('') // '' all · '__inbox__' · a category id
  const [timeFilter, setTimeFilter] = useState('') // '' all · a lane id
  const [draggingId, setDraggingId] = useState(null)

  // Translate the category select into the Set of category_ids to keep.
  let catIds = null
  if (catFilter === '__inbox__') catIds = new Set([null])
  else if (catFilter) catIds = new Set([catFilter, ...descendantIds(cats, catFilter)])

  const cols = buildBoard(tasks, today, { catIds, lane: timeFilter || null })

  const handleDrop = (status) => {
    const id = draggingId
    setDraggingId(null)
    const t = (tasks || []).find((x) => x.id === id)
    if (!t || t.status === status) return // off-board or same column → no-op
    onSetStatus(id, status)
  }

  const renderCard = (t) => (
    <PlanningCard
      key={t.id}
      task={t}
      cat={dispCat(t)}
      inboxColor={inboxColor}
      progress={progressOf(t.id, byParent)}
      onOpen={() => onOpenTask(t)}
    />
  )

  return (
    <div className="pl-board">
      <div className="pl-filters">
        <select className="pl-filter" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">All categories</option>
          <option value="__inbox__">Inbox</option>
          {cats
            .filter((c) => !isInbox(c))
            .map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
        </select>
        <select className="pl-filter" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
          <option value="">All time</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="thisWeek">This week</option>
          <option value="later">Later</option>
        </select>
      </div>

      <div className="pl-board-cols">
        {COLS.map((c) => (
          <PlanningColumn
            key={c.id}
            className={'pl-bcol pl-bcol-' + c.id}
            label={c.label}
            count={cols[c.id].length}
            items={cols[c.id]}
            emptyText="—"
            renderRow={renderCard}
            draggable
            draggingId={draggingId}
            onDragStartTask={(t) => setDraggingId(t.id)}
            onDragEndTask={() => setDraggingId(null)}
            dropLane={c.id}
            onDropTask={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}
