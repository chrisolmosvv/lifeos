import CategoryTag from '../CategoryTag'
import StatusPill from './StatusPill'
import { dueStatus, formatDue } from '../dueDate'
import './todayKit.css'

// TodayTaskRow — one task line for the Today modules: an optional status pill on
// the left (when onSetStatus is given — the "tasks today" module), then the
// title, a quiet priority kicker, the category dot+tag, and a trailing
// dateline/time or an "undated" tag. Tapping the title region calls `onOpen`
// (the existing edit panel). Sealed kit block; writes go through the caller.
//
// Props: task, cat (its category row or null), inboxColor, muted (bool),
//        badge ({ text, overdue? } | null), hideDue (bool), busy,
//        onOpen, onSetStatus ((status) => void) | undefined.
export default function TodayTaskRow({
  task,
  cat,
  inboxColor,
  muted,
  badge,
  hideDue,
  busy,
  onOpen,
  onSetStatus,
  trayBind,
}) {
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
    <div
      className={
        'tk-row' +
        (high ? ' is-high' : '') +
        (muted && !done ? ' is-muted' : '') +
        (done ? ' is-done' : '')
      }
    >
      {onSetStatus && (
        <StatusPill status={task.status} busy={busy} onSet={onSetStatus} />
      )}
      <button className="tk-row-main" onClick={onOpen}>
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
      {trayBind && !done && (
        <span
          className="tk-row-grip"
          title="Drag onto the day to schedule"
          aria-label="Drag to schedule"
          {...trayBind(task)}
        >
          ⠿
        </span>
      )}
    </div>
  )
}
