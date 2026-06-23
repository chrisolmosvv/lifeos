import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { isSameDay } from './dateUtils'
import { buildToday } from './todayModel'
import { useTodayGrid } from './kit/useTodayGrid'
import DayGrid from './kit/DayGrid'
import ModuleHeader from './kit/ModuleHeader'
import TodayTaskRow from './kit/TodayTaskRow'
import TodayForm from './kit/TodayForm'
import Toast from './kit/Toast'
import './today.css'

// The Today home (Phase 7). T5 turns the day grid into a workspace: click/drag to
// create, drag to move/resize, drag a task from a module onto the grid to schedule,
// and drag a block off onto a module to re-date it. All writes go through the
// EXISTING Supabase task/event paths; no schema. The interaction logic is a
// Today-scoped hook (useTodayGrid) — it does NOT touch Calendar's shared drag code.
export default function Today() {
  const today = new Date()
  const [tasks, setTasks] = useState(null)
  const [cats, setCats] = useState([])
  const [events, setEvents] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null) // null | { kind, item, create, toggle }
  const [toast, setToast] = useState(null)

  const scrollRef = useRef(null)
  const laneRef = useRef(null)
  const todayModRef = useRef(null)
  const weekModRef = useRef(null)

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

  // The existing write paths — the same Supabase insert/update/delete the app uses.
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
  const onUpdate = (id, fields) =>
    writeTask(supabase.from('tasks').update(fields).eq('id', id))

  // Save from the form (create or edit; the form tells us which kind it settled on).
  async function handleSave(fields, kind) {
    const { item, create } = form
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

  // --- the grid workspace interactions (Today-scoped hook) ------------------
  const grid = useTodayGrid({
    scrollRef,
    laneRef,
    todayModRef,
    weekModRef,
    today,
    onSelect: (item) => (item.kind === 'event' ? openEvent(item.id) : openTask(item.id)),
    onCreate: (startIso, endIso) =>
      setForm({
        kind: 'event',
        create: true,
        toggle: true,
        item: {
          start_at: startIso,
          end_at: endIso,
          scheduled_start: startIso,
          scheduled_end: endIso,
          time_bucket: 'Today',
          due_date: localDateStr(today),
        },
      }),
    onMove: (item, startIso, endIso) =>
      item.kind === 'event'
        ? writeEvent(supabase.from('events').update({ start_at: startIso, end_at: endIso }).eq('id', item.id))
        : writeTask(supabase.from('tasks').update({ scheduled_start: startIso, scheduled_end: endIso }).eq('id', item.id)),
    onSchedule: (id, startIso, endIso) =>
      writeTask(supabase.from('tasks').update({ scheduled_start: startIso, scheduled_end: endIso }).eq('id', id)),
    onOffTo: (target, item) => {
      const fields =
        target === 'today'
          ? { scheduled_start: null, scheduled_end: null, due_date: localDateStr(today), time_bucket: 'Today' }
          : { scheduled_start: null, scheduled_end: null, due_date: localDateStr(addDays(today, 7)), time_bucket: 'This Week' }
      return writeTask(supabase.from('tasks').update(fields).eq('id', item.id))
    },
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
          scrollRef={scrollRef}
          laneRef={laneRef}
          backgroundBind={grid.backgroundBind}
          blockBind={grid.blockBind}
          blockPreview={grid.blockPreview}
          createDraft={grid.createDraft}
        />
      </section>

      <div className="today-right">
        {tasks === null ? (
          <p className="today-loading">Loading…</p>
        ) : (
          <>
            <section className="today-mod today-mod-today" ref={todayModRef}>
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
                      trayBind={grid.trayBind}
                    />
                  ))
                )}
              </div>
              <button className="today-add" onClick={openAdd}>+ add a task</button>
            </section>

            <section className="today-mod today-mod-week" ref={weekModRef}>
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
                        trayBind={grid.trayBind}
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
                        trayBind={grid.trayBind}
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

      {grid.ghost && (
        <div className="tk-tray-ghost" style={{ left: grid.ghost.x, top: grid.ghost.y }}>
          {grid.ghost.title}
        </div>
      )}

      {form && (
        <TodayForm
          kind={form.kind}
          item={form.item}
          create={form.create}
          toggle={form.toggle}
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

function clock(iso) {
  const d = new Date(iso)
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
}
function localDateStr(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function friendly(error) {
  return error.message || 'Something went wrong.'
}
function friendlyEvent(error) {
  if (error.code === '23514')
    return 'That event ends before it starts — check the times.'
  return error.message || 'Something went wrong.'
}
