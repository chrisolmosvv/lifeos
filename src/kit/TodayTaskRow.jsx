import CategoryTag from '../CategoryTag'
import StatusPill from './StatusPill'
import { dueStatus, formatDue } from '../dueDate'
import { resolveColor } from '../colorModel'
import { colorHex } from '../palette'
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
  progress, // { done, total } for a parent with subtasks
  expanded,
  onToggleExpand, // present → show an expand caret
  isSub, // a subtask row (indented, marked "↳ under …")
  subLabel, // the parent's title, for the "↳ under" marker
  catsById, // id → category row, for resolving the shaded branch colour (V2-1)
}) {
  const done = task.status === 'done'
  const high = !done && task.priority === 'high'
  // V2-1: the tag's dot uses the shared colour model (resolveColor) so a derived
  // sub-category shows the SAME shaded branch colour as its grid block. Top-level
  // / Inbox resolve to the same hex as before → pixel-identical.
  const tagName = cat ? cat.name : 'Inbox'
  const tagHex = cat ? resolveColor(cat, catsById) : colorHex(inboxColor)

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
        (done ? ' is-done' : '') +
        (isSub ? ' is-sub' : '')
      }
    >
      {onToggleExpand ? (
        <button className="tk-row-caret" onClick={onToggleExpand} aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '▾' : '▸'}
        </button>
      ) : isSub ? (
        <span className="tk-row-caret tk-row-tick">↳</span>
      ) : null}
      {onSetStatus && (
        <StatusPill status={task.status} busy={busy} onSet={onSetStatus} />
      )}
      <button className="tk-row-main" onClick={onOpen}>
        <span className="tk-row-title">{task.title}</span>
        <span className="tk-row-meta">
          {progress && <span className="tk-prog tnum">{progress.done}/{progress.total}</span>}
          {isSub && subLabel && <span className="tk-sub-under">under {subLabel}</span>}
          {high && <span className="tk-pri is-high">High</span>}
          {!done && task.priority === 'med' && <span className="tk-pri">Med</span>}
          <CategoryTag name={tagName} hex={tagHex} />
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
