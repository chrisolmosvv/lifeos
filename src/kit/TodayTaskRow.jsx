import CategoryTag from '../CategoryTag'
import { dueStatus, formatDue } from '../dueDate'
import './todayKit.css'

// TodayTaskRow — one read-only task line for the Today modules: title, a quiet
// priority kicker, the category dot+tag, and a trailing dateline/time or an
// "undated" tag. Tapping the row calls `onOpen` (the existing edit panel opens
// in Today — this row itself writes nothing). Sealed kit block.
//
// Props: task, cat (its category row or null), inboxColor, muted (bool),
//        badge ({ text, overdue? } | null), hideDue (bool), onOpen.
export default function TodayTaskRow({ task, cat, inboxColor, muted, badge, hideDue, onOpen }) {
  const done = task.status === 'done'
  const high = !done && task.priority === 'high'
  const tag = cat
    ? { name: cat.name, color: cat.color }
    : { name: 'Inbox', color: inboxColor }

  // The dateline: an explicit badge (a scheduled time, or "undated") wins;
  // otherwise show the due date — unless the module suppresses dates (next-7).
  const showDue = !badge && !hideDue && task.due_date
  const overdue = !done && dueStatus(task.due_date) === 'overdue'

  return (
    <button
      className={
        'tk-row' +
        (high ? ' is-high' : '') +
        (muted && !done ? ' is-muted' : '') +
        (done ? ' is-done' : '')
      }
      onClick={() => onOpen(task)}
    >
      <span className="tk-row-title">{task.title}</span>
      <span className="tk-row-meta">
        {high && <span className="tk-pri is-high">High</span>}
        {!done && task.priority === 'med' && <span className="tk-pri">Med</span>}
        <CategoryTag name={tag.name} color={tag.color} />
        {badge && (
          <span className={'tk-when' + (badge.overdue ? ' is-overdue' : '')}>
            {badge.text}
          </span>
        )}
        {showDue && (
          <span className={'tk-when' + (overdue ? ' is-overdue' : '')}>
            {formatDue(task.due_date)}
          </span>
        )}
      </span>
    </button>
  )
}
