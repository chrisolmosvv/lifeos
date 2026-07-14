import CategoryTag from '../CategoryTag'
import StatusCycle from './StatusCycle'
import { dueStatus, formatDue } from '../../spine/logic/dueDate'
import { resolveColor } from '../../spine/logic/colorModel'
import { colorHex } from '../../spine/logic/palette'
import { useFocusTotals } from '../focus/focusTotalsContext'
import { formatDurationShort } from '../focus/focusFormat'
import './taskRowShared.css'
import './todayRow.css'

// TodayRow — the converged task line for BOTH Today modules (Tasks Today + the
// next 7 days), so the two read as one identical row. Today-ONLY: the Planning
// screen keeps the older TodayTaskRow untouched.
//
// Fixed columns, left → right, so every row lines up across both modules:
//   [drag grip] [expand caret] [ TITLE over the category/focus meta line ]
//   [ ▶ ] [ status ] [ due ]
// - Title leads (Fraunces); the category dot+tag and the "· 2h 15m" focus tag sit
//   quietly underneath on the meta line (no-focus rows stay clean).
// - ▶ reuses the Focus start path (the caller wires requestFocus → Setup, and the
//   running-session nudge); it's a quiet ink glyph, never the accent.
// - The single status control CYCLES To do → In progress → Done → To do, writing
//   through the caller's existing onSetStatus (status) path.
// - Due sits at the far right, right-aligned + tabular; the "undated"/scheduled
//   badge shares that column. Priority does NOT render here (data + form only).
// Sealed kit block; every write goes through the caller.
export default function TodayRow({
  task,
  cat,
  inboxColor,
  muted,
  badge,
  hideDue,
  busy,
  onOpen,
  onSetStatus,
  onPlay,
  trayBind,
  progress, // { done, total } for a parent with subtasks
  expanded,
  onToggleExpand, // present → show an expand caret
  isSub, // a subtask row (indented, marked "↳ under …")
  subLabel, // the parent's title, for the "↳ under" marker
  catsById, // id → category row, for resolving the shaded branch colour
}) {
  const done = task.status === 'done'
  // Per-task all-time focus, from the shared totals context. No focus → nothing.
  const focusSecs = useFocusTotals()?.get(task.id) || 0
  const tagName = cat ? cat.name : 'Inbox'
  const tagHex = cat ? resolveColor(cat, catsById) : colorHex(inboxColor)

  // The due column: an explicit badge (a scheduled time, or "undated") wins;
  // otherwise the due date — unless the module suppresses dates.
  const showDue = !badge && !hideDue && task.due_date
  const overdue = !done && dueStatus(task.due_date) === 'overdue'

  return (
    <div
      className={
        'tk2-row' +
        (muted && !done ? ' is-muted' : '') +
        (done ? ' is-done' : '') +
        (isSub ? ' is-sub' : '')
      }
    >
      <span className="tk2-grip-col">
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
      </span>
      {onToggleExpand ? (
        <button className="tk-row-caret" onClick={onToggleExpand} aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '▾' : '▸'}
        </button>
      ) : isSub ? (
        <span className="tk-row-caret tk-row-tick">↳</span>
      ) : (
        <span className="tk-row-caret" aria-hidden="true" />
      )}

      <button className="tk2-main" onClick={onOpen}>
        <span className="tk2-title">{task.title}</span>
        <span className="tk2-meta">
          {progress && <span className="tk-prog tnum">{progress.done}/{progress.total}</span>}
          {isSub && subLabel && <span className="tk-sub-under">under {subLabel}</span>}
          <CategoryTag name={tagName} hex={tagHex} />
          {focusSecs > 0 && <span className="tk-focus-tag tnum">· {formatDurationShort(focusSecs)}</span>}
        </span>
      </button>

      {onPlay && (
        <button type="button" className="tk2-play" onClick={onPlay} aria-label="Start a focus session">
          ▶
        </button>
      )}

      <span className="tk2-status">
        {onSetStatus && <StatusCycle status={task.status} busy={busy} onSet={onSetStatus} />}
      </span>

      <span className="tk2-due tnum">
        {badge && (
          <span className={'tk-when' + (badge.overdue ? ' is-overdue' : '')}>{badge.text}</span>
        )}
        {showDue && (
          <span className={'tk-when' + (overdue ? ' is-overdue' : '')}>{formatDue(task.due_date)}</span>
        )}
      </span>
    </div>
  )
}
