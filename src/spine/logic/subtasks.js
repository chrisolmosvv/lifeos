// Pure subtask helpers (Phase 7, SUB). A subtask is a tasks row with
// parent_task_id set — one level only (DB-enforced). No data access here.
//
// CATEGORY INHERITANCE: a subtask has no category of its own (category_id null);
// wherever its category is DISPLAYED (row dot/tag, grid tint) it shows the
// PARENT's category — never Inbox. `displayCatId` is the single place that rule
// lives; callers map the returned id to a category row.

// Index the loaded tasks: id → task, and parentId → [its subtasks].
export function indexTasks(tasks) {
  const byId = new Map()
  const byParent = new Map()
  for (const t of tasks || []) {
    byId.set(t.id, t)
    if (t.parent_task_id) {
      const arr = byParent.get(t.parent_task_id) || []
      arr.push(t)
      byParent.set(t.parent_task_id, arr)
    }
  }
  return { byId, byParent }
}

// done/total of a parent's (non-archived) subtasks, or null if it has none.
export function progressOf(taskId, byParent) {
  const subs = byParent.get(taskId)
  if (!subs || !subs.length) return null
  return { done: subs.filter((s) => s.status === 'done').length, total: subs.length }
}

// The category id to DISPLAY for a task: a subtask shows its parent's category;
// a top-level task shows its own. Returns an id or null.
export function displayCatId(task, byId) {
  if (task.parent_task_id) {
    const parent = byId.get(task.parent_task_id)
    return parent ? parent.category_id : null
  }
  return task.category_id
}

// The parent's title, for the "↳ under [Parent]" marker on a subtask.
export function parentTitle(task, byId) {
  const p = task.parent_task_id ? byId.get(task.parent_task_id) : null
  return p ? p.title : ''
}
