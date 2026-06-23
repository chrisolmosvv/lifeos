import StatusPill from './StatusPill'
import SubtaskList from './SubtaskList'

// The type-specific fields of the shared ItemForm (Phase 7, C3), split out so the
// form shell stays small. Renders the TASK fields (status / priority / due /
// schedule / subtasks) or the EVENT fields (all-day* / start-end / location /
// repeat*). The two *-marked controls are visible-but-DISABLED placeholders so the
// form shows its true final shape: all-day needs the C6 schema flag, repeat is T10.
// Pure presentation — all state lives in ItemForm and arrives via the prop groups.
const PRIORITIES = [
  { id: null, label: 'None' },
  { id: 'low', label: 'Low' },
  { id: 'med', label: 'Med' },
  { id: 'high', label: 'High' },
]

export default function ItemTypeFields({ k, isSubtask, create, busy, task, event, subtask }) {
  if (k === 'task') {
    const { status, setStatus, priority, setPriority, due, setDue, schStart, setSchStart, schEnd, setSchEnd } = task
    return (
      <>
        <div className="tk-form-field">
          <span className="tk-form-fieldlabel">Status</span>
          <StatusPill status={status} onSet={setStatus} />
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
        <label className="tk-form-field">
          <span className="tk-form-fieldlabel">Due date</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <div className="tk-form-field">
          <span className="tk-form-fieldlabel">Schedule (optional)</span>
          <div className="tk-form-times">
            <input type="datetime-local" value={schStart} onChange={(e) => setSchStart(e.target.value)} aria-label="Scheduled start" />
            <input type="datetime-local" value={schEnd} onChange={(e) => setSchEnd(e.target.value)} aria-label="Scheduled end" />
          </div>
        </div>
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
      </>
    )
  }

  const { startAt, setStartAt, endAt, setEndAt, location, setLocation } = event
  return (
    <>
      {/* All-day — DISABLED placeholder; real all-day needs the C6 schema flag. */}
      <label className="tk-form-field tk-form-soonrow">
        <span className="tk-form-fieldlabel">All-day</span>
        <input type="checkbox" disabled aria-disabled="true" />
        <span className="tk-form-soon">coming with all-day</span>
      </label>
      <div className="tk-form-field">
        <span className="tk-form-fieldlabel">Start / End</span>
        <div className="tk-form-times">
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} aria-label="Start" />
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} aria-label="End" />
        </div>
      </div>
      <label className="tk-form-field">
        <span className="tk-form-fieldlabel">Location</span>
        <input className="tk-form-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
      </label>
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
