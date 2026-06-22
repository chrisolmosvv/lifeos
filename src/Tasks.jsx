import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { orderedTree, isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import TaskRow from './TaskRow'
import './tasks.css'

// The tasks view (Phase 3, Piece 2a). The list is calm by default; tapping a
// task opens an inline panel to edit its title, notes, category and priority
// (the expand-on-tap pattern from the Categories manager). Add-by-title still
// lands a task in Today. RLS makes every query owner-only; the DB keeps
// completed_at honest. No schema change this piece — every field already exists.
export default function Tasks() {
  const [tasks, setTasks] = useState(null) // null = still loading
  const [cats, setCats] = useState([])
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('') // '' = Inbox (stored as null)
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [taskRes, catRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          'id, title, notes, status, completed_at, category_id, priority, created_at',
        )
        .order('created_at', { ascending: true }),
      supabase
        .from('categories')
        .select('id, name, parent_id, color, sort_order, created_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ])
    if (taskRes.error) {
      setError(friendly(taskRes.error))
      setTasks([])
      return
    }
    setError('')
    setTasks(taskRes.data)
    setCats(catRes.data || [])
  }

  useEffect(() => {
    load()
  }, [])

  // Run one write, surface any error in plain words, then refresh the list.
  async function run(query) {
    setBusy(true)
    setError('')
    const { error } = await query
    setBusy(false)
    if (error) {
      setError(friendly(error))
      return false
    }
    await load()
    return true
  }

  async function handleAdd(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t || busy) return
    // Insert only title + category — time_bucket ('Today'), status ('open') and
    // source come from the DB defaults. category '' means Inbox, stored as null.
    const ok = await run(
      supabase.from('tasks').insert({
        title: t,
        category_id: categoryId || null,
      }),
    )
    if (ok) setTitle('')
  }

  // Flip a task done/open. The DB trigger stamps or clears completed_at — we
  // just send the new status.
  const onToggleDone = (task) =>
    run(
      supabase
        .from('tasks')
        .update({ status: task.status === 'done' ? 'open' : 'done' })
        .eq('id', task.id),
    )

  // Save edited fields (title / notes / category_id / priority) to existing
  // columns. Owner-only RLS and the existing policies are untouched.
  const onUpdate = (id, fields) =>
    run(supabase.from('tasks').update(fields).eq('id', id))

  // Inbox's colour (for the "Inbox" tag/chip) and the categories a task can be
  // filed under, in tree order (Inbox itself is offered separately as null).
  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const pickable = orderedTree(cats).filter((c) => !isInbox(c))

  return (
    <div className="tasks">
      <div className="tasks-inner">
        <h1 className="tasks-title">Tasks</h1>
        <p className="tasks-sub">
          Type a task and it lands in Today. Tap one to edit it; tick it off to
          mark it done. Tasks with no category sit in Inbox.
        </p>

        {tasks === null ? (
          <p className="tasks-note">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="tasks-note">No tasks yet — add your first below.</p>
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
                onToggleExpand={() =>
                  setExpandedId(expandedId === task.id ? null : task.id)
                }
                onToggleDone={onToggleDone}
                onUpdate={onUpdate}
              />
            ))}
          </ul>
        )}

        <form className="tasks-add" onSubmit={handleAdd}>
          <input
            className="tasks-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task"
            aria-label="New task title"
          />
          <select
            className="tasks-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Category"
          >
            <option value="">Inbox</option>
            {pickable.map((c) => (
              <option key={c.id} value={c.id}>
                {'  '.repeat(c.depth) + c.name}
              </option>
            ))}
          </select>
          <button className="tasks-btn" type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>

        {error && <p className="tasks-error">{error}</p>}
      </div>
    </div>
  )
}

// Turn a Supabase/Postgres error into one plain sentence.
function friendly(error) {
  return error.message || 'Something went wrong.'
}
