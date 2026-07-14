import CategoryTag from '../CategoryTag'
import { dueStatus, formatDue } from '../../spine/logic/dueDate'
import './planningBoard.css'

// PlanningCard — one task card for board mode (P3). Face = title + category dot/tag
// + due date (overdue-tinted) + subtask count (x/N). NO priority, NO status pill
// (the column it sits in IS its status). Tapping opens the existing edit form.
// Sealed kit block; a small new card rather than bending TodayTaskRow (which shows
// priority). Drag is handled by the wrapper in PlanningColumn.
//
// Props: task, cat (its category row | null), inboxColor, progress ({done,total} |
//        null), onOpen.
export default function PlanningCard({ task, cat, inboxColor, progress, onOpen }) {
  const done = task.status === 'done'
  const tag = cat ? { name: cat.name, color: cat.color } : { name: 'Inbox', color: inboxColor }
  const overdue = !done && task.due_date && dueStatus(task.due_date) === 'overdue'

  return (
    <button className={'pl-card-face' + (done ? ' is-done' : '')} onClick={onOpen}>
      <span className="pl-card-title">{task.title}</span>
      <span className="pl-card-meta">
        <CategoryTag name={tag.name} color={tag.color} />
        {progress && <span className="pl-card-prog tnum">{progress.done}/{progress.total}</span>}
        {task.due_date && (
          <span className={'pl-card-due' + (overdue ? ' is-overdue' : '')}>{formatDue(task.due_date)}</span>
        )}
      </span>
    </button>
  )
}
