// Pure helpers for the All Tasks inventory screen (Phase 7, T11). No data access,
// no React — just reads of the in-memory tasks + category tree. A "countable"
// task is an active (not-done) TOP-LEVEL task; counts always exclude done, and the
// screen lists top-level tasks (subtasks live under their parent elsewhere).

import { descendantIds } from '../spine/logic/categoryTree'

const countable = (t) => !t.parent_task_id && t.status !== 'done'

// Total active tasks (the number on Today's "All tasks · N" box).
export function activeTotal(tasks) {
  return (tasks || []).filter(countable).length
}

// Active tasks filed directly in Inbox (category_id null is the data model's
// "uncategorised / Inbox").
export function inboxCount(tasks) {
  return (tasks || []).filter((t) => countable(t) && t.category_id == null).length
}

// Active tasks in a category's WHOLE sub-tree (itself + every descendant), via a
// read-only walk of the parent_id tree.
export function subtreeCount(cats, tasks, catId) {
  const ids = new Set([catId, ...descendantIds(cats, catId)])
  return (tasks || []).filter((t) => countable(t) && ids.has(t.category_id)).length
}

// A category's OWN top-level tasks (catId === null means Inbox).
export function ownTasks(tasks, catId) {
  return (tasks || []).filter(
    (t) => !t.parent_task_id && (catId == null ? t.category_id == null : t.category_id === catId),
  )
}

// The display order: active first (done sink to the bottom, only shown when the
// "show done" toggle is on); within each, by due_date soonest-first, then undated
// at the bottom, then by title. due_date is 'YYYY-MM-DD' so string compare = date.
export function orderTasks(tasks, showDone) {
  const visible = showDone ? tasks : tasks.filter((t) => t.status !== 'done')
  return [...visible].sort((a, b) => {
    const ad = a.status === 'done' ? 1 : 0
    const bd = b.status === 'done' ? 1 : 0
    if (ad !== bd) return ad - bd
    const au = a.due_date ? 0 : 1
    const bu = b.due_date ? 0 : 1
    if (au !== bu) return au - bu
    if (a.due_date && b.due_date && a.due_date !== b.due_date)
      return a.due_date < b.due_date ? -1 : 1
    return a.title.localeCompare(b.title)
  })
}

// A category's direct children, in display order.
export function childrenOf(cats, parentId) {
  return cats
    .filter((c) => (c.parent_id ?? null) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
}
