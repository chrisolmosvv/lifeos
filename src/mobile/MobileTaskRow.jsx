// One task row in the mobile task sheet. Category dot + title + meta + status pill.
// Tap on row body is INERT in Phase 2 (edit is Phase 3). Status cycle is the one
// write this screen does.

import { resolveColor } from '../spine/logic/colorModel'
import { colorHex, INBOX_COLOR } from '../spine/logic/palette'
import { formatDue, dueStatus } from '../spine/logic/dueDate'
import MobileStatusCycle from './MobileStatusCycle'

export default function MobileTaskRow({
  task, cat, catById, inboxColor, busy,
  onSetStatus, progress, isSub, subLabel, badge,
}) {
  const done = task.status === 'done'
  const hex = cat ? resolveColor(cat, catById) : colorHex(inboxColor || INBOX_COLOR)
  const overdue = !done && task.due_date && dueStatus(task.due_date) === 'overdue'

  return (
    <div className={'m-task-row' + (done ? ' m-task-row--done' : '')}>
      <span className="m-task-dot" style={{ background: hex }} />
      <div className="m-task-body">
        <span className="m-task-title">{task.title}</span>
        <span className="m-task-meta">
          {isSub && subLabel && <span>↳ under {subLabel}</span>}
          {!isSub && progress && <span className="tnum">{progress.done}/{progress.total} · </span>}
          {!isSub && <span>{cat ? cat.name : 'Inbox'}</span>}
          {badge && <span className="m-task-badge"> · {badge}</span>}
          {!badge && task.due_date && (
            <span className={overdue ? 'm-task-overdue' : ''}> · {formatDue(task.due_date)}</span>
          )}
        </span>
      </div>
      {onSetStatus && (
        <MobileStatusCycle status={task.status} busy={busy} onSet={(s) => onSetStatus(task.id, s)} />
      )}
    </div>
  )
}
