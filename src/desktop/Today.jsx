import { Fragment, useRef, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'
import { isInbox } from '../spine/logic/categoryTree'
import { INBOX_COLOR } from '../spine/logic/palette'
import { isSameDay, dayNameFull, formatMastheadDate } from '../spine/logic/dateUtils'
import { buildToday } from '../spine/logic/todayModel'
import { activeTotal } from './allTasksModel'
import { indexTasks, progressOf, displayCatId, parentTitle } from '../spine/logic/subtasks'
import { archiveTask, archiveEvent, unarchiveBatch } from './archive'
import { useTodayData, startOfDay, addDays, localDateStr, friendly } from '../spine/data/useTodayData'
import { seriesFormHandlers } from './recur/seriesForm'
import { useGridDrag } from './kit/useGridDrag'
import TodayAllDay from './kit/TodayAllDay'
import { useSwipe } from './kit/useSwipe'
import DayGrid from './kit/DayGrid'
import ModuleHeader from './kit/ModuleHeader'
import QuickAddInput from './kit/QuickAddInput'
import TodayRow from './kit/TodayRow'
import ItemForm from './kit/ItemForm'
import Toast from './kit/Toast'
import { useTodayFocus } from './focus/useTodayFocus'
import { useFocusSessionCtx } from './focus/focusSessionContext'
import { requestFocus } from './focus/focusNav'
import { formatDuration } from './focus/focusFormat'
import './today.css'

// The Today home (Phase 7). T8 adds date arrows: a `viewed` day (defaulting to the
// real today) that the prev/next arrows step. The WHOLE page re-anchors to it — the
// grid, both modules, the now-line (today only), and every day-dependent write. All
// reads/writes go through Today's OWN parameterised path; Calendar's shared read
// hook (useWeekData) is untouched. No schema.
export default function Today({ onOpenPlanning }) {
  const realToday = new Date()
  const [viewed, setViewed] = useState(() => startOfDay(new Date()))
  const isToday = isSameDay(viewed, realToday)
  const focusToday = useTodayFocus() // seconds focused today (Focus module, P6)
  const fs = useFocusSessionCtx() // the running-session engine, for the ▶ block-nudge
  const focusRunning = fs && (fs.status === 'running' || fs.status === 'paused')

  // Today's data layer lives in its own hook (T10 P5B split): fetch (all-day +
  // overlap + series_id + lazy top-up) + the write primitives.
  const { tasks, events, cats, busy, setBusy, error, setError, load, writeTask, writeEvent } = useTodayData(viewed)
  const [form, setForm] = useState(null)
  const [toast, setToast] = useState(null)
  const [expandedToday, setExpandedToday] = useState(new Set()) // parent ids expanded in tasks-today
  // V2-2: the first day shown staggers its blocks in; once you step days, later
  // days load quietly (no re-stagger). The day arrows / "back to today" flip this.
  const [dayNavigated, setDayNavigated] = useState(false)

  const scrollRef = useRef(null)
  const laneRef = useRef(null)
  const todayModRef = useRef(null)
  const weekModRef = useRef(null)

  // V2-5 (sub-step 1): a two-finger horizontal trackpad swipe over the day grid
  // steps to the next/prev day — TRIGGERED, one day per gesture (a small flick =
  // one day), reusing the exact arrow step (setViewed + dayNavigated). Attaches to
  // the grid's existing scroll element via scrollRef, so DayGrid is untouched.
  // Vertical scroll still scrolls the hours (axis-lock in useSwipe). totalDx > 0 =
  // next day. The shared detector handles wheel capture / axis-lock / the
  // history-swipe preventDefault.
  const swipeStepped = useRef(false)
  const SWIPE_STEP = 40 // px of accumulated deltaX to commit a day step
  useSwipe(scrollRef, {
    onStart: () => { swipeStepped.current = false },
    onMove: (_dx, totalDx) => {
      if (swipeStepped.current || Math.abs(totalDx) < SWIPE_STEP) return
      swipeStepped.current = true
      setDayNavigated(true)
      setViewed((v) => addDays(v, totalDx > 0 ? 1 : -1))
    },
  })

  // The bucket a date belongs to: only the real today is the "Today" bucket.
  const bucketFor = (d) => (isSameDay(d, realToday) ? 'Today' : 'This Week')

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

  // Create / edit / delete a repeat, wired one way for every host (T10).
  const series = seriesFormHandlers({ form, setForm, reload: load, setToast })

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
  // ▶ on a row → the Focus SETUP screen, prefilled with this task + its category
  // snapshot. Reuses the EXACT trigger the task form uses (requestFocus). Blocked
  // with the existing gentle nudge while a session runs — no silent switching.
  const startFocus = (task, cat) => {
    if (focusRunning) {
      setToast({ text: "A session's already running — stop it first" })
      return
    }
    requestFocus({
      mode: 'setup',
      taskId: task.id,
      prefill: {
        task_id: task.id,
        task_title_snapshot: task.title,
        category_id: cat ? cat.id : task.category_id ?? null,
        category_snapshot: cat ? { id: cat.id, name: cat.name, color: cat.color ?? null } : null,
      },
    })
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

  // All-day items go to the Today all-day strip; only timed events hit the grid (so
  // an all-day / multi-day item never renders as a broken 24h block). (T10 P5B)
  const timedEvents = events.filter((e) => !e.all_day)
  const allDayEvents = events.filter((e) => e.all_day)

  return (
    <div className="today">
      <section className="today-day">
        <div className="today-daybar">
          <span className="today-stepper">
            <button className="today-nav" onClick={() => { setDayNavigated(true); setViewed(addDays(viewed, -1)) }} aria-label="Previous day">‹</button>
            <button className="today-nav" onClick={() => { setDayNavigated(true); setViewed(addDays(viewed, 1)) }} aria-label="Next day">›</button>
          </span>
          <h2 className="today-day-title">{isToday ? 'The Day' : dayNameFull(viewed)}</h2>
          <span className="today-viewdate">{formatMastheadDate(viewed)}</span>
          {!isToday && (
            <button className="today-back" onClick={() => { setDayNavigated(true); setViewed(startOfDay(new Date())) }}>
              Back to today
            </button>
          )}
        </div>
        <TodayAllDay events={allDayEvents} cats={cats} onOpen={openEvent} />
        <DayGrid
          events={timedEvents}
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
          staggerLoad={!dayNavigated}
        />
      </section>

      <div className="today-right">
        {isToday && focusToday > 0 && (
          <div className="today-focus-line">focused today · {formatDuration(focusToday)}</div>
        )}
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
                      <TodayRow
                        key={t.id}
                        task={t}
                        cat={dispCat(t)}
                        catsById={catById}
                        inboxColor={inboxColor}
                        isSub
                        subLabel={parentTitle(t, byId)}
                        muted={!!scheduledBadge(t)}
                        badge={scheduledBadge(t)}
                        busy={busy}
                        onSetStatus={(status) => onUpdate(t.id, { status })}
                        onPlay={() => startFocus(t, dispCat(t))}
                        onOpen={() => openTask(t.id)}
                        trayBind={grid.trayBind}
                      />
                    ) : (
                      <Fragment key={t.id}>
                        <TodayRow
                          task={t}
                          cat={dispCat(t)}
                          catsById={catById}
                          inboxColor={inboxColor}
                          muted={!!scheduledBadge(t)}
                          badge={scheduledBadge(t)}
                          busy={busy}
                          progress={progress(t)}
                          expanded={expandedToday.has(t.id)}
                          onToggleExpand={progress(t) ? () => toggleToday(t.id) : undefined}
                          onSetStatus={(status) => onUpdate(t.id, { status })}
                          onPlay={() => startFocus(t, dispCat(t))}
                          onOpen={() => openTask(t.id)}
                          trayBind={grid.trayBind}
                        />
                        {expandedToday.has(t.id) &&
                          (byParent.get(t.id) || [])
                            .filter((s) => !standaloneIds.has(s.id))
                            .map((s) => (
                              <TodayRow
                                key={s.id}
                                task={s}
                                cat={dispCat(s)}
                                catsById={catById}
                                inboxColor={inboxColor}
                                isSub
                                subLabel={t.title}
                                busy={busy}
                                onSetStatus={(status) => onUpdate(s.id, { status })}
                                onPlay={() => startFocus(s, dispCat(s))}
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
                      <TodayRow
                        key={t.id}
                        task={t}
                        cat={catFor(t)}
                        catsById={catById}
                        inboxColor={inboxColor}
                        busy={busy}
                        onSetStatus={(status) => onUpdate(t.id, { status })}
                        onPlay={() => startFocus(t, catFor(t))}
                        onOpen={() => openTask(t.id)}
                        trayBind={grid.trayBind}
                      />
                    ))}
                    {undated.map((t) => (
                      <TodayRow
                        key={t.id}
                        task={t}
                        cat={catFor(t)}
                        catsById={catById}
                        inboxColor={inboxColor}
                        badge={{ text: 'undated' }}
                        busy={busy}
                        onSetStatus={(status) => onUpdate(t.id, { status })}
                        onPlay={() => startFocus(t, catFor(t))}
                        onOpen={() => openTask(t.id)}
                        trayBind={grid.trayBind}
                      />
                    ))}
                  </>
                )}
              </div>
            </section>

            <button className="today-alltasks" onClick={onOpenPlanning}>
              Planning · {activeTotal(tasks)} <span className="today-alltasks-arrow">→</span>
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
          onSaveSeries={series.onSaveSeries}
          onSaveSeriesEdit={series.onSaveSeriesEdit}
          onDeleteSeries={series.onDeleteSeries}
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
