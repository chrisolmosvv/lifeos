import './todayKit.css'

// StatusPill — a connected three-segment control on a task row: To do · In
// progress · Done. Tap a segment to set that state directly (no opening the
// task). "In progress" is an optional middle state — one tap To do → Done is
// fine. Tapping Done while already done is the UNDO (back to To do). Sealed kit
// block; it only calls `onSet(status)` — the parent owns the write.
//
// Statuses: 'open' (To do) · 'in_progress' · 'done'.
export default function StatusPill({ status, onSet, busy }) {
  const seg = (value, label) => {
    const on = status === value
    // The Done segment toggles back to "to do" when tapped while already done.
    const target = value === 'done' && on ? 'open' : value
    return (
      <button
        type="button"
        className={'tk-pseg' + (on ? ' is-on' : '') + (on && value === 'done' ? ' is-done' : '')}
        aria-pressed={on}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation()
          onSet(target)
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <div className="tk-pill" role="group" aria-label="Task status">
      {seg('open', 'To do')}
      {seg('in_progress', 'In progress')}
      {seg('done', 'Done')}
    </div>
  )
}
