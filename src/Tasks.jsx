import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { orderedTree, isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import CategoryTag from './CategoryTag'
import './tasks.css'

// Bare-bones tasks view (Phase 3, Piece 1) — NOT the real task manager (that's
// Piece 2). Just enough to prove the spine: a calm list of the owner's tasks,
// add one by typing a title (lands in Today by default), mark it done / reopen
// it (exercises status + completed_at), and optionally pick a category on add.
// RLS makes every query owner-only; the DB keeps completed_at honest.
export default function Tasks() {
  const [tasks, setTasks] = useState(null) // null = still loading
  const [cats, setCats] = useState([])
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('') // '' = Inbox (stored as null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [taskRes, catRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, completed_at, category_id, created_at')
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
  const onToggle = (task) =>
    run(
      supabase
        .from('tasks')
        .update({ status: task.status === 'done' ? 'open' : 'done' })
        .eq('id', task.id),
    )

  // The category mark for a task: its category, or Inbox when uncategorised
  // (category_id is null — the one and only way a task means "Inbox").
  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  function tagFor(task) {
    if (!task.category_id) return { name: 'Inbox', color: inboxColor }
    const cat = cats.find((c) => c.id === task.category_id)
    return cat
      ? { name: cat.name, color: cat.color }
      : { name: 'Inbox', color: inboxColor }
  }

  // Categories offered in the add picker, in tree order (Inbox handled by the
  // built-in default option, so it's filtered out here).
  const pickable = orderedTree(cats).filter((c) => !isInbox(c))

  return (
    <div className="tasks">
      <div className="tasks-inner">
        <h1 className="tasks-title">Tasks</h1>
        <p className="tasks-sub">
          Type a task and it lands in Today. Tick it off to mark it done; untick
          to reopen. Tasks with no category sit in Inbox.
        </p>

        {tasks === null ? (
          <p className="tasks-note">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="tasks-note">No tasks yet — add your first below.</p>
        ) : (
          <ul className="tasks-list">
            {tasks.map((task) => {
              const done = task.status === 'done'
              const tag = tagFor(task)
              return (
                <li className="tasks-item" key={task.id}>
                  <button
                    className={'tasks-check' + (done ? ' is-done' : '')}
                    onClick={() => onToggle(task)}
                    disabled={busy}
                    aria-label={done ? 'Reopen task' : 'Mark task done'}
                    title={done ? 'Reopen' : 'Mark done'}
                  >
                    {done ? '✓' : ''}
                  </button>
                  <div className="tasks-body">
                    <span className={'tasks-text' + (done ? ' is-done' : '')}>
                      {task.title}
                    </span>
                    <span className="tasks-meta">
                      <CategoryTag name={tag.name} color={tag.color} />
                      {done && task.completed_at && (
                        <span className="tasks-doneat tnum">
                          Done · {formatDoneAt(task.completed_at)}
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
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
                {'  '.repeat(c.depth) + c.name}
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

// A quiet "finished at" stamp, e.g. "Jun 22, 14:45". Local time.
function formatDoneAt(iso) {
  const d = new Date(iso)
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const p = (n) => String(n).padStart(2, '0')
  return `${MO[d.getMonth()]} ${d.getDate()}, ${p(d.getHours())}:${p(d.getMinutes())}`
}

// Turn a Supabase/Postgres error into one plain sentence.
function friendly(error) {
  return error.message || 'Something went wrong.'
}
