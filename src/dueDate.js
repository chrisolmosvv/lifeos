// Helpers for a task's due_date — a calendar date ("due by X"), NOT a scheduled
// time (that's scheduled_start/end on the calendar). Stored as 'YYYY-MM-DD'.
// Parsed as a LOCAL date so a deadline never shifts a day across time zones.

const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function localDate(dueStr) {
  const [y, m, d] = dueStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 'none' | 'overdue' | 'today' | 'upcoming'. Purely temporal — completion is the
// caller's concern (a done task is never styled overdue).
export function dueStatus(dueStr) {
  if (!dueStr) return 'none'
  const due = localDate(dueStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

// A calm dateline: "Due today", "Due Jun 25", or "Due Jun 25, 2027" off-year.
export function formatDue(dueStr) {
  if (!dueStr) return ''
  if (dueStatus(dueStr) === 'today') return 'Due today'
  const [y, m, d] = dueStr.split('-').map(Number)
  const yr = y === new Date().getFullYear() ? '' : `, ${y}`
  return `Due ${MO[m - 1]} ${d}${yr}`
}
