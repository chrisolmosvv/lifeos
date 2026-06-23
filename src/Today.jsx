import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { isSameDay } from './dateUtils'
import { buildToday } from './todayModel'
import DayGrid from './kit/DayGrid'
import ModuleHeader from './kit/ModuleHeader'
import TodayTaskRow from './kit/TodayTaskRow'
import TodayForm from './kit/TodayForm'
import Toast from './kit/Toast'
import './today.css'

// The Today home (Phase 7). The B layout — "the day" grid on the left, "tasks
// today" over "the next 7 days" on the right. T6 adds the full create/edit form
// (a Today-scoped sealed kit, SEPARATE from Calendar's shared panels), "+ add",
// delete with an undo toast, and the drill-in category picker. All writes go
// through the existing Supabase task/event paths; no schema change.
export default function Today() {
  const today = new Date()
  const [tasks, setTasks] = useState(null) // null = still loading
  const [cats, setCats] = useState([])
  const [events, setEvents] = useState([]) // today's events only
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null) // null | { kind, item, create }
  const [toast, setToast] = useState(null)

  async function load() {
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const [taskRes, catRes, evRes] = await Promise.all([
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
      supabase
        .from('events')
        .select('id, title, notes, start_at, end_at, location, category_id')
        .gte('start_at', dayStart.toISOString())
        .lt('start_at', dayEnd.toISOString())
        .order('start_at', { ascending: true }),
    ])
    if (taskRes.error) {
      setError(friendly(taskRes.error))
      setTasks([])
      return
    }
    setError('')
    setTasks(taskRes.data)
    setCats(catRes.data || [])
    setEvents(evRes.data || [])
  }

  useEffect(() => {
    load()
  }, [])

  // The existing write paths — the same Supabase insert/update/delete the app
  // already uses. A task helper and an event helper, each returns a plain
  // message on failure or null on success (after a reload).
  async function writeTask(query) {
    setBusy(true)
    const { error } = await query
    setBusy(false)
    if (error) return friendly(error)
    await load()
    return null
  }
  async function writeEvent(query) {
    setBusy(true)
    const { error } = await query
    setBusy(false)
    if (error) return friendlyEvent(error)
    await load()
    return null
  }
  // The status pill on a row writes through the same task path.
  const onUpdate = (id, fields) =>
    writeTask(supabase.from('tasks').update(fields).eq('id', id))

  // Save from the form (create or edit, task or event). Closes on success.
  async function handleSave(fields) {
    const { kind, item, create } = form
    let msg
    if (kind === 'task') {
      msg = create
        ? await writeTask(supabase.from('tasks').insert(fields))
        : await writeTask(supabase.from('tasks').update(fields).eq('id', item.id))
    } else {
      msg = create
        ? await writeEvent(supabase.from('events').insert(fields))
        : await writeEvent(supabase.from('events').update(fields).eq('id', item.id))
    }
    if (!msg) setForm(null)
    return msg
  }

  // Delete from the form → remove, then a "Deleted · Undo" toast that re-inserts
  // the exact row (same id + fields) on Undo.
  async function handleDelete() {
    const { kind, item } = form
    setForm(null)
    const table = kind === 'task' ? 'tasks' : 'events'
    setBusy(true)
    const { error } = await supabase.from(table).delete().eq('id', item.id)
    setBusy(false)
    if (error) return setError(friendly(error))
    await load()
    setToast({
      text: 'Deleted',
      onUndo: async () => {
        setToast(null)
        setBusy(true)
        const { error } = await supabase.from(table).insert(item)
        setBusy(false)
        if (error) setError(friendly(error))
        else await load()
      },
    })
  }

  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const catById = new Map(cats.map((c) => [c.id, c]))
  const catFor = (t) => (t.category_id ? catById.get(t.category_id) : null)

  const { tasksToday, next7, undated, total } = buildToday(tasks, today)
  const scheduledTasks = (tasks || []).filter(
    (t) => t.scheduled_start && isSameDay(new Date(t.scheduled_start), today),
  )
  const scheduledBadge = (t) =>
    t.scheduled_start && isSameDay(new Date(t.scheduled_start), today)
      ? { text: clock(t.scheduled_start) }
      : null

  // Openers — one tap opens the full form, prefilled.
  const openTask = (id) => {
    const task = (tasks || []).find((t) => t.id === id)
    if (task) setForm({ kind: 'task', item: task, create: false })
  }
  const openEvent = (id) => {
    const ev = events.find((e) => e.id === id)
    if (ev) setForm({ kind: 'event', item: ev, create: false })
  }
  const openAdd = () =>
    setForm({
      kind: 'task',
      item: { time_bucket: 'Today', due_date: localDateStr(today) },
      create: true,
    })

  return (
    <div className="today">
      <section className="today-day">
        <h2 className="today-day-title">The Day</h2>
        <DayGrid
          events={events}
          scheduledTasks={scheduledTasks}
          cats={cats}
          today={today}
          onOpenEvent={openEvent}
          onOpenTask={openTask}
        />
      </section>

      <div className="today-right">
        {tasks === null ? (
          <p className="today-loading">Loading…</p>
        ) : (
          <>
            <section className="today-mod today-mod-today">
              <ModuleHeader>Tasks today</ModuleHeader>
              <div className="today-mod-list">
                {tasksToday.length === 0 ? (
                  <p className="today-empty">Nothing due today — a calm one.</p>
                ) : (
                  tasksToday.map((t) => (
                    <TodayTaskRow
                      key={t.id}
                      task={t}
                      cat={catFor(t)}
                      inboxColor={inboxColor}
                      muted={!!scheduledBadge(t)}
                      badge={scheduledBadge(t)}
                      busy={busy}
                      onSetStatus={(status) => onUpdate(t.id, { status })}
                      onOpen={() => openTask(t.id)}
                    />
                  ))
                )}
              </div>
              <button className="today-add" onClick={openAdd}>+ add a task</button>
            </section>

            <section className="today-mod today-mod-week">
              <ModuleHeader>The next 7 days</ModuleHeader>
              <div className="today-mod-list">
                {next7.length === 0 && undated.length === 0 ? (
                  <p className="today-empty">The week ahead is open.</p>
                ) : (
                  <>
                    {next7.map((t) => (
                      <TodayTaskRow
                        key={t.id}
                        task={t}
                        cat={catFor(t)}
                        inboxColor={inboxColor}
                        hideDue
                        onOpen={() => openTask(t.id)}
                      />
                    ))}
                    {undated.map((t) => (
                      <TodayTaskRow
                        key={t.id}
                        task={t}
                        cat={catFor(t)}
                        inboxColor={inboxColor}
                        badge={{ text: 'undated' }}
                        onOpen={() => openTask(t.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            </section>

            <button className="today-alltasks" disabled aria-disabled="true">
              All tasks · {total} <span className="today-alltasks-arrow">→</span>
            </button>
          </>
        )}
        {error && <p className="today-error">{error}</p>}
      </div>

      {form && (
        <TodayForm
          kind={form.kind}
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
      {toast && (
        <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}

// "9:00" local 24-hour.
function clock(iso) {
  const d = new Date(iso)
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
}
// "YYYY-MM-DD" local (for the "+ add" prefill).
function localDateStr(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function friendly(error) {
  return error.message || 'Something went wrong.'
}
function friendlyEvent(error) {
  if (error.code === '23514')
    return 'That event ends before it starts — check the times.'
  return error.message || 'Something went wrong.'
}
