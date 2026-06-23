import { useRef, useState } from 'react'
import { isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import { useWeekData } from './useWeekData'
import { useWeekGrid } from './kit/useWeekGrid'
import { archiveTask, archiveEvent, unarchiveBatch } from './archive'
import WeekGrid from './kit/WeekGrid'
import TrayDrawer from './kit/TrayDrawer'
import ItemForm from './kit/ItemForm'
import Toast from './kit/Toast'

// One week's data + interactions + the SHARED form (Phase 7, C3). Calendar now
// opens the one canonical ItemForm (same form Today uses) for both create and
// edit — the old EventPanel/TaskPanel are retired here (files deleted with the old
// cluster in C4). Delete = ARCHIVE + Undo toast via the existing archive path
// (matching Today; replaces Calendar's old hard delete). Mounted with a key per
// week so useWeekData reloads on navigation. No schema; writes via existing paths.
export default function WeekView({ days, today, requestAdd, trayOpen, focus }) {
  const { events, scheduled, tray, cats, busy, reload, onSaveEvent, onSaveTask, onScheduleTask, onUpdateTask, onAddLooseTask } =
    useWeekData(days)
  const [form, setForm] = useState(null) // {kind,item,create,toggle}
  const [toast, setToast] = useState(null)
  const scrollRef = useRef(null)
  const bodyRef = useRef(null)

  const inboxColor = cats.find((c) => isInbox(c))?.color || INBOX_COLOR

  // The toolbar "+ Add event" (in CalendarWeek, outside this remount boundary)
  // opens a blank create form on the current week via this ref bridge.
  if (requestAdd) requestAdd.current = () => setForm({ kind: 'event', item: {}, create: true, toggle: true })

  const grid = useWeekGrid({
    scrollRef,
    bodyRef,
    days,
    // Create from the grid → the shared form, preset to the drawn slot (event;
    // the task/event toggle is available while creating).
    onCreate: (startIso, endIso) =>
      setForm({ kind: 'event', item: { start_at: startIso, end_at: endIso }, create: true, toggle: true }),
    onMove: (item, startIso, endIso) =>
      item.kind === 'event'
        ? onSaveEvent(item.id, { start_at: startIso, end_at: endIso })
        : onScheduleTask(item.id, startIso, endIso),
    onUnschedule: (item) =>
      onUpdateTask(item.id, { scheduled_start: null, scheduled_end: null }),
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
      <div className="wv-row">
        <WeekGrid
          days={days}
          today={today}
          events={events}
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
        />
        {trayOpen && (
          <TrayDrawer
            tasks={tray}
            cats={cats}
            busy={busy}
            onAdd={onAddLooseTask}
            onComplete={(id, done) => onUpdateTask(id, { status: done ? 'open' : 'done' })}
            trayBind={grid.trayBind}
          />
        )}
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
          toggle={form.toggle}
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
