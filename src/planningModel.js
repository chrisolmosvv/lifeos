// Pure helpers for the Planning view's time mode (Phase 7 / T-track, P1). No data
// access, no React — they take the already-loaded task list and sort it into the
// four time lanes plus the Inbox rail. Compute-on-read: nothing is stored, no new
// column. The DB buckets (Today / This Week / Someday) are read, never written.
//
// The lanes are DERIVED from each task's date, using the same device-local day
// basis as the rest of the app (see todayModel.js). A task's "effective day" is
// its DUE date (the target day) if it has one, else its SCHEDULED day (the
// work-block) — so a scheduled-but-undated task is placed by the day it sits on.

import { isSameDay, startOfWeek } from './dateUtils'

const PRIORITY_RANK = { high: 0, med: 1, low: 2 }
const rank = (p) => PRIORITY_RANK[p] ?? 3

// A 'YYYY-MM-DD' due_date string as a LOCAL midnight date (no timezone drift).
function dueLocal(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
// The local day a scheduled task sits on (from its scheduled_start timestamp).
function scheduledDay(t) {
  if (!t.scheduled_start) return null
  const d = new Date(t.scheduled_start)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function midnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Sort by effective day soonest-first, then priority, then title. Tasks with no
// effective day (a Today-chipped task with no date) sink under the dated ones.
function byDayThenPriority(a, b) {
  const ae = a._eff
  const be = b._eff
  if (ae && be && ae.getTime() !== be.getTime()) return ae - be
  if (!ae !== !be) return ae ? -1 : 1
  return rank(a.task.priority) - rank(b.task.priority) || a.task.title.localeCompare(b.task.title)
}

// Split the tasks into { overdue, today, thisWeek, later, inbox }.
//
// Every top-level, not-done task lands in EXACTLY ONE lane (or none → the Inbox
// rail if it is uncategorised + undated). The precedence is a strict waterfall,
// so a task is never in two lanes and never silently dropped:
//   1. Overdue   — eff exists AND eff < today. A real past date wins outright; a
//                  Today-chip does NOT rescue an overdue task.
//   2. Today     — eff is today, OR time_bucket === 'Today'. (Because overdue is
//                  already taken, the Today-chip only ever pulls in tasks whose
//                  date is null / today / future — never a past one.)
//   3. This week — eff is after today, through the upcoming Sunday (inclusive).
//   4. Later     — eff is beyond that Sunday.
//   5. (none)    — no date and not Today-chipped → off the board. Uncategorised →
//                  the Inbox rail; categorised → the undated backlog (not shown
//                  in P1, surfaces in board/category mode later).
//
// `today` is a Date (the real current day). End of week = the upcoming Sunday
// (the app's weeks run Monday→Sunday via startOfWeek), so Planning stays in step
// with the Calendar.
export function buildPlanning(tasks, today) {
  const todayMid = midnight(today)
  const weekEnd = startOfWeek(today)
  weekEnd.setDate(weekEnd.getDate() + 6) // Monday + 6 = the upcoming Sunday (midnight)

  const overdue = []
  const todayLane = []
  const thisWeek = []
  const later = []
  const inbox = []

  for (const t of tasks || []) {
    if (t.parent_task_id) continue // top-level only
    if (t.status === 'done') continue // active only

    const eff = dueLocal(t.due_date) || scheduledDay(t)
    const entry = { task: t, _eff: eff }

    if (eff && eff < todayMid) {
      overdue.push(entry)
    } else if ((eff && isSameDay(eff, today)) || t.time_bucket === 'Today') {
      todayLane.push(entry)
    } else if (eff && eff <= weekEnd) {
      thisWeek.push(entry)
    } else if (eff) {
      later.push(entry)
    } else if (t.category_id == null) {
      // No date, not Today-chipped, uncategorised → the Inbox rail.
      inbox.push(entry)
    }
    // else: dated-less but categorised → the undated backlog (P1 shows it nowhere).
  }

  const unwrap = (list) => list.sort(byDayThenPriority).map((x) => x.task)
  return {
    overdue: unwrap(overdue),
    today: unwrap(todayLane),
    thisWeek: unwrap(thisWeek),
    later: unwrap(later),
    inbox: inbox
      .sort((a, b) => a.task.title.localeCompare(b.task.title))
      .map((x) => x.task),
  }
}
