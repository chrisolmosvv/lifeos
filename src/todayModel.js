// Pure helpers that turn the flat task list into the two Today modules:
// "tasks today" and "the next 7 days". No data access, no React — just shaping,
// so the rules are easy to read and change. Display logic only; the DB buckets
// (Today / This Week / Someday) are untouched. (Phase 7, T4 / Rebuild R1.)

import { isSameDay } from './dateUtils'

const PRIORITY_RANK = { high: 0, med: 1, low: 2 }
function rank(p) {
  return PRIORITY_RANK[p] ?? 3
}

// A task's due_date string ('YYYY-MM-DD') as a LOCAL date (no tz drift).
function dueLocal(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
// The day a scheduled task sits on (from its scheduled_start timestamp), local.
function scheduledDay(t) {
  if (!t.scheduled_start) return null
  const d = new Date(t.scheduled_start)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function midnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Build both modules from all tasks, anchored on `viewed` (the day on screen).
// `isToday` says whether the viewed day IS the real current day. Returns
// { tasksToday, next7, undated, total }.
//  - tasksToday / "viewed-day tasks":
//    • viewed == today: tasks due today OR in the Today bucket OR scheduled today
//      (open + completed-today, so the day's progress shows). Priority order.
//    • viewed != today: tasks DUE on the viewed day OR SCHEDULED on it (any
//      status). The "Today bucket" is a today-only notion — it does NOT apply to
//      other days.
//  - next7: top-level not-done tasks due/scheduled viewed+1..viewed+7, in date
//    order; undated not-done tasks (not Someday) sit at the bottom.
export function buildToday(tasks, viewed, isToday) {
  const all = tasks || []
  const topLevel = all.filter((t) => !t.parent_task_id)

  const viewedMid = midnight(viewed)
  const tomorrow = new Date(viewedMid)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekEnd = new Date(viewedMid)
  weekEnd.setDate(weekEnd.getDate() + 8) // viewed+1..viewed+7 (exclusive end)

  const inWindow = (d) => d && d >= tomorrow && d < weekEnd
  const dueOnViewed = (t) => {
    const d = dueLocal(t.due_date)
    return d && isSameDay(d, viewed)
  }
  const schOnViewed = (t) => {
    const d = scheduledDay(t)
    return d && isSameDay(d, viewed)
  }

  // --- tasks for the viewed day ------------------------------------------
  // "completed today" is a real-clock notion, so it only ever applies on today.
  const completedToday = (t) =>
    t.completed_at && isSameDay(new Date(t.completed_at), new Date())
  const tasksToday = topLevel
    .filter((t) => {
      if (!isToday) return dueOnViewed(t) || schOnViewed(t) // other day: any status
      if (t.status === 'done') return completedToday(t)
      return dueOnViewed(t) || schOnViewed(t) || t.time_bucket === 'Today'
    })
    .sort((a, b) => {
      const ad = a.status === 'done' ? 1 : 0
      const bd = b.status === 'done' ? 1 : 0
      if (ad !== bd) return ad - bd // open first, done sink to the bottom
      return rank(a.priority) - rank(b.priority) || a.title.localeCompare(b.title)
    })
  const todayIds = new Set(tasksToday.map((t) => t.id))

  // --- next 7 days (dated) ------------------------------------------------
  // Upcoming, not-done tasks (to do or in progress) not already shown today.
  const dated = topLevel
    .filter((t) => t.status !== 'done' && !todayIds.has(t.id))
    .map((t) => {
      const due = dueLocal(t.due_date)
      const sch = scheduledDay(t)
      const candidates = [due, sch].filter(inWindow)
      const eff = candidates.length
        ? new Date(Math.min(...candidates.map((d) => d.getTime())))
        : null
      return { task: t, eff }
    })
    .filter((x) => x.eff)
    .sort((a, b) => a.eff - b.eff || a.task.title.localeCompare(b.task.title))
    .map((x) => x.task)
  const datedIds = new Set(dated.map((t) => t.id))

  // --- undated (bottom of next-7; Someday deliberately excluded) ----------
  const undated = topLevel
    .filter(
      (t) =>
        t.status !== 'done' &&
        !t.due_date &&
        !t.scheduled_start &&
        t.time_bucket !== 'Someday' &&
        !todayIds.has(t.id) &&
        !datedIds.has(t.id),
    )
    .sort((a, b) => rank(a.priority) - rank(b.priority) || a.title.localeCompare(b.title))

  return { tasksToday, next7: dated, undated, total: all.length }
}
