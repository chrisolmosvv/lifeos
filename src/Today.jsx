import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { orderedTree, isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { isSameDay } from './dateUtils'
import { buildToday } from './todayModel'
import DayGrid from './kit/DayGrid'
import ModuleHeader from './kit/ModuleHeader'
import TodayTaskRow from './kit/TodayTaskRow'
import EventPanel from './EventPanel'
import TaskPanel from './TaskPanel'
import './today.css'

// The Today home — the rebuilt "front page" (Phase 7, T4 / Rebuild R1). The
// approved B layout: "the day" (a 7am–midnight grid of today's events + scheduled
// tasks) on the left; "tasks today" over "the next 7 days" on the right, with a
// quiet "All tasks" box. This piece RENDERS real data read-only; the only writes
// are the EXISTING edit panels (tap a task/event to edit) so nothing regresses.
// No create/drag/+add/status-pill/day-flip yet — those are later pieces.
export default function Today() {
  const today = new Date()
  const [tasks, setTasks] = useState(null) // null = still loading
  const [cats, setCats] = useState([])
  const [events, setEvents] = useState([]) // today's events only
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editTaskId, setEditTaskId] = useState(null)
  const [editEventId, setEditEventId] = useState(null)

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

  // The only writes this piece keeps: editing an existing task/event (the
  // current Phase-6 panels). Everything else is read-only.
  async function onUpdate(id, fields) {
    setBusy(true)
    const { error } = await supabase.from('tasks').update(fields).eq('id', id)
    setBusy(false)
    if (error) return setError(friendly(error))
    await load()
  }
  async function writeEvent(query) {
    setBusy(true)
    const { error } = await query
    setBusy(false)
    if (error) return friendlyEvent(error)
    await load()
    return null
  }
  const onSaveEvent = (id, fields) =>
    writeEvent(
      id
        ? supabase.from('events').update(fields).eq('id', id)
        : supabase.from('events').insert(fields),
    )
  const onDeleteEvent = (id) =>
    writeEvent(supabase.from('events').delete().eq('id', id))

  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const pickable = orderedTree(cats).filter((c) => !isInbox(c))
  const catById = new Map(cats.map((c) => [c.id, c]))
  const catFor = (t) => (t.category_id ? catById.get(t.category_id) : null)

  const { tasksToday, next7, undated, total } = buildToday(tasks, today)
  // Tasks scheduled for today fill the grid alongside events (still tasks).
  const scheduledTasks = (tasks || []).filter(
    (t) => t.scheduled_start && isSameDay(new Date(t.scheduled_start), today),
  )

  const editTask = editTaskId ? (tasks || []).find((t) => t.id === editTaskId) : null
  const editEvent = editEventId ? events.find((e) => e.id === editEventId) : null

  // A scheduled-today task shows muted, with its time, in "tasks today".
  const scheduledBadge = (t) =>
    t.scheduled_start && isSameDay(new Date(t.scheduled_start), today)
      ? { text: clock(t.scheduled_start) }
      : null

  return (
    <div className="today">
      <section className="today-day">
        <h2 className="today-day-title">The Day</h2>
        <DayGrid
          events={events}
          scheduledTasks={scheduledTasks}
          cats={cats}
          today={today}
          onOpenEvent={setEditEventId}
          onOpenTask={setEditTaskId}
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
                      onOpen={() => setEditTaskId(t.id)}
                    />
                  ))
                )}
              </div>
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
                        onOpen={() => setEditTaskId(t.id)}
                      />
                    ))}
                    {undated.map((t) => (
                      <TodayTaskRow
                        key={t.id}
                        task={t}
                        cat={catFor(t)}
                        inboxColor={inboxColor}
                        badge={{ text: 'undated' }}
                        onOpen={() => setEditTaskId(t.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            </section>

            {/* Placeholder for the future All Tasks inventory screen (wired later). */}
            <button className="today-alltasks" disabled aria-disabled="true">
              All tasks · {total} <span className="today-alltasks-arrow">→</span>
            </button>
          </>
        )}
        {error && <p className="today-error">{error}</p>}
      </div>

      {editEvent && (
        <EventPanel
          mode="edit"
          event={editEvent}
          pickable={pickable}
          busy={busy}
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
          onClose={() => setEditEventId(null)}
        />
      )}
      {editTask && (
        <TaskPanel
          task={editTask}
          pickable={pickable}
          inboxColor={inboxColor}
          busy={busy}
          onUpdate={onUpdate}
          onClose={() => setEditTaskId(null)}
        />
      )}
    </div>
  )
}

// "9:00" local 24-hour.
function clock(iso) {
  const d = new Date(iso)
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
}

function friendly(error) {
  return error.message || 'Something went wrong.'
}
function friendlyEvent(error) {
  if (error.code === '23514')
    return 'That event ends before it starts — check the times.'
  return error.message || 'Something went wrong.'
}
