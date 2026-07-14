import { requestFocus } from './focusNav'

// makeStartFocus — the ▶ "start a focus session on this task" action, in ONE place.
// Today has always had it; Planning gains it in Piece 6 when its rows converge on
// TodayRow (which carries the ▶). Rather than copy the logic onto the second screen,
// both screens now call this.
//
// It reuses the EXACT trigger the task form uses (requestFocus → the Focus Setup
// screen, prefilled with the task + a snapshot of its category), and it refuses to
// switch tasks while a session is already running — the same gentle nudge, not a
// silent swap.
//
// Props: { focusRunning, setToast } → returns startFocus(task, cat).
export function makeStartFocus({ focusRunning, setToast }) {
  return function startFocus(task, cat) {
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
}
