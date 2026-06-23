import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import {
  inboxCount,
  subtreeCount,
  ownTasks,
  orderTasks,
  childrenOf,
} from './allTasksModel'
import { archiveTask, unarchiveBatch } from './archive'
import TodayTaskRow from './kit/TodayTaskRow'
import TodayForm from './kit/TodayForm'
import CategoryDrillRow from './kit/CategoryDrillRow'
import Toast from './kit/Toast'
import './kit/allTasksKit.css'

// All Tasks — the inventory screen (Phase 7, T11). A by-category drill-in over the
// whole task list. Reuses Today's task row (+ its 3-state status pill) and the
// TodayForm AS-IS; writes go only through the existing Supabase task paths. It does
// NOT create/rename/nest/delete categories (that's the Settings manager, T13).
const INBOX_NODE = { id: '__inbox__', name: 'Inbox' }

export default function AllTasks({ onBack }) {
  const [tasks, setTasks] = useState(null)
  const [cats, setCats] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [path, setPath] = useState([]) // drill path; [] = top level
  const [showDone, setShowDone] = useState(false)
  const [form, setForm] = useState(null)
  const [toast, setToast] = useState(null)

  async function load() {
    const [taskRes, catRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          'id, title, notes, status, completed_at, category_id, priority, time_bucket, due_date, parent_task_id, scheduled_start, scheduled_end, created_at',
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

  async function writeTask(query) {
    setBusy(true)
    const { error } = await query
    setBusy(false)
    if (error) return friendly(error)
    await load()
    return null
  }
  const updateTask = (id, fields) =>
    writeTask(supabase.from('tasks').update(fields).eq('id', id))

  async function handleSave(fields) {
    const { item, create } = form
    const msg = create
      ? await writeTask(supabase.from('tasks').insert(fields))
      : await writeTask(supabase.from('tasks').update(fields).eq('id', item.id))
    if (!msg) setForm(null)
    return msg
  }
  // Delete = ARCHIVE (a task + its subtasks as one batch); undo reverses the batch.
  async function handleDelete() {
    const { item } = form
    setForm(null)
    setBusy(true)
    const res = await archiveTask(item.id, item.title)
    setBusy(false)
    if (res.error) return setError(friendly(res.error))
    await load()
    setToast({
      text: 'Archived',
      onUndo: async () => {
        setToast(null)
        setBusy(true)
        const r = await unarchiveBatch(res.batchId)
        setBusy(false)
        if (r?.error) setError(friendly(r.error))
        else await load()
      },
    })
  }

  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const catById = new Map(cats.map((c) => [c.id, c]))

  const current = path.length ? path[path.length - 1] : null
  const isInboxView = current?.id === INBOX_NODE.id
  const currentCatId = current && !isInboxView ? current.id : null
  const title = current ? current.name : 'All tasks'

  // The task rows shown at the current level (none at the very top).
  let rows = []
  if (isInboxView) rows = orderTasks(ownTasks(tasks || [], null), showDone)
  else if (currentCatId) rows = orderTasks(ownTasks(tasks || [], currentCatId), showDone)

  // The drill rows shown at the current level.
  let drills = []
  if (path.length === 0) {
    drills = [
      { node: INBOX_NODE, color: inboxColor, count: inboxCount(tasks) },
      ...childrenOf(cats, null)
        .filter((c) => !isInbox(c))
        .map((c) => ({ node: { id: c.id, name: c.name }, color: c.color, count: subtreeCount(cats, tasks, c.id) })),
    ]
  } else if (currentCatId) {
    drills = childrenOf(cats, currentCatId).map((c) => ({
      node: { id: c.id, name: c.name },
      color: c.color,
      count: subtreeCount(cats, tasks, c.id),
    }))
  }

  const openAdd = () =>
    setForm({ kind: 'task', create: true, item: { category_id: currentCatId, time_bucket: 'This Week' } })

  const showEmpty =
    tasks !== null && path.length > 0 && rows.length === 0 && drills.length === 0

  return (
    <div className="at">
      <div className="at-top">
        <button className="at-back" onClick={onBack}>‹ Back to Today</button>
        <div className="at-crumbs">
          <button className={'at-crumb' + (path.length === 0 ? ' is-current' : '')} onClick={() => setPath([])}>
            All
          </button>
          {path.map((n, i) => (
            <button
              key={n.id}
              className={'at-crumb' + (i === path.length - 1 ? ' is-current' : '')}
              onClick={() => setPath(path.slice(0, i + 1))}
            >
              › {n.name}
            </button>
          ))}
        </div>
        <label className="at-showdone">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show done
        </label>
      </div>

      <h2 className="at-title">{title}</h2>

      <div className="at-body">
        {tasks === null ? (
          <p className="at-empty">Loading…</p>
        ) : (
          <>
            {rows.length > 0 && (
              <div>
                {rows.map((t) => (
                  <TodayTaskRow
                    key={t.id}
                    task={t}
                    cat={t.category_id ? catById.get(t.category_id) : null}
                    inboxColor={inboxColor}
                    busy={busy}
                    badge={t.due_date ? undefined : { text: 'undated' }}
                    onSetStatus={(status) => updateTask(t.id, { status })}
                    onOpen={() => setForm({ kind: 'task', item: t, create: false })}
                  />
                ))}
              </div>
            )}

            {drills.length > 0 && (
              <>
                {(rows.length > 0 || path.length > 0) && (
                  <span className="at-section-label">Categories</span>
                )}
                {drills.map((d) => (
                  <CategoryDrillRow
                    key={d.node.id}
                    name={d.node.name}
                    color={d.color}
                    count={d.count}
                    onClick={() => setPath([...path, d.node])}
                  />
                ))}
              </>
            )}

            {showEmpty && <p className="at-empty">Nothing filed here yet.</p>}
          </>
        )}
        {error && <p className="at-error">{error}</p>}
      </div>

      {/* + add — into the current category (Inbox at the top level). */}
      {tasks !== null && <button className="at-add" onClick={openAdd}>+ add a task</button>}

      {form && (
        <TodayForm
          kind="task"
          item={form.item}
          create={form.create}
          cats={cats}
          inboxColor={inboxColor}
          busy={busy}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setForm(null)}
        />
      )}
      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function friendly(error) {
  return error.message || 'Something went wrong.'
}
