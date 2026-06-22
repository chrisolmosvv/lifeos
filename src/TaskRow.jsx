import { useEffect, useState } from 'react'
import CategoryTag from './CategoryTag'
import './tasks.css'

// The three priority levels (plus a "None" to clear, handled separately).
const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'med', label: 'Med' },
  { id: 'high', label: 'High' },
]

// One task line: a tick to mark it done, the title + its quiet meta (priority
// kicker, category dot+tag, finish time), and — on tap — an inline panel to
// edit the title, notes, category and priority. Text fields save on blur;
// category and priority save on tap. Everything persists to existing columns.
export default function TaskRow({
  task,
  cats,
  inboxColor,
  pickable,
  expanded,
  busy,
  onToggleExpand,
  onToggleDone,
  onUpdate,
  scheduleBind,
}) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')

  // Keep the edit fields in step with the data when the list reloads.
  useEffect(() => setTitle(task.title), [task.title])
  useEffect(() => setNotes(task.notes || ''), [task.notes])

  const done = task.status === 'done'

  // Display category: its category, or Inbox when uncategorised (category_id is
  // null — the one and only way a task means "Inbox").
  const cat = task.category_id
    ? cats.find((c) => c.id === task.category_id)
    : null
  const tag = cat
    ? { name: cat.name, color: cat.color }
    : { name: 'Inbox', color: inboxColor }

  // Save helpers — only write when something actually changed. Title can't be
  // blanked (it's required), so an empty edit reverts to the saved title.
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

  return (
    <li className="tasks-item">
      <div className="tasks-row">
        <button
          className={'tasks-check' + (done ? ' is-done' : '')}
          onClick={() => onToggleDone(task)}
          disabled={busy}
          aria-label={done ? 'Reopen task' : 'Mark task done'}
          title={done ? 'Reopen' : 'Mark done'}
        >
          {done ? '✓' : ''}
        </button>

        <button
          className="tasks-head"
          onClick={onToggleExpand}
          aria-expanded={expanded}
        >
          <span
            className={
              'tasks-text' +
              (done ? ' is-done' : '') +
              (!done && task.priority === 'high' ? ' is-high' : '')
            }
          >
            {task.title}
          </span>
          <span className="tasks-meta">
            {!done && task.priority === 'high' && (
              <span className="tasks-pri is-high">High</span>
            )}
            {!done && task.priority === 'med' && (
              <span className="tasks-pri is-med">Med</span>
            )}
            <CategoryTag name={tag.name} color={tag.color} />
            {done && task.completed_at && (
              <span className="tasks-doneat tnum">
                Done · {formatDoneAt(task.completed_at)}
              </span>
            )}
            {task.scheduled_start && (
              <span className="tasks-scheduled">scheduled</span>
            )}
          </span>
        </button>

        {scheduleBind && (
          <span
            className="tasks-grip"
            title="Drag onto The Day to schedule"
            aria-label="Drag to schedule"
            {...scheduleBind(task)}
          >
            ⠿
          </span>
        )}
      </div>

      {expanded && (
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
                  className={
                    'tasks-chip' + (task.category_id === c.id ? ' is-on' : '')
                  }
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
                  className={
                    'tasks-prio' + (task.priority === p.id ? ' is-on' : '')
                  }
                  disabled={busy}
                  onClick={() => setPriority(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

// A quiet "finished at" stamp, e.g. "Jun 22, 14:45". Local time.
function formatDoneAt(iso) {
  const d = new Date(iso)
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const p = (n) => String(n).padStart(2, '0')
  return `${MO[d.getMonth()]} ${d.getDate()}, ${p(d.getHours())}:${p(d.getMinutes())}`
}
