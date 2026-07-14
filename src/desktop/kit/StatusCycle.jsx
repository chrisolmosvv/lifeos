import './todayRow.css'

// StatusCycle — the Today row's single status control. One tap target that
// CYCLES the status forward: To do → In progress → Done → (tap) → back to To do.
// It only calls `onSet(nextStatus)` — the caller owns the write (the same
// updateTask(id,{status}) path the old pill used), and the DB trigger still owns
// completed_at (Done stamps it; the wrap to To do nulls it). Row-only: the task
// form + subtask rows keep the 3-segment StatusPill.
//
// The look is a hairline-and-type mark: a state glyph + a word, ink/muted, never
// a status colour. State is read by TYPE — To do muted, In progress full ink,
// Done struck-through + greyed — not by colour. No box, fill, pill or corners.
const NEXT = { open: 'in_progress', in_progress: 'done', done: 'open' }
const LABEL = { open: 'To do', in_progress: 'In progress', done: 'Done' }

// The three marks as crisp small SVGs: an open ring, a half-filled ring, a
// filled dot. currentColor so they take the control's ink/muted state colour.
function Mark({ status }) {
  if (status === 'done') {
    return (
      <svg className="tk-stat-mark" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill="currentColor" />
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <svg className="tk-stat-mark" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 1.5 A4.5 4.5 0 0 1 6 10.5 Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className="tk-stat-mark" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function StatusCycle({ status, onSet, busy }) {
  const cur = NEXT[status] ? status : 'open'
  return (
    <button
      type="button"
      className={'tk-stat is-' + cur}
      aria-label={'Status: ' + LABEL[cur] + '. Tap to advance.'}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation()
        onSet(NEXT[cur])
      }}
    >
      <Mark status={cur} />
      <span className="tk-stat-label">{LABEL[cur]}</span>
    </button>
  )
}
