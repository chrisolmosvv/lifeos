import { useEffect, useState } from 'react'
import CategoryTag from './CategoryTag'

// The Piece-2a task editor fields — title, notes, category, priority — extracted
// so they're shared by the list row (inline panel) and the calendar (a calm
// overlay). Saves inline: text on blur, category/priority on tap. Writes only to
// existing task columns; a scheduled task stays a task.
const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'med', label: 'Med' },
  { id: 'high', label: 'High' },
]

export default function TaskEditForm({ task, pickable, inboxColor, busy, onUpdate }) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [due, setDue] = useState(task.due_date || '')

  useEffect(() => setTitle(task.title), [task.title])
  useEffect(() => setNotes(task.notes || ''), [task.notes])
  useEffect(() => setDue(task.due_date || ''), [task.due_date])

  function saveTitle() {
    const t = title.trim()
    if (!t) return setTitle(task.title)
    if (t !== task.title) onUpdate(task.id, { title: t })
  }
  function saveNotes() {
    const n = notes.trim()
    if (n !== (task.notes || '')) onUpdate(task.id, { notes: n || null })
  }
  const setCategory = (id) => {
    if (id !== task.category_id) onUpdate(task.id, { category_id: id })
  }
  const setPriority = (p) => {
    if (p !== task.priority) onUpdate(task.id, { priority: p })
  }
  // A date deadline (not a scheduled time). Saving '' clears it back to null.
  function changeDue(v) {
    setDue(v)
    if ((v || null) !== (task.due_date || null)) {
      onUpdate(task.id, { due_date: v || null })
    }
  }

  return (
    <div className="tasks-panel">
      <input
        className="tasks-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Task title"
      />
      <textarea
        className="tasks-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Notes (optional)"
        aria-label="Notes"
        rows={2}
      />

      <div className="tasks-pick">
        <span className="tasks-picklabel">Category</span>
        <div className="tasks-chips">
          <button
            type="button"
            className={'tasks-chip' + (!task.category_id ? ' is-on' : '')}
            disabled={busy}
            onClick={() => setCategory(null)}
          >
            <CategoryTag name="Inbox" color={inboxColor} />
          </button>
          {pickable.map((c) => (
            <button
              type="button"
              key={c.id}
              className={'tasks-chip' + (task.category_id === c.id ? ' is-on' : '')}
              disabled={busy}
              onClick={() => setCategory(c.id)}
            >
              <CategoryTag name={c.name} color={c.color} />
            </button>
          ))}
        </div>
      </div>

      <div className="tasks-pick">
        <span className="tasks-picklabel">Priority</span>
        <div className="tasks-prios">
          <button
            type="button"
            className={'tasks-prio' + (!task.priority ? ' is-on' : '')}
            disabled={busy}
            onClick={() => setPriority(null)}
          >
            None
          </button>
          {PRIORITIES.map((p) => (
            <button
              type="button"
              key={p.id}
              className={'tasks-prio' + (task.priority === p.id ? ' is-on' : '')}
              disabled={busy}
              onClick={() => setPriority(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tasks-pick">
        <span className="tasks-picklabel">Due date</span>
        <div className="tasks-due-row">
          <input
            type="date"
            className="tasks-dateinput"
            value={due}
            disabled={busy}
            onChange={(e) => changeDue(e.target.value)}
            aria-label="Due date"
          />
          {due && (
            <button
              type="button"
              className="tasks-due-clear"
              disabled={busy}
              onClick={() => changeDue('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
