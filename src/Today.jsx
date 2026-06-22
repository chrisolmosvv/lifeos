import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { orderedTree, isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import TaskBlock from './TaskBlock'
import DayTimeline from './DayTimeline'
import { useScheduleDrag } from './useScheduleDrag'
import { isSameDay } from './dateUtils'
import './today.css'

// The Today home — the front page. Two columns: "The Day" timeline on the left
// (today's events + scheduled tasks) and the task blocks on the right, split by
// time bucket. Drag a task onto the grid to schedule it (a scheduled task STAYS
// a task — it just gains a time block). RLS makes every query owner-only; no
// schema change — scheduling only writes scheduled_start/scheduled_end.
export default function Today() {
  const today = new Date()
  const scrollRef = useRef(null) // the day grid's scroll element (shared)
  const [tasks, setTasks] = useState(null) // null = still loading
  const [cats, setCats] = useState([])
  const [events, setEvents] = useState([]) // today's events only
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    // Today's bounds (local), so only today's events are fetched/rendered.
    const dayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const [taskRes, catRes, evRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          'id, title, notes, status, completed_at, category_id, priority, time_bucket, scheduled_start, scheduled_end, created_at',
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

  // Event create/edit/delete (timeline panel). Returns a plain message on
  // failure (e.g. the DB's backwards-time guard) or null on success. Writes
  // only to existing event columns; owner-only RLS is untouched.
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

  // Scheduling a task only sets its scheduled_start/scheduled_end (it stays a
  // task, still in its list). Unscheduling clears them back to null.
  const onScheduleTask = (id, startIso, endIso) =>
    run(
      supabase
        .from('tasks')
        .update({ scheduled_start: startIso, scheduled_end: endIso })
        .eq('id', id),
    )
  const onUnscheduleTask = (id) =>
    run(
      supabase
        .from('tasks')
        .update({ scheduled_start: null, scheduled_end: null })
        .eq('id', id),
    )

  // Drag a task's grip from its list row onto the grid → schedule it there.
  const schedule = useScheduleDrag({ today, scrollRef, onSchedule: onScheduleTask })

  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR
  const pickable = orderedTree(cats).filter((c) => !isInbox(c))

  const all = tasks || []
  const todayTasks = all.filter((t) => t.time_bucket === 'Today')
  const weekTasks = all.filter((t) => t.time_bucket === 'This Week')
  // Tasks scheduled for today appear on the grid (still listed too).
  const scheduledTasks = all.filter(
    (t) => t.scheduled_start && isSameDay(new Date(t.scheduled_start), today),
  )

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
    scheduleBind: schedule.bind,
  }

  return (
    <div className="today">
      <section className="today-day">
        <h2 className="today-day-title">The Day</h2>
        <DayTimeline
          events={events}
          scheduledTasks={scheduledTasks}
          cats={cats}
          today={today}
          pickable={pickable}
          inboxColor={inboxColor}
          busy={busy}
          scrollRef={scrollRef}
          onSaveEvent={onSaveEvent}
          onDeleteEvent={onDeleteEvent}
          onScheduleTask={onScheduleTask}
          onUnscheduleTask={onUnscheduleTask}
          onUpdateTask={onUpdate}
        />
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

      {/* The chip that follows the pointer while dragging a task onto the grid. */}
      {schedule.ghost && (
        <div
          className="sched-ghost"
          style={{ left: schedule.ghost.x, top: schedule.ghost.y }}
        >
          {schedule.ghost.title}
        </div>
      )}
    </div>
  )
}

// Turn a Supabase/Postgres error into one plain sentence.
function friendly(error) {
  return error.message || 'Something went wrong.'
}

// Same, but maps the events' backwards-time DB guard to a calm message.
function friendlyEvent(error) {
  if (error.code === '23514')
    return 'That event ends before it starts — check the times.'
  return error.message || 'Something went wrong.'
}
