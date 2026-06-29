import StatusPill from './StatusPill'
import SubtaskList from './SubtaskList'

// The type-specific fields of the shared ItemForm (Phase 7, C3; Today V2 Piece 3a:
// progressive disclosure). Rendered TWICE by ItemForm via `slot`:
//   slot='core' — the always-visible fields (task: Due; event: All-day + Start/End)
//   slot='more' — the fields behind the "more" expander, in spec order
//     task : Scheduled time · Priority · Subtasks · Notes · Status
//     event: Location · Notes · Repeat*
// Same fields, same inputs, same setters as before — ONLY their grouping changed,
// so WHAT SAVES is untouched (save + validation live in ItemForm). The two *-marked
// controls are visible-but-DISABLED placeholders (Repeat = T10). Pure presentation —
// all state lives in ItemForm and arrives via the prop groups.
const PRIORITIES = [
  { id: null, label: 'None' },
  { id: 'low', label: 'Low' },
  { id: 'med', label: 'Med' },
  { id: 'high', label: 'High' },
]

// The Notes field — lives under "more" for both kinds (spec order). State in ItemForm.
function NotesField({ notes, setNotes }) {
  return (
    <textarea
      className="tk-form-notes"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Notes (optional)"
      aria-label="Notes"
      rows={2}
    />
  )
}

export default function ItemTypeFields({ k, slot, isSubtask, create, busy, task, event, subtask, notes }) {
  const isCore = slot === 'core'

  if (k === 'task') {
    const { status, setStatus, priority, setPriority, due, setDue, schStart, setSchStart, schEnd, setSchEnd } = task
    if (isCore) {
      return (
        <label className="tk-form-field">
          <span className="tk-form-fieldlabel">Due date</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
      )
    }
    return (
      <>
        <div className="tk-form-field">
          <span className="tk-form-fieldlabel">Schedule (optional)</span>
          <div className="tk-form-times">
            <input type="datetime-local" value={schStart} onChange={(e) => setSchStart(e.target.value)} aria-label="Scheduled start" />
            <input type="datetime-local" value={schEnd} onChange={(e) => setSchEnd(e.target.value)} aria-label="Scheduled end" />
          </div>
        </div>
        {!isSubtask && (
          <div className="tk-form-field">
            <span className="tk-form-fieldlabel">Priority</span>
            <div className="tk-form-prios">
              {PRIORITIES.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={'tk-form-prio' + ((priority ?? null) === p.id ? ' is-on' : '')}
                  onClick={() => setPriority(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isSubtask && !create && subtask.onSubtask && (
          <SubtaskList
            subtasks={subtask.subtasks || []}
            busy={busy}
            onAdd={subtask.onSubtask.add}
            onUpdate={subtask.onSubtask.update}
            onSetStatus={subtask.onSubtask.setStatus}
            onRemove={subtask.onSubtask.remove}
          />
        )}
        <NotesField {...notes} />
        <div className="tk-form-field">
          <span className="tk-form-fieldlabel">Status</span>
          <StatusPill status={status} onSet={setStatus} />
        </div>
      </>
    )
  }

  const {
    allDay, setAllDay, startAt, setStartAt, endAt, setEndAt,
    startDate, setStartDate, endDate, setEndDate, location, setLocation,
  } = event
  if (isCore) {
    return (
      <>
        {/* All-day (C7) — live. On: the item moves to the band; date-only fields. */}
        <div className="tk-form-field">
          <span className="tk-form-fieldlabel">All-day</span>
          <label className="tk-form-allday">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            <span>{allDay ? 'All-day event' : 'Timed event'}</span>
          </label>
        </div>
        {allDay ? (
          <div className="tk-form-field">
            <span className="tk-form-fieldlabel">Dates (start / end)</span>
            <div className="tk-form-times">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Start date" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="End date" />
            </div>
          </div>
        ) : (
          <div className="tk-form-field">
            <span className="tk-form-fieldlabel">Start / End</span>
            <div className="tk-form-times">
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} aria-label="Start" />
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} aria-label="End" />
            </div>
          </div>
        )}
      </>
    )
  }
  return (
    <>
      <label className="tk-form-field">
        <span className="tk-form-fieldlabel">Location</span>
        <input className="tk-form-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
      </label>
      <NotesField {...notes} />
      {/* Repeat — DISABLED placeholder; recurrence is its own later piece (T10). */}
      <label className="tk-form-field tk-form-soonrow">
        <span className="tk-form-fieldlabel">Repeat</span>
        <select className="tk-form-select" disabled aria-disabled="true">
          <option>Does not repeat</option>
        </select>
        <span className="tk-form-soon">coming soon</span>
      </label>
    </>
  )
}
