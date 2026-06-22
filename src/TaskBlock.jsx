import { useState } from 'react'
import TaskRow from './TaskRow'

// One front-page block — a Fraunces headline over a calm list of its tasks,
// with a quiet "+ Add a task" at the foot. A task added here lands in this
// block's time bucket. Rows reuse TaskRow (tick, dot+tag, priority, edit panel).
export default function TaskBlock({
  title,
  bucket,
  emptyText,
  tasks,
  cats,
  inboxColor,
  pickable,
  expandedId,
  busy,
  onToggleExpand,
  onToggleDone,
  onUpdate,
  onAdd,
}) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')

  async function submit(e) {
    e.preventDefault()
    const t = value.trim()
    if (!t || busy) return
    const ok = await onAdd(bucket, t)
    if (ok) setValue('') // keep the box open for quick successive adds
  }

  return (
    <section className="tb">
      <h2 className="tb-title">{title}</h2>

      {tasks.length === 0 ? (
        <p className="tb-empty">{emptyText}</p>
      ) : (
        <ul className="tasks-list">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              cats={cats}
              inboxColor={inboxColor}
              pickable={pickable}
              expanded={expandedId === task.id}
              busy={busy}
              onToggleExpand={() => onToggleExpand(task.id)}
              onToggleDone={onToggleDone}
              onUpdate={onUpdate}
            />
          ))}
        </ul>
      )}

      <div className="tb-add">
        {adding ? (
          <form className="tb-addform" onSubmit={submit}>
            <input
              className="tasks-input"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
              placeholder="New task"
              aria-label={'New task in ' + title}
            />
            <button className="tb-addbtn" type="submit" disabled={busy}>
              Add
            </button>
          </form>
        ) : (
          <button className="tb-addlink" onClick={() => setAdding(true)}>
            + Add a task
          </button>
        )}
      </div>
    </section>
  )
}
