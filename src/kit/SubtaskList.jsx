import { useState } from 'react'
import StatusPill from './StatusPill'
import './todayForm.css'

// SubtaskList — the "Subtasks" section inside TodayForm (parent task edit only).
// Lists subtasks in creation order with a done/total count; each row has inline
// title · due · 3-state status · delete; plus "+ add subtask". One level only:
// this section is never rendered for a subtask's own form, so a subtask can't
// gain subtasks. Writes go through the parent's existing-path handlers.
export default function SubtaskList({ subtasks, busy, onAdd, onUpdate, onSetStatus, onRemove }) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')
  const done = subtasks.filter((s) => s.status === 'done').length

  async function add(e) {
    e.preventDefault()
    const t = val.trim()
    if (!t || busy) return
    await onAdd(t)
    setVal('')
  }

  return (
    <div className="tk-form-field">
      <span className="tk-form-fieldlabel">
        Subtasks{subtasks.length ? ` · ${done}/${subtasks.length}` : ''}
      </span>
      <div className="tk-subs">
        {subtasks.map((s) => (
          <SubRow key={s.id} sub={s} busy={busy} onUpdate={onUpdate} onSetStatus={onSetStatus} onRemove={onRemove} />
        ))}
      </div>
      {adding ? (
        <form className="tk-subadd" onSubmit={add}>
          <input
            value={val}
            autoFocus
            placeholder="New subtask"
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
            aria-label="New subtask"
          />
          <button type="submit" disabled={busy}>Add</button>
        </form>
      ) : (
        <button type="button" className="tk-subaddlink" onClick={() => setAdding(true)}>+ add subtask</button>
      )}
    </div>
  )
}

function SubRow({ sub, busy, onUpdate, onSetStatus, onRemove }) {
  const [title, setTitle] = useState(sub.title)
  const done = sub.status === 'done'
  function saveTitle() {
    const t = title.trim()
    if (t && t !== sub.title) onUpdate(sub.id, { title: t })
    else setTitle(sub.title)
  }
  return (
    <div className={'tk-sub' + (done ? ' is-done' : '')}>
      <StatusPill status={sub.status} busy={busy} onSet={(st) => onSetStatus(sub.id, st)} />
      <input
        className="tk-sub-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Subtask title"
      />
      <input
        className="tk-sub-due"
        type="date"
        value={sub.due_date || ''}
        onChange={(e) => onUpdate(sub.id, { due_date: e.target.value || null })}
        aria-label="Subtask due date"
      />
      <button type="button" className="tk-sub-del" onClick={() => onRemove(sub.id)} disabled={busy} aria-label="Delete subtask">×</button>
    </div>
  )
}
