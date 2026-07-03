import { useEffect, useRef, useState } from 'react'
import { isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { useWeekData } from './useWeekData'
import { fetchSessions } from './focus/focusLoad'
import { focusSpans } from './focus/focusCalc'
import { useGridDrag } from './kit/useGridDrag'
import { useBandDrag } from './kit/useBandDrag'
import { useSwipe } from './kit/useSwipe'
import { archiveTask, archiveEvent, unarchiveBatch } from './archive'
import WeekGrid from './kit/WeekGrid'
import TrayDrawer from './kit/TrayDrawer'
import ItemForm from './kit/ItemForm'
import Toast from './kit/Toast'

// One week's data + interactions + the SHARED form (Phase 7, C3). Calendar now
// opens the one canonical ItemForm (same form Today uses) for both create and
// edit — the old EventPanel/TaskPanel are retired here (files deleted with the old
// cluster in C4). Delete = ARCHIVE + Undo toast via the existing archive path
// (matching Today; replaces Calendar's old hard delete). V2-4: WeekView is now
// stably mounted (the per-week remount is gone — useWeekData reloads on the week
// key); so we explicitly clear the open form + toast on a week change, which the
// remount used to do. No schema; writes via existing paths.
export default function WeekView({ days, today, requestAdd, trayOpen, focus, staggerLoad, navToken, navIntent, onSwipe, showActual }) {
  const { events, scheduled, tray, cats, busy, reload, onSaveEvent, onSaveTask, onScheduleTask, onUpdateTask, onAddLooseTask } =
    useWeekData(days)
  const [form, setForm] = useState(null) // {kind,item,create}
  const [toast, setToast] = useState(null)
  const scrollRef = useRef(null)
  const bodyRef = useRef(null)
  const bandRef = useRef(null)

  // V2-4: on a week change, drop any open form / toast so you can't edit an item
  // from the week you just left (the remount used to reset these for free).
  const weekKey = days[0].toISOString()
  useEffect(() => {
    setForm(null)
    setToast(null)
  }, [weekKey])

  // Focus actual-layer (P7): fetch this week's focus ONLY when the toggle is on, and
  // refetch on a week change. Off → empty spans (WeekGrid gets undefined → the grid is
  // byte-for-byte unchanged). Isolated: nothing else in the week read is touched.
  const [actualSpans, setActualSpans] = useState([])
  useEffect(() => {
    if (!showActual) { setActualSpans([]); return }
    let live = true
    const end = new Date(days[6]); end.setDate(end.getDate() + 1)
    fetchSessions(days[0].toISOString(), end.toISOString())
      .then((rows) => { if (live) setActualSpans(focusSpans(rows)) })
      .catch(() => { /* the overlay is optional — never break the calendar over it */ })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showActual, weekKey])

  // V2-6: while the tray squeeze animates (~220ms), gate the grid's pointer-events
  // off so a drag can't start/drop while the x→day geometry is mid-transition. The
  // live-rect read already self-corrects; this is cheap belt-and-suspenders. Skips
  // the first run so opening Calendar never gates the grid.
  const [squeezing, setSqueezing] = useState(false)
  const trayMounted = useRef(false)
  useEffect(() => {
    if (!trayMounted.current) { trayMounted.current = true; return }
    setSqueezing(true)
    const t = setTimeout(() => setSqueezing(false), 240)
    return () => clearTimeout(t)
  }, [trayOpen])

  // V2-5: a two-finger horizontal swipe over the week grid steps EXACTLY one
  // Mon–Sun week on release — the SAME next/prev-week step the arrows use (swipe
  // and arrows are one path), distance-independent (a big flick still moves one).
  // No live track — the V2-4 slide animates the commit. Attaches to the grid's
  // existing scroll element (scrollRef); vertical scroll still scrolls the hours
  // (axis-lock); the non-passive preventDefault kills the macOS history-swipe.
  const SWIPE_MIN = 30 // px of accumulated deltaX to count as a swipe
  useSwipe(scrollRef, {
    onEnd: (totalDx) => {
      if (Math.abs(totalDx) > SWIPE_MIN) onSwipe?.(totalDx > 0 ? 1 : -1)
    },
  })

  // All-day events go to the band; only timed events render on the hour grid (so
  // an all-day item never disturbs the timed even-split/overlap below). (C7)
  const timedEvents = events.filter((e) => !e.all_day)
  const allDayEvents = events.filter((e) => e.all_day)

  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR

  // The toolbar "+ Add event" (in CalendarWeek, outside WeekView) opens a blank
  // create form on the current week via this ref bridge.
  if (requestAdd) requestAdd.current = () => setForm({ kind: 'event', item: {}, create: true })

  // Week config for the shared useGridDrag: N columns (the day under x re-days a
  // move), a midnight lane (startMin 0), and "off the grid" = outside the scroll.
  const GUTTER = 26 // must match .wk-gutter / .wk-corner in weekGrid.css
  const dayStartMsAt = (clientX) => {
    const r = bodyRef.current.getBoundingClientRect()
    const colW = (r.width - GUTTER) / 7
    const idx = Math.max(0, Math.min(6, Math.floor((clientX - r.left - GUTTER) / colW)))
    const d = days[idx]
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }
  const offGrid = (x, y) => {
    const el = scrollRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return x < r.left || x > r.right || y < r.top || y > r.bottom ? true : null
  }
  const grid = useGridDrag({
    geomRef: bodyRef,
    scrollRef,
    startMin: 0,
    dayStartMsAt,
    offAt: offGrid,
    eventsShowOff: true,
    // Create from the grid → the shared form, preset to the drawn slot (always an
    // event — Piece 3c; a task reaches the grid via the tray + schedule gesture).
    onCreate: (startIso, endIso) =>
      setForm({ kind: 'event', item: { start_at: startIso, end_at: endIso }, create: true }),
    onMove: (item, startIso, endIso) =>
      item.kind === 'event'
        ? onSaveEvent(item.id, { start_at: startIso, end_at: endIso })
        : onScheduleTask(item.id, startIso, endIso),
    // Drag a TASK off the grid → unschedule it; an EVENT snaps back (no write).
    onOff: (item) => onUpdateTask(item.id, { scheduled_start: null, scheduled_end: null }),
    // Tap a block → open the shared form on its row (type locked on edit).
    onSelect: (item) =>
      item.kind === 'event'
        ? setForm({ kind: 'event', item: events.find((e) => e.id === item.id), create: false })
        : setForm({ kind: 'task', item: scheduled.find((t) => t.id === item.id), create: false }),
    // Drop a tray row on the grid → schedule a 1-hour block (one reload then drops
    // it from the tray and shows it as a block — the tray stays open).
    onSchedule: (id, startIso, endIso) => onScheduleTask(id, startIso, endIso),
    // Click a tray row → open the shared form to edit that loose task.
    onTraySelect: (task) => setForm({ kind: 'task', item: task, create: false }),
  })

  // The all-day band (C7) — day-grained create / move / span. Create opens the
  // shared form preset all-day; move/span write through the existing event path.
  const band = useBandDrag({
    bandRef,
    days,
    onCreate: (startIso, endIso) =>
      setForm({ kind: 'event', create: true, item: { all_day: true, start_at: startIso, end_at: endIso } }),
    onMove: (event, startIso, endIso) => onSaveEvent(event.id, { start_at: startIso, end_at: endIso }),
    onSelect: (event) => setForm({ kind: 'event', item: event, create: false }),
  })

  async function handleSave(fields, kind) {
    const id = form.create ? null : form.item.id
    const msg = kind === 'event' ? await onSaveEvent(id, fields) : await onSaveTask(id, fields)
    if (!msg) setForm(null)
    return msg
  }

  // Delete = ARCHIVE + Undo toast (existing archive.js path), matching Today and
  // replacing Calendar's old hard delete. [CHECKER: the one data-write change.]
  async function handleDelete() {
    const { kind, item } = form
    setForm(null)
    const res = kind === 'task' ? await archiveTask(item.id, item.title) : await archiveEvent(item.id, item.title)
    if (res.error) return
    await reload()
    setToast({
      text: 'Archived',
      onUndo: async () => {
        setToast(null)
        const r = await unarchiveBatch(res.batchId)
        if (!r?.error) await reload()
      },
    })
  }

  // A block is outlined when its form is open OR when arrived-at from a Month
  // item-click (focus). Normal Week use passes no focus → unchanged.
  const selectedId = (form && !form.create ? form.item?.id : null) ?? focus?.itemId ?? null

  return (
    <>
      <div className={'wv-row' + (squeezing ? ' is-squeezing' : '')}>
        <WeekGrid
          days={days}
          today={today}
          events={timedEvents}
          scheduled={scheduled}
          cats={cats}
          selectedId={selectedId}
          scrollRef={scrollRef}
          bodyRef={bodyRef}
          blockBind={grid.blockBind}
          backgroundBind={grid.backgroundBind}
          blockPreview={grid.blockPreview}
          createDraft={grid.createDraft}
          dragLabel={grid.dragLabel}
          focusMs={focus?.ms}
          focusDay={focus?.day}
          allDayEvents={allDayEvents}
          bandRef={bandRef}
          bandCreateBind={band.createBind}
          bandBarBind={band.barBind}
          bandPreview={band.preview}
          staggerLoad={staggerLoad}
          navToken={navToken}
          navIntent={navIntent}
          actual={showActual ? actualSpans : undefined}
        />
        {/* V2-6: always mounted (so close animates too); `open` drives the squeeze. */}
        <TrayDrawer
          open={trayOpen}
          tasks={tray}
          cats={cats}
          busy={busy}
          onAdd={onAddLooseTask}
          onComplete={(id, done) => onUpdateTask(id, { status: done ? 'open' : 'done' })}
          trayBind={grid.trayBind}
        />
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
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setForm(null)}
        />
      )}
      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </>
  )
}
