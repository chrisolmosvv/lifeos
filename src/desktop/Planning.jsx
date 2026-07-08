import { useEffect, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'
import { isInbox } from '../spine/logic/categoryTree'
import { INBOX_COLOR } from '../spine/logic/palette'
import { indexTasks, progressOf, displayCatId, parentTitle } from '../spine/logic/subtasks'
import { archiveTask, unarchiveBatch, activeOnly } from './archive'
import { seriesFormHandlers } from './recur/seriesForm'
import PlanningModes from './kit/PlanningModes'
import PlanningTime from './kit/PlanningTime'
import PlanningBoard from './kit/PlanningBoard'
import PlanningCategory from './kit/PlanningCategory'
import ItemForm from './kit/ItemForm'
import Toast from './kit/Toast'
import './kit/planning.css'

// Planning — the planning view (Phase 7 / T-track). A thin SHELL: it holds the data
// + the writes + the shared form, and renders one of three mode bodies behind the
// toggle — TIME (P1/P2, `PlanningTime`), BOARD (P3, `PlanningBoard`), CATEGORY (P4,
// `PlanningCategory`). Each mode is DERIVED at render (compute-on-read); every write
// goes through the existing task-update / insert paths. No schema.
export default function Planning({ onBack }) {
  const [tasks, setTasks] = useState(null)
  const [cats, setCats] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('time')
  const [form, setForm] = useState(null)
  const [toast, setToast] = useState(null)

  async function load() {
    const [taskRes, catRes] = await Promise.all([
      activeOnly(
        supabase
          .from('tasks')
          .select(
            'id, title, notes, status, completed_at, category_id, priority, time_bucket, due_date, parent_task_id, scheduled_start, scheduled_end, created_at, series_id, series_detached',
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
  // Create / edit / delete a repeat, wired one way for every host (T10).
  const series = seriesFormHandlers({ form, setForm, reload: load, setToast })
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

  const openTask = (t) => setForm({ kind: 'task', item: t, create: false })
  // Category mode's per-group "+ add": the existing insert path, prefilled with the
  // group's category + 'This Week' (matching All Tasks). catId null = Inbox.
  const openAdd = (catId) =>
    setForm({ kind: 'task', create: true, item: { category_id: catId, time_bucket: 'This Week' } })

  return (
    <div className="pl">
      <div className="pl-top">
        <button className="pl-back" onClick={onBack}>‹ Back to Today</button>
        <PlanningModes mode={mode} onSelect={setMode} liveModes={['time', 'board', 'category']} />
      </div>

      <h2 className="pl-title">Planning</h2>

      <div className={'pl-body' + (mode === 'board' ? ' is-board' : '') + (mode === 'category' ? ' is-cat' : '')}>
        {tasks === null ? (
          <p className="pl-empty">Loading…</p>
        ) : mode === 'board' ? (
          <PlanningBoard
            tasks={tasks}
            cats={cats}
            dispCat={dispCat}
            inboxColor={inboxColor}
            byParent={byParent}
            progressOf={progressOf}
            today={new Date()}
            onSetStatus={(id, status) => updateTask(id, { status })}
            onOpenTask={openTask}
          />
        ) : mode === 'category' ? (
          <PlanningCategory
            tasks={tasks}
            cats={cats}
            catsById={catById}
            dispCat={dispCat}
            inboxColor={inboxColor}
            byParent={byParent}
            busy={busy}
            onUpdate={updateTask}
            onOpenTask={openTask}
            onAdd={openAdd}
          />
        ) : (
          <PlanningTime
            tasks={tasks}
            cats={cats}
            catsById={catById}
            dispCat={dispCat}
            inboxColor={inboxColor}
            byParent={byParent}
            busy={busy}
            onUpdate={updateTask}
            onOpenTask={openTask}
            onError={setError}
          />
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
          onSaveSeries={series.onSaveSeries}
          onSaveSeriesEdit={series.onSaveSeriesEdit}
          onDeleteSeries={series.onDeleteSeries}
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
