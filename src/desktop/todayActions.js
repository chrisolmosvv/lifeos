import { supabase } from '../spine/data/supabaseClient'
import { friendly } from '../spine/data/useTodayData'
import { archiveTask, archiveEvent, unarchiveBatch } from './archive'
import { makeStartFocus } from './focus/startFocusAction'

// todayActions — Today's writes, in one place. (Piece 0 split: moved verbatim out of
// Today.jsx; no behaviour changed.) Every one goes through the caller's existing
// writeTask / writeEvent paths, which reload from the database — so a failed write
// leaves nothing behind on screen.
//
// Returns: { handleSave, handleDelete, quickAdd, subtaskHandlers, startFocus }.
export function todayActions({
  form,
  setForm,
  writeTask,
  writeEvent,
  load,
  setBusy,
  setError,
  setToast,
  focusRunning,
}) {
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

  // Quick-add (Piece 2): a title → a task dumped straight to the backlog/Inbox
  // (Someday + undated + no category). Returns true on success so the box clears
  // and refocuses.
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

  // ▶ on a row → the Focus SETUP screen, prefilled with this task. Shared with
  // Planning (startFocusAction), so both screens start a session the same way.
  const startFocus = makeStartFocus({ focusRunning, setToast })

  return { handleSave, handleDelete, quickAdd, subtaskHandlers, startFocus }
}
