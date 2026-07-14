import { isSameDay } from '../spine/logic/dateUtils'
import { buildToday } from '../spine/logic/todayModel'
import { displayCatId } from '../spine/logic/subtasks'

// todayDerive — everything Today works out from the raw task list for the day it's
// LOOKING at. Pure: no state, no network, no writes; same inputs → same output.
// (Piece 0 split: moved verbatim out of Today.jsx. No rule of the maths changed.)
//
// Two lists come out of it:
//   • todayItems — the "tasks today" module: the day's tasks PLUS any subtask that
//     is itself due/scheduled that day (which then shows as its own standalone row,
//     marked "↳ under [Parent]", and is skipped inside its parent's expand list —
//     never shown twice). Done sink to the bottom, then priority, then title.
//   • gridTasks — the scheduled blocks on the day sheet. A scheduled subtask is
//     tinted by its PARENT's category and marked "↳".
//
// Returns: { todayItems, gridTasks, next7, undated, standaloneIds, scheduledBadge }.
export function deriveToday({ tasks, viewed, isToday, byId }) {
  const { tasksToday, next7, undated } = buildToday(tasks, viewed, isToday)

  const scheduledTasks = (tasks || []).filter(
    (t) => t.scheduled_start && isSameDay(new Date(t.scheduled_start), viewed),
  )

  // Subtasks that are due/scheduled on the viewed day show as their OWN standalone
  // rows in "tasks today"; they are then excluded from their parent's expand list.
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

  return { todayItems, gridTasks, next7, undated, standaloneIds, scheduledBadge }
}

function clock(iso) {
  const d = new Date(iso)
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
}
