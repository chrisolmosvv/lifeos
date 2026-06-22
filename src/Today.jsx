import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { orderedTree, isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import TaskBlock from './TaskBlock'
import './today.css'

// The Today home — the front page. Two columns: "The Day" on the left (a
// Phase-4 placeholder until events exist) and the task blocks on the right,
// split by time bucket: Today and This Week. (Someday isn't shown here.)
// RLS makes every query owner-only; no schema change — the columns all exist.
export default function Today() {
  const [tasks, setTasks] = useState(null) // null = still loading
  const [cats, setCats] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [taskRes, catRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          'id, title, notes, status, completed_at, category_id, priority, time_bucket, created_at',
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

  // Run one write, surface any error plainly, then refresh. Returns true on ok.
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

  // Add a task into a given bucket (Today / This Week). status/source come from
  // the DB defaults; category starts empty (Inbox) — set it later in the panel.
  const onAdd = (bucket, title) =>
    run(supabase.from('tasks').insert({ title, time_bucket: bucket }))

  const onToggleDone = (task) =>
    run(
      supabase
        .from('tasks')
        .update({ status: task.status === 'done' ? 'open' : 'done' })
        .eq('id', task.id),
    )

  const onUpdate = (id, fields) =>
    run(supabase.from('tasks').update(fields).eq('id', id))

  const onToggleExpand = (id) =>
    setExpandedId((cur) => (cur === id ? null : id))

  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const pickable = orderedTree(cats).filter((c) => !isInbox(c))

  const all = tasks || []
  const todayTasks = all.filter((t) => t.time_bucket === 'Today')
  const weekTasks = all.filter((t) => t.time_bucket === 'This Week')

  const blockProps = {
    cats,
    inboxColor,
    pickable,
    expandedId,
    busy,
    onToggleExpand,
    onToggleDone,
    onUpdate,
    onAdd,
  }

  return (
    <div className="today">
      <section className="today-day">
        <h2 className="today-day-title">The Day</h2>
        <div className="today-day-body">
          <p className="today-day-lead">Your day’s timeline arrives with events.</p>
          <p className="today-day-sub">
            For now, here’s what you’re carrying — over on the right.
          </p>
        </div>
      </section>

      <div className="today-right">
        {tasks === null ? (
          <p className="tb-empty">Loading…</p>
        ) : (
          <>
            <TaskBlock
              title="Today"
              bucket="Today"
              emptyText="Nothing in Today yet — add the first thing below."
              tasks={todayTasks}
              {...blockProps}
            />
            <TaskBlock
              title="This Week"
              bucket="This Week"
              emptyText="Nothing planned this week yet."
              tasks={weekTasks}
              {...blockProps}
            />
          </>
        )}
        {error && <p className="today-error">{error}</p>}
      </div>
    </div>
  )
}

// Turn a Supabase/Postgres error into one plain sentence.
function friendly(error) {
  return error.message || 'Something went wrong.'
}
