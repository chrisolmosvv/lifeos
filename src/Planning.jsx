import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { buildPlanning, planDrop } from './planningModel'
import { indexTasks, progressOf, displayCatId, parentTitle } from './subtasks'
import { archiveTask, unarchiveBatch, activeOnly } from './archive'
import TodayTaskRow from './kit/TodayTaskRow'
import PlanningColumn from './kit/PlanningColumn'
import PlanningModes from './kit/PlanningModes'
import ItemForm from './kit/ItemForm'
import Toast from './kit/Toast'
import './kit/planning.css'

// Planning — the planning view (Phase 7 / T-track). A NEW surface, built on the
// existing kit and reading through the existing task path. Time mode: a mode toggle
// (time live; board + category inert "soon" placeholders), an Inbox side rail, and
// four date-derived lanes. P2 makes the lanes a DRAG TARGET: drag a task between
// lanes → `planDrop` computes the due_date (+ the one Today-chip flip) → the existing
// task-update path writes → the re-read re-derives placement. Lanes stay derived;
// nothing is stored. No schema. (Overdue is drag-FROM only; the rail is display-only.)
const LANES = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'later', label: 'Later' },
]

export default function Planning({ onBack }) {
  const [tasks, setTasks] = useState(null)
  const [cats, setCats] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('time')
  const [form, setForm] = useState(null)
  const [toast, setToast] = useState(null)
  const [draggingId, setDraggingId] = useState(null)

  async function load() {
    const [taskRes, catRes] = await Promise.all([
      activeOnly(
        supabase
          .from('tasks')
          .select(
            'id, title, notes, status, completed_at, category_id, priority, time_bucket, due_date, parent_task_id, scheduled_start, scheduled_end, created_at',
          )
          .order('created_at', { ascending: true }),
      ),
      activeOnly(
        supabase
          .from('categories')
          .select('id, name, parent_id, color, sort_order, created_at')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
      ),
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
  const { byId, byParent } = indexTasks(tasks)
  const dispCat = (t) => {
    const cid = displayCatId(t, byId)
    return cid ? catById.get(cid) : null
  }
  const subtaskHandlers = (parent) => ({
    add: (titleText) =>
      writeTask(supabase.from('tasks').insert({ title: titleText, parent_task_id: parent.id, time_bucket: parent.time_bucket || 'This Week' })),
    update: (id, fields) => writeTask(supabase.from('tasks').update(fields).eq('id', id)),
    setStatus: (id, status) => writeTask(supabase.from('tasks').update({ status }).eq('id', id)),
    remove: async (id) => {
      const res = await archiveTask(id)
      if (res.error) setError(friendly(res.error))
      else await load()
    },
  })
  const formIsParent = form && !form.create && !form.item.parent_task_id
  const formSubtasks = formIsParent ? byParent.get(form.item.id) || [] : undefined
  const formOnSubtask = formIsParent ? subtaskHandlers(form.item) : undefined
  const formParentLabel =
    form && !form.create && form.item.parent_task_id ? parentTitle(form.item, byId) : undefined

  const lanes = buildPlanning(tasks, new Date())
  const openTask = (t) => setForm({ kind: 'task', item: t, create: false })

  // Drop a dragged card on a lane: planDrop decides the patch (or null = no-op /
  // rejected, e.g. Overdue or the same lane). Write-then-reload via the EXISTING
  // task path — on failure nothing moves and the error line shows (no phantom).
  const handleDrop = async (lane) => {
    const id = draggingId
    setDraggingId(null)
    const t = (tasks || []).find((x) => x.id === id)
    if (!t) return
    const patch = planDrop(t, lane, new Date())
    if (!patch) return
    const msg = await updateTask(id, patch)
    if (msg) setError(msg)
  }

  // One task line — reuses Today's row (status pill + tap-to-edit, existing paths).
  // A parent still shows its "x/N" progress; subtasks aren't expanded inline in P1
  // (tapping the row opens the form, which lists them).
  const renderRow = (t) => (
    <TodayTaskRow
      key={t.id}
      task={t}
      cat={dispCat(t)}
      inboxColor={inboxColor}
      busy={busy}
      progress={progressOf(t.id, byParent)}
      onSetStatus={(status) => updateTask(t.id, { status })}
      onOpen={() => openTask(t)}
    />
  )

  return (
    <div className="pl">
      <div className="pl-top">
        <button className="pl-back" onClick={onBack}>‹ Back to Today</button>
        <PlanningModes mode={mode} onSetTime={() => setMode('time')} />
      </div>

      <h2 className="pl-title">Planning</h2>

      <div className="pl-body">
        {tasks === null ? (
          <p className="pl-empty">Loading…</p>
        ) : (
          <>
            <PlanningColumn
              tag="aside"
              className="pl-rail"
              label="Inbox"
              count={lanes.inbox.length}
              items={lanes.inbox}
              emptyText="Nothing waiting."
              renderRow={renderRow}
            />

            <div className="pl-lanes">
              {LANES.map((lane) => (
                <PlanningColumn
                  key={lane.id}
                  className={'pl-lane pl-lane-' + lane.id}
                  label={lane.label}
                  count={lanes[lane.id].length}
                  items={lanes[lane.id]}
                  emptyText="—"
                  renderRow={renderRow}
                  draggable
                  draggingId={draggingId}
                  onDragStartTask={(t) => setDraggingId(t.id)}
                  onDragEndTask={() => setDraggingId(null)}
                  dropLane={lane.id === 'overdue' ? undefined : lane.id}
                  onDropTask={handleDrop}
                />
              ))}
            </div>
          </>
        )}
        {error && <p className="pl-error">{error}</p>}
      </div>

      {form && (
        <ItemForm
          kind="task"
          item={form.item}
          create={form.create}
          cats={cats}
          inboxColor={inboxColor}
          busy={busy}
          subtasks={formSubtasks}
          onSubtask={formOnSubtask}
          parentLabel={formParentLabel}
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
