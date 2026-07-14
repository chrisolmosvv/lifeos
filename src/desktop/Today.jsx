import { useRef, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'
import { isInbox } from '../spine/logic/categoryTree'
import { INBOX_COLOR } from '../spine/logic/palette'
import { isSameDay } from '../spine/logic/dateUtils'
import { indexTasks, progressOf, displayCatId, parentTitle } from '../spine/logic/subtasks'
import { useTodayData, startOfDay, addDays, localDateStr } from '../spine/data/useTodayData'
import { ensureGeneratedThrough } from './recur/topup'
import { seriesFormHandlers } from './recur/seriesForm'
import { useDaySwipe } from './useDaySwipe'
import { deriveToday } from './todayDerive'
import { todayActions } from './todayActions'
import { useTodayGrid } from './useTodayGrid'
import TodayAllDay from './kit/TodayAllDay'
import TodayDayBar from './TodayDayBar'
import TodayTasksPanel from './TodayTasksPanel'
import DayGrid from './kit/DayGrid'
import ItemForm from './kit/ItemForm'
import Toast from './kit/Toast'
import { useFocusSessionCtx } from './focus/focusSessionContext'
import './today.css'

// The Today home (Phase 7). T8 adds date arrows: a `viewed` day (defaulting to the
// real today) that the prev/next arrows step. The WHOLE page re-anchors to it — the
// grid, both modules, the now-line (today only), and every day-dependent write. All
// reads/writes go through Today's OWN parameterised path; Calendar's shared read
// hook (useWeekData) is untouched. No schema.
//
// Piece 0 split — this file is now the SHELL: the day being viewed, the data, and the
// form. The rest lives beside it: the day bar (TodayDayBar), the right-hand column
// (TodayTasksPanel), the day's derived lists (todayDerive), the writes (todayActions)
// and the drag wiring (useTodayGrid).
export default function Today({ onOpenPlanning }) {
  const realToday = new Date()
  const [viewed, setViewed] = useState(() => startOfDay(new Date()))
  const isToday = isSameDay(viewed, realToday)
  const fs = useFocusSessionCtx() // the running-session engine, for the ▶ block-nudge
  const focusRunning = fs && (fs.status === 'running' || fs.status === 'paused')

  // Today's data layer lives in its own hook (T10 P5B split): fetch (all-day +
  // overlap + series_id + lazy top-up) + the write primitives.
  const { tasks, events, cats, busy, setBusy, error, setError, load, writeTask, writeEvent } = useTodayData(viewed, ensureGeneratedThrough)
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

  // A two-finger trackpad swipe over the day grid steps one day — the exact same
  // step the ‹ › arrows take (useDaySwipe).
  useDaySwipe(scrollRef, (dir) => {
    setDayNavigated(true)
    setViewed((v) => addDays(v, dir))
  })

  // The bucket a date belongs to: only the real today is the "Today" bucket.
  const bucketFor = (d) => (isSameDay(d, realToday) ? 'Today' : 'This Week')

  const onUpdate = (id, fields) =>
    writeTask(supabase.from('tasks').update(fields).eq('id', id))

  // Create / edit / delete a repeat, wired one way for every host (T10).
  const series = seriesFormHandlers({ form, setForm, reload: load, setToast })

  // Every Today write (save · archive+undo · quick-add · subtasks · ▶ start-focus).
  const { handleSave, handleDelete, quickAdd, subtaskHandlers, startFocus } = todayActions({
    form,
    setForm,
    writeTask,
    writeEvent,
    load,
    setBusy,
    setError,
    setToast,
    focusRunning,
  })

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

  // Everything the viewed day derives from the raw task list (pure — todayDerive).
  const { todayItems, gridTasks, next7, undated, standaloneIds, scheduledBadge } = deriveToday({
    tasks,
    viewed,
    isToday,
    byId,
  })

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

  // The open form's subtask wiring: a parent task gets the live list + handlers;
  // a subtask gets its parent's title (and no subtask section).
  const formIsTaskEdit = form && form.kind === 'task' && !form.create
  const formIsParent = formIsTaskEdit && !form.item.parent_task_id
  const formSubtasks = formIsParent ? byParent.get(form.item.id) || [] : undefined
  const formOnSubtask = formIsParent ? subtaskHandlers(form.item) : undefined
  const formParentLabel = formIsTaskEdit && form.item.parent_task_id ? parentTitle(form.item, byId) : undefined

  // The grid workspace interactions — keyed to the VIEWED day (useTodayGrid).
  const grid = useTodayGrid({
    viewed,
    bucketFor,
    laneRef,
    scrollRef,
    todayModRef,
    weekModRef,
    writeTask,
    writeEvent,
    setForm,
    onOpenEvent: openEvent,
    onOpenTask: openTask,
  })

  // All-day items go to the Today all-day strip; only timed events hit the grid (so
  // an all-day / multi-day item never renders as a broken 24h block). (T10 P5B)
  const timedEvents = events.filter((e) => !e.all_day)
  const allDayEvents = events.filter((e) => e.all_day)

  return (
    <div className="today">
      <section className="today-day">
        <TodayDayBar
          viewed={viewed}
          isToday={isToday}
          onPrev={() => { setDayNavigated(true); setViewed(addDays(viewed, -1)) }}
          onNext={() => { setDayNavigated(true); setViewed(addDays(viewed, 1)) }}
          onBack={() => { setDayNavigated(true); setViewed(startOfDay(new Date())) }}
        />
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

      <TodayTasksPanel
        isToday={isToday}
        viewed={viewed}
        tasks={tasks}
        todayItems={todayItems}
        next7={next7}
        undated={undated}
        standaloneIds={standaloneIds}
        byId={byId}
        byParent={byParent}
        catById={catById}
        inboxColor={inboxColor}
        dispCat={dispCat}
        catFor={catFor}
        progress={progress}
        scheduledBadge={scheduledBadge}
        expandedToday={expandedToday}
        onToggleExpand={toggleToday}
        busy={busy}
        error={error}
        onQuickAdd={quickAdd}
        onUpdate={onUpdate}
        onStartFocus={startFocus}
        onOpenTask={openTask}
        onAdd={openAdd}
        onOpenPlanning={onOpenPlanning}
        trayBind={grid.trayBind}
        todayModRef={todayModRef}
        weekModRef={weekModRef}
      />

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
