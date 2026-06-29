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
// A local Date as a 'YYYY-MM-DD' string (the spine's due_date shape, no tz drift).
function dateStr(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
// The upcoming Sunday (this Mon→Sun week's end) at local midnight.
function endOfWeek(today) {
  const sun = startOfWeek(today)
  sun.setDate(sun.getDate() + 6)
  return sun
}

// Which lane a single top-level, not-done task falls in — the strict precedence
// (see buildPlanning). Returns 'overdue' | 'today' | 'thisWeek' | 'later', or null
// when it has no date and isn't Today-chipped (off the board → maybe the rail).
export function laneOf(task, today) {
  const eff = dueLocal(task.due_date) || scheduledDay(task)
  const todayMid = midnight(today)
  const weekEnd = endOfWeek(today)
  if (eff && eff < todayMid) return 'overdue'
  if ((eff && isSameDay(eff, today)) || task.time_bucket === 'Today') return 'today'
  if (eff && eff <= weekEnd) return 'thisWeek'
  if (eff) return 'later'
  return null
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
  const lists = { overdue: [], today: [], thisWeek: [], later: [] }
  const inbox = []

  for (const t of tasks || []) {
    if (t.parent_task_id) continue // top-level only
    if (t.status === 'done') continue // active only

    const eff = dueLocal(t.due_date) || scheduledDay(t)
    const entry = { task: t, _eff: eff }
    const lane = laneOf(t, today)

    if (lane) {
      lists[lane].push(entry)
    } else if (t.category_id == null) {
      // No date, not Today-chipped, uncategorised → the Inbox rail.
      inbox.push(entry)
    }
    // else: dated-less but categorised → the undated backlog (P1 shows it nowhere).
  }
  const { overdue, today: todayLane, thisWeek, later } = lists

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

// What a lane-to-lane drag should WRITE (P2). Pure: given the dragged task, the
// lane it was dropped on, and today, it returns the minimal patch for the existing
// task-update path — or `null` for a no-op / rejected drop (so the caller writes
// nothing and the card snaps back). Lanes stay DERIVED: this only writes due_date
// (and, in one surgical case, the hidden Today-chip — see below); the re-read then
// re-derives placement.
//
// Rules:
//  - Overdue is NOT a drop target (you don't plan into the past) → null.
//  - Dropping on the lane the task is already in → null (no yank, no pointless write).
//  - Today → due_date = today.
//  - This week → keep the date if it's already within this week (after today through
//    Sunday); otherwise due_date = the upcoming Sunday.
//  - Later → keep the date if it's already beyond Sunday; otherwise due_date = the
//    Monday after this week.
//  - THE ONE BUCKET TOUCH: a task that is Today-chipped (time_bucket==='Today')
//    stays pinned to the Today lane for ANY non-past date, so setting due_date alone
//    can't move it — it would snap back. So when a chipped task is dropped into This
//    week or Later, also flip time_bucket 'Today' → 'This Week'. Never on a drop onto
//    Today, never for a dated-today / non-chipped task.
export function planDrop(task, target, today) {
  if (target === 'overdue') return null
  if (laneOf(task, today) === target) return null

  const due = task.due_date || null // 'YYYY-MM-DD' — string compare == date compare
  const todayStr = dateStr(today)
  const sundayStr = dateStr(endOfWeek(today))
  const nextMonStr = dateStr(addDays(endOfWeek(today), 1))

  let newDue = due
  if (target === 'today') {
    newDue = todayStr
  } else if (target === 'thisWeek') {
    const inWeek = due && due > todayStr && due <= sundayStr
    if (!inWeek) newDue = sundayStr
  } else if (target === 'later') {
    const isLater = due && due > sundayStr
    if (!isLater) newDue = nextMonStr
  }

  const patch = {}
  if (newDue !== due) patch.due_date = newDue
  if ((target === 'thisWeek' || target === 'later') && task.time_bucket === 'Today')
    patch.time_bucket = 'This Week'
  return Object.keys(patch).length ? patch : null
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
