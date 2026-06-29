import { Fragment, useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { isSameDay, dayNameFull, formatMastheadDate } from './dateUtils'
import { buildToday } from './todayModel'
import { activeTotal } from './allTasksModel'
import { indexTasks, progressOf, displayCatId, parentTitle } from './subtasks'
import { archiveTask, archiveEvent, unarchiveBatch, activeOnly } from './archive'
import { useGridDrag } from './kit/useGridDrag'
import DayGrid from './kit/DayGrid'
import ModuleHeader from './kit/ModuleHeader'
import QuickAddInput from './kit/QuickAddInput'
import TodayTaskRow from './kit/TodayTaskRow'
import ItemForm from './kit/ItemForm'
import Toast from './kit/Toast'
import './today.css'

// The Today home (Phase 7). T8 adds date arrows: a `viewed` day (defaulting to the
// real today) that the prev/next arrows step. The WHOLE page re-anchors to it — the
// grid, both modules, the now-line (today only), and every day-dependent write. All
// reads/writes go through Today's OWN parameterised path; Calendar's shared read
// hook (useWeekData) is untouched. No schema.
export default function Today({ onOpenAllTasks, onOpenPlanning }) {
  const realToday = new Date()
  const [viewed, setViewed] = useState(() => startOfDay(new Date()))
  const isToday = isSameDay(viewed, realToday)

  const [tasks, setTasks] = useState(null)
  const [cats, setCats] = useState([])
  const [events, setEvents] = useState([]) // the viewed day's events
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [toast, setToast] = useState(null)
  const [expandedToday, setExpandedToday] = useState(new Set()) // parent ids expanded in tasks-today

  const scrollRef = useRef(null)
  const laneRef = useRef(null)
  const todayModRef = useRef(null)
  const weekModRef = useRef(null)

  async function load() {
    const dayStart = startOfDay(viewed)
    const dayEnd = addDays(dayStart, 1)

    const [taskRes, catRes, evRes] = await Promise.all([
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
      activeOnly(
        supabase
          .from('events')
          .select('id, title, notes, start_at, end_at, location, category_id')
          .gte('start_at', dayStart.toISOString())
          .lt('start_at', dayEnd.toISOString())
          .order('start_at', { ascending: true }),
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
    setEvents(evRes.data || [])
  }

  // Re-load whenever the viewed day changes (and on mount).
  useEffect(() => {
    load()
  }, [viewed]) // eslint-disable-line react-hooks/exhaustive-deps

  // The bucket a date belongs to: only the real today is the "Today" bucket.
  const bucketFor = (d) => (isSameDay(d, realToday) ? 'Today' : 'This Week')

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

  // Delete = ARCHIVE (soft-delete): stamp the row(s) with archived_at + a batch.
  // A task archives its subtasks in the same batch. Undo reverses the batch.
  // (No read filter yet — archived items still SHOW until A3, by design.)
  async function handleDelete() {
    const { kind, item } = form
    setForm(null)
    setBusy(true)
    const res =
      kind === 'task'
        ? await archiveTask(item.id, item.title)
        : await archiveEvent(item.id, item.title)
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
  const catFor = (t) => (t.category_id ? catById.get(t.category_id) : null)

  // Subtask index + display helpers. A subtask shows its PARENT's category.
  const { byId, byParent } = indexTasks(tasks)
  const dispCat = (t) => {
    const cid = displayCatId(t, byId)
    return cid ? catById.get(cid) : null
  }
  const progress = (t) => progressOf(t.id, byParent)
  const toggleToday = (id) =>
    setExpandedToday((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const { tasksToday, next7, undated } = buildToday(tasks, viewed, isToday)
  const scheduledTasks = (tasks || []).filter(
    (t) => t.scheduled_start && isSameDay(new Date(t.scheduled_start), viewed),
  )
  // Subtasks that are due/scheduled on the viewed day show as their OWN standalone
  // rows in "tasks today" (marked "↳ under [Parent]"); they are then excluded from
  // their parent's expand list (never shown twice).
  const dueOnViewed = (t) => {
    if (!t.due_date) return false
    const [y, m, d] = t.due_date.split('-').map(Number)
    return isSameDay(new Date(y, m - 1, d), viewed)
  }
  const schOnViewed = (t) => t.scheduled_start && isSameDay(new Date(t.scheduled_start), viewed)
  const standaloneSubs = (tasks || []).filter(
    (t) => t.parent_task_id && (dueOnViewed(t) || schOnViewed(t)),
  )
  const standaloneIds = new Set(standaloneSubs.map((s) => s.id))
  const rank = (p) => ({ high: 0, med: 1, low: 2 }[p] ?? 3)
  const todayItems = [...tasksToday, ...standaloneSubs].sort((a, b) => {
    const ad = a.status === 'done' ? 1 : 0
    const bd = b.status === 'done' ? 1 : 0
    if (ad !== bd) return ad - bd
    return rank(a.priority) - rank(b.priority) || a.title.localeCompare(b.title)
  })
  // Scheduled subtasks render on the grid tinted by the parent's category + marked "↳".
  const gridTasks = scheduledTasks.map((t) =>
    t.parent_task_id ? { ...t, category_id: displayCatId(t, byId), title: '↳ ' + t.title } : t,
  )
  const scheduledBadge = (t) =>
    t.scheduled_start && isSameDay(new Date(t.scheduled_start), viewed)
      ? { text: clock(t.scheduled_start) }
      : null

  // Quick-add (Piece 2): a title → a task dumped straight to the backlog/Inbox
  // (Someday + undated + no category), via the EXISTING writeTask path. Not
  // optimistic — writeTask reloads from the DB, so a failed write leaves nothing
  // behind. Returns true on success so the box clears + refocuses.
  async function quickAdd(title) {
    const msg = await writeTask(
      supabase.from('tasks').insert({
        title,
        time_bucket: 'Someday',
        category_id: null,
        due_date: null,
        scheduled_start: null,
        scheduled_end: null,
      }),
    )
    if (msg) {
      setError(msg)
      return false
    }
    setToast({ text: 'Added to Inbox' })
    return true
  }

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
      item: { time_bucket: bucketFor(viewed), due_date: localDateStr(viewed) },
      create: true,
    })

  // Subtask writes (form section) — all through the existing task paths; a delete
  // archives the subtask (A2). The open parent form re-reads its subtasks on reload.
  const subtaskHandlers = (parent) => ({
    add: (title) =>
      writeTask(supabase.from('tasks').insert({ title, parent_task_id: parent.id, time_bucket: parent.time_bucket || 'Today' })),
    update: (id, fields) => writeTask(supabase.from('tasks').update(fields).eq('id', id)),
    setStatus: (id, status) => writeTask(supabase.from('tasks').update({ status }).eq('id', id)),
    remove: async (id) => {
      const res = await archiveTask(id)
      if (res.error) setError(friendly(res.error))
      else await load()
    },
  })
  // The open form's subtask wiring: a parent task gets the live list + handlers;
  // a subtask gets its parent's title (and no subtask section).
  const formIsTaskEdit = form && form.kind === 'task' && !form.create
  const formIsParent = formIsTaskEdit && !form.item.parent_task_id
  const formSubtasks = formIsParent ? byParent.get(form.item.id) || [] : undefined
  const formOnSubtask = formIsParent ? subtaskHandlers(form.item) : undefined
  const formParentLabel = formIsTaskEdit && form.item.parent_task_id ? parentTitle(form.item, byId) : undefined

  // The grid workspace interactions — keyed to the VIEWED day. Today's config for
  // the shared useGridDrag: a SINGLE day (dayStartMsAt ignores x), the 7am lane
  // offset, and the two module drop-zones as the "off-grid" target.
  const dayStartMs = startOfDay(viewed).getTime()
  const inRect = (ref, x, y) => {
    const el = ref.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }
  const moduleAt = (x, y) =>
    inRect(todayModRef, x, y) ? 'today' : inRect(weekModRef, x, y) ? 'next7' : null
  const grid = useGridDrag({
    geomRef: laneRef,
    scrollRef,
    startMin: 7 * 60,
    dayStartMsAt: () => dayStartMs,
    offAt: moduleAt,
    eventsShowOff: false,
    onSelect: (item) => (item.kind === 'event' ? openEvent(item.id) : openTask(item.id)),
    onCreate: (startIso, endIso) =>
      setForm({
        kind: 'event',
        create: true,
        item: {
          start_at: startIso,
          end_at: endIso,
          scheduled_start: startIso,
          scheduled_end: endIso,
          time_bucket: bucketFor(viewed),
          due_date: localDateStr(viewed),
        },
      }),
    onMove: (item, startIso, endIso) =>
      item.kind === 'event'
        ? writeEvent(supabase.from('events').update({ start_at: startIso, end_at: endIso }).eq('id', item.id))
        : writeTask(supabase.from('tasks').update({ scheduled_start: startIso, scheduled_end: endIso }).eq('id', item.id)),
    onSchedule: (id, startIso, endIso) =>
      writeTask(supabase.from('tasks').update({ scheduled_start: startIso, scheduled_end: endIso }).eq('id', id)),
    onOff: (item, target) => {
      const fields =
        target === 'today'
          ? { scheduled_start: null, scheduled_end: null, due_date: localDateStr(viewed), time_bucket: bucketFor(viewed) }
          : { scheduled_start: null, scheduled_end: null, due_date: localDateStr(addDays(viewed, 7)), time_bucket: 'This Week' }
      return writeTask(supabase.from('tasks').update(fields).eq('id', item.id))
    },
  })

  return (
    <div className="today">
      <section className="today-day">
        <div className="today-daybar">
          <span className="today-stepper">
            <button className="today-nav" onClick={() => setViewed(addDays(viewed, -1))} aria-label="Previous day">‹</button>
            <button className="today-nav" onClick={() => setViewed(addDays(viewed, 1))} aria-label="Next day">›</button>
          </span>
          <h2 className="today-day-title">{isToday ? 'The Day' : dayNameFull(viewed)}</h2>
          <span className="today-viewdate">{formatMastheadDate(viewed)}</span>
          {!isToday && (
            <button className="today-back" onClick={() => setViewed(startOfDay(new Date()))}>
              Back to today
            </button>
          )}
        </div>
        <DayGrid
          events={events}
          scheduledTasks={gridTasks}
          cats={cats}
          today={viewed}
          isToday={isToday}
          selectedId={form && !form.create ? form.item?.id : null}
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
        <QuickAddInput onAdd={quickAdd} busy={busy} />
        {tasks === null ? (
          <p className="today-loading">Loading…</p>
        ) : (
          <>
            <section className="today-mod today-mod-today" ref={todayModRef}>
              <ModuleHeader>{isToday ? 'Tasks today' : dayNameFull(viewed)}</ModuleHeader>
              <div className="today-mod-list">
                {todayItems.length === 0 ? (
                  <p className="today-empty">
                    {isToday ? 'Nothing due today — a calm one.' : 'Nothing on this day.'}
                  </p>
                ) : (
                  todayItems.map((t) =>
                    t.parent_task_id ? (
                      // a standalone subtask row (due/scheduled today)
                      <TodayTaskRow
                        key={t.id}
                        task={t}
                        cat={dispCat(t)}
                        inboxColor={inboxColor}
                        isSub
                        subLabel={parentTitle(t, byId)}
                        muted={!!scheduledBadge(t)}
                        badge={scheduledBadge(t)}
                        busy={busy}
                        onSetStatus={(status) => onUpdate(t.id, { status })}
                        onOpen={() => openTask(t.id)}
                        trayBind={grid.trayBind}
                      />
                    ) : (
                      <Fragment key={t.id}>
                        <TodayTaskRow
                          task={t}
                          cat={dispCat(t)}
                          inboxColor={inboxColor}
                          muted={!!scheduledBadge(t)}
                          badge={scheduledBadge(t)}
                          busy={busy}
                          progress={progress(t)}
                          expanded={expandedToday.has(t.id)}
                          onToggleExpand={progress(t) ? () => toggleToday(t.id) : undefined}
                          onSetStatus={(status) => onUpdate(t.id, { status })}
                          onOpen={() => openTask(t.id)}
                          trayBind={grid.trayBind}
                        />
                        {expandedToday.has(t.id) &&
                          (byParent.get(t.id) || [])
                            .filter((s) => !standaloneIds.has(s.id))
                            .map((s) => (
                              <TodayTaskRow
                                key={s.id}
                                task={s}
                                cat={dispCat(s)}
                                inboxColor={inboxColor}
                                isSub
                                subLabel={t.title}
                                busy={busy}
                                onSetStatus={(status) => onUpdate(s.id, { status })}
                                onOpen={() => openTask(s.id)}
                              />
                            ))}
                      </Fragment>
                    ),
                  )
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

            <div className="today-backlog-row">
              <button className="today-alltasks" onClick={onOpenAllTasks}>
                All tasks · {activeTotal(tasks)} <span className="today-alltasks-arrow">→</span>
              </button>
              {onOpenPlanning && (
                <button className="today-planning-link" onClick={onOpenPlanning}>
                  Planning →
                </button>
              )}
            </div>
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
        <ItemForm
          kind={form.kind}
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
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
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
