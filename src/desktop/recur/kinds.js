import { wallTimeToInstant, wallOfInstant, ymdInZone, addDaysYMD } from './engine'

// LifeOS — kind-specific helpers for the recurrence engine (extracted from
// series.js, Piece 6b). Each function dispatches on target_kind ('event',
// 'task', 'transaction'). series.js imports these and stays focused on the
// CRUD / edit / delete orchestration. Pure functions + no data access.

const midnightIso = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).toISOString() }
const durMin = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000))

// 1. tableFor — the Supabase table name for a given kind.
export const tableFor = (kind) => {
  if (kind === 'event') return 'events'
  if (kind === 'transaction') return 'finance_transactions'
  return 'tasks'
}

// 2. occurrenceRow — one occurrence ROW for a date, from the recipe's template.
export function occurrenceRow(recipe, ymd) {
  const { target_kind, all_day, wall_time, duration_minutes, timezone } = recipe
  const dur = duration_minutes || 60
  if (target_kind === 'event') {
    if (all_day || !wall_time) {
      return { title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
        location: recipe.location || null, all_day: true, start_at: midnightIso(ymd), end_at: midnightIso(addDaysYMD(ymd, 1)) }
    }
    const start = wallTimeToInstant(ymd, wall_time, timezone)
    return { title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
      location: recipe.location || null, all_day: false, start_at: start.toISOString(), end_at: new Date(start.getTime() + dur * 60000).toISOString() }
  }
  if (target_kind === 'transaction') {
    return {
      account_id: recipe.account_id || null,
      transfer_account_id: recipe.transfer_account_id || null,
      entry_date: ymd,
      amount: recipe.amount ?? 0,
      txn_type: recipe.txn_type || 'expense',
      category_id: recipe.category_id || null,
      description: recipe.title || null,
      source: 'recurring',
    }
  }
  // task
  const row = { title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
    due_date: ymd, status: 'open', time_bucket: recipe.time_bucket || 'Today' }
  if (wall_time) {
    const start = wallTimeToInstant(ymd, wall_time, timezone)
    row.scheduled_start = start.toISOString()
    row.scheduled_end = new Date(start.getTime() + dur * 60000).toISOString()
  }
  return row
}

// 3. templateFromFields — reads saved fields back into a template for All/Following edits.
export function templateFromFields(kind, f, tz) {
  if (kind === 'event') {
    const all_day = !!f.all_day
    return { title: f.title, notes: f.notes ?? null, category_id: f.category_id ?? null, location: f.location ?? null,
      all_day, wall_time: all_day ? null : wallOfInstant(f.start_at, tz), duration_minutes: all_day ? null : durMin(f.start_at, f.end_at) }
  }
  if (kind === 'transaction') {
    return { title: f.description ?? null, notes: null, category_id: f.category_id ?? null,
      amount: f.amount ?? null, txn_type: f.txn_type ?? null,
      account_id: f.account_id ?? null, transfer_account_id: f.transfer_account_id ?? null }
  }
  // task
  const timed = !!f.scheduled_start
  return { title: f.title, notes: f.notes ?? null, category_id: f.category_id ?? null, time_bucket: f.time_bucket || 'Today',
    wall_time: timed ? wallOfInstant(f.scheduled_start, tz) : null, duration_minutes: timed ? (f.scheduled_end ? durMin(f.scheduled_start, f.scheduled_end) : 60) : null }
}

// 4. contentFields — content-only fields to stamp on sibling occurrences.
export function contentFields(kind, f) {
  if (kind === 'event') {
    return { title: f.title, notes: f.notes ?? null, category_id: f.category_id ?? null, location: f.location ?? null }
  }
  if (kind === 'transaction') {
    return { description: f.description ?? null, category_id: f.category_id ?? null,
      amount: f.amount ?? null, txn_type: f.txn_type ?? null,
      account_id: f.account_id ?? null, transfer_account_id: f.transfer_account_id ?? null }
  }
  // task
  return { title: f.title, notes: f.notes ?? null, category_id: f.category_id ?? null, time_bucket: f.time_bucket || 'Today' }
}

// 5. timeFields — computes time/date columns for a sibling occurrence on a given ymd.
export function timeFields(kind, ymd, t, tz) {
  if (kind === 'event') {
    if (t.all_day || !t.wall_time) return { all_day: true, start_at: midnightIso(ymd), end_at: midnightIso(addDaysYMD(ymd, 1)) }
    const s = wallTimeToInstant(ymd, t.wall_time, tz)
    return { all_day: false, start_at: s.toISOString(), end_at: new Date(s.getTime() + (t.duration_minutes || 60) * 60000).toISOString() }
  }
  if (kind === 'transaction') {
    return { entry_date: ymd }
  }
  // task
  if (!t.wall_time) return { scheduled_start: null, scheduled_end: null }
  const s = wallTimeToInstant(ymd, t.wall_time, tz)
  return { scheduled_start: s.toISOString(), scheduled_end: new Date(s.getTime() + (t.duration_minutes || 60) * 60000).toISOString() }
}

// 6. occYMDof — extracts the calendar date from an occurrence row.
export const occYMDof = (kind, occ, tz) => {
  if (kind === 'event') return ymdInZone(occ.start_at, tz)
  if (kind === 'transaction') return occ.entry_date
  return occ.due_date
}

// 7. dateCol — the column name that carries the date for a given kind.
export const dateCol = (kind) => {
  if (kind === 'event') return 'start_at'
  if (kind === 'transaction') return 'entry_date'
  return 'due_date'
}

// timeChanged — whether the time template changed (edit-all needs to know).
export const timeChanged = (rec, t) => (!!rec.all_day) !== (!!t.all_day)
  || (rec.wall_time ? rec.wall_time.slice(0, 5) : null) !== (t.wall_time || null)
  || (rec.duration_minutes ?? null) !== (t.duration_minutes ?? null)
