import { supabase } from '../supabaseClient'
import { archiveRows, unarchiveBatch } from '../archive'
import { occurrencesBetween, wallTimeToInstant, wallOfInstant, ymdInZone, addDaysYMD } from './engine'

// LifeOS — series creation, materialisation + editing (T10, Pieces 2B + 3a).
// Approach A: a recipe (recurrences row) generates real events/tasks ("occurrences")
// that render through the existing pipeline. Writes go through the same client the
// rest of the app uses (user_id fills from the DB default per row). Editing an
// occurrence has three scopes: this one / this and following / all.
const HORIZON_DAYS = 365

const tableFor = (kind) => (kind === 'event' ? 'events' : 'tasks')
const midnightIso = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).toISOString() }
const durMin = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000))
const friendly = (e) => (e?.code === '23514' ? 'That repeat has times that end before they start — check them.' : e?.message || 'Could not save the repeat.')

// One occurrence ROW for a date, from the recipe's template (minus series_id).
function occurrenceRow(recipe, ymd) {
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
  const row = { title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
    due_date: ymd, status: 'open', time_bucket: recipe.time_bucket || 'Today' }
  if (wall_time) {
    const start = wallTimeToInstant(ymd, wall_time, timezone)
    row.scheduled_start = start.toISOString()
    row.scheduled_end = new Date(start.getTime() + dur * 60000).toISOString()
  }
  return row
}

// Insert the recipe + its occurrences. `excludeDates` (a Set of YMD) skips dates
// that already hold a preserved (detached) occurrence — used by a split so a
// customised occurrence is never duplicated. Returns { seriesId } or { error }.
async function materialiseSeries(recipe, excludeDates) {
  let toYMD
  let generatedUntil
  if (recipe.end_kind === 'until') { toYMD = recipe.end_until; generatedUntil = recipe.end_until }
  else if (recipe.end_kind === 'count') { toYMD = '2999-12-31' }
  else { toYMD = addDaysYMD(recipe.start_date, HORIZON_DAYS); generatedUntil = toYMD }

  let dates = occurrencesBetween(recipe, recipe.start_date, toYMD)
  if (excludeDates && excludeDates.size) dates = dates.filter((d) => !excludeDates.has(d))
  if (recipe.end_kind === 'count') generatedUntil = dates.length ? dates[dates.length - 1] : recipe.start_date
  if (!dates.length) return { error: 'That repeat produces no dates — check the pattern.' }

  const recipeRow = {
    target_kind: recipe.target_kind, freq: recipe.freq, weekdays: recipe.weekdays || null,
    end_kind: recipe.end_kind, end_count: recipe.end_count ?? null, end_until: recipe.end_until ?? null,
    start_date: recipe.start_date, wall_time: recipe.wall_time || null,
    duration_minutes: recipe.duration_minutes ?? null, timezone: recipe.timezone || 'Europe/Amsterdam',
    title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
    location: recipe.location || null, all_day: !!recipe.all_day,
    time_bucket: recipe.target_kind === 'task' ? (recipe.time_bucket || 'Today') : null,
    generated_until: generatedUntil, split_parent_id: recipe.split_parent_id || null,
  }
  const { data: made, error: recErr } = await supabase.from('recurrences').insert(recipeRow).select('id').single()
  if (recErr) return { error: friendly(recErr) }

  const table = tableFor(recipe.target_kind)
  const rows = dates.map((ymd) => ({ ...occurrenceRow(recipe, ymd), series_id: made.id, series_detached: false }))
  const { error: occErr } = await supabase.from(table).insert(rows)
  if (occErr) { await supabase.from('recurrences').delete().eq('id', made.id); return { error: friendly(occErr) } }
  return { seriesId: made.id }
}

// Piece 2 entry: create a repeat → null on success, or a plain error message.
export async function createSeriesAndMaterialise(recipe) {
  const r = await materialiseSeries(recipe)
  return r.error || null
}

// --- editing a materialised occurrence (Piece 3a) --------------------------
// The recipe template implied by an edited occurrence's saved fields.
function templateFromFields(kind, f, tz) {
  if (kind === 'event') {
    const all_day = !!f.all_day
    return { title: f.title, notes: f.notes ?? null, category_id: f.category_id ?? null, location: f.location ?? null,
      all_day, wall_time: all_day ? null : wallOfInstant(f.start_at, tz), duration_minutes: all_day ? null : durMin(f.start_at, f.end_at) }
  }
  const timed = !!f.scheduled_start
  return { title: f.title, notes: f.notes ?? null, category_id: f.category_id ?? null, time_bucket: f.time_bucket || 'Today',
    wall_time: timed ? wallOfInstant(f.scheduled_start, tz) : null, duration_minutes: timed ? (f.scheduled_end ? durMin(f.scheduled_start, f.scheduled_end) : 60) : null }
}
// Content-only fields to stamp on sibling occurrences (no time, no status).
const contentFields = (kind, f) => kind === 'event'
  ? { title: f.title, notes: f.notes ?? null, category_id: f.category_id ?? null, location: f.location ?? null }
  : { title: f.title, notes: f.notes ?? null, category_id: f.category_id ?? null, time_bucket: f.time_bucket || 'Today' }
// Time fields for a sibling occurrence on `ymd`, from a template.
function timeFields(kind, ymd, t, tz) {
  if (kind === 'event') {
    if (t.all_day || !t.wall_time) return { all_day: true, start_at: midnightIso(ymd), end_at: midnightIso(addDaysYMD(ymd, 1)) }
    const s = wallTimeToInstant(ymd, t.wall_time, tz)
    return { all_day: false, start_at: s.toISOString(), end_at: new Date(s.getTime() + (t.duration_minutes || 60) * 60000).toISOString() }
  }
  if (!t.wall_time) return { scheduled_start: null, scheduled_end: null }
  const s = wallTimeToInstant(ymd, t.wall_time, tz)
  return { scheduled_start: s.toISOString(), scheduled_end: new Date(s.getTime() + (t.duration_minutes || 60) * 60000).toISOString() }
}
const timeChanged = (rec, t) => (!!rec.all_day) !== (!!t.all_day)
  || (rec.wall_time ? rec.wall_time.slice(0, 5) : null) !== (t.wall_time || null)
  || (rec.duration_minutes ?? null) !== (t.duration_minutes ?? null)
const occYMDof = (kind, occ, tz) => (kind === 'event' ? ymdInZone(occ.start_at, tz) : occ.due_date)

// "This one": edit just this occurrence + DETACH it (series edits skip it after).
export async function editThisOccurrence(kind, occId, fields) {
  const { error } = await supabase.from(tableFor(kind)).update({ ...fields, series_detached: true }).eq('id', occId)
  return error ? friendly(error) : null
}

// "All": update the recipe template + every NON-DETACHED occurrence. Content in one
// batch; if the time/all-day changed, recompute each occurrence's time per its own
// date (DST-correct). Detached occurrences are left alone. Task status is untouched.
export async function editWholeSeries(kind, seriesId, fields) {
  const table = tableFor(kind)
  const { data: rec, error: re } = await supabase.from('recurrences').select('*').eq('id', seriesId).single()
  if (re) return friendly(re)
  const tz = rec.timezone || 'Europe/Amsterdam'
  const t = templateFromFields(kind, fields, tz)
  const { error: ue } = await supabase.from('recurrences').update(t).eq('id', seriesId)
  if (ue) return friendly(ue)
  const { error: ce } = await supabase.from(table).update(contentFields(kind, fields)).eq('series_id', seriesId).eq('series_detached', false).is('archived_at', null)
  if (ce) return friendly(ce)
  if (!timeChanged(rec, t)) return null
  const dateCol = kind === 'event' ? 'start_at' : 'due_date'
  const { data: occs, error: fe } = await supabase.from(table).select(`id, ${dateCol}`).eq('series_id', seriesId).eq('series_detached', false).is('archived_at', null)
  if (fe) return friendly(fe)
  for (const o of occs || []) {
    const { error } = await supabase.from(table).update(timeFields(kind, occYMDof(kind, o, tz), t, tz)).eq('id', o.id)
    if (error) return friendly(error)
  }
  return null
}

// "This and following": keep the past, make this-and-forward a NEW series with the
// change. (1) bound the old recipe before this date; (2) archive this + later
// non-detached occurrences as ONE batch; (3) create the new recipe (split_parent_id,
// remaining end), skipping dates that already hold a preserved detached occurrence.
// Returns { error } or { undo } — a complete reversal for the toast.
export async function editThisAndFollowing(kind, occurrence, fields) {
  const table = tableFor(kind)
  const seriesId = occurrence.series_id
  const { data: rec, error: re } = await supabase.from('recurrences').select('*').eq('id', seriesId).single()
  if (re) return { error: friendly(re) }
  const tz = rec.timezone || 'Europe/Amsterdam'
  const occYMD = occYMDof(kind, occurrence, tz)
  const dayBefore = addDaysYMD(occYMD, -1)

  const oldEnd = { end_kind: rec.end_kind, end_count: rec.end_count, end_until: rec.end_until, generated_until: rec.generated_until }
  const { error: be } = await supabase.from('recurrences').update({ end_kind: 'until', end_until: dayBefore, end_count: null }).eq('id', seriesId)
  if (be) return { error: friendly(be) }

  const dateCol = kind === 'event' ? 'start_at' : 'due_date'
  const { data: occs, error: qe } = await supabase.from(table).select(`id, ${dateCol}, series_detached`).eq('series_id', seriesId).is('archived_at', null)
  if (qe) return { error: friendly(qe) }
  const futureIds = (occs || []).filter((o) => !o.series_detached && occYMDof(kind, o, tz) >= occYMD).map((o) => o.id)
  const keepDates = new Set((occs || []).filter((o) => o.series_detached && occYMDof(kind, o, tz) >= occYMD).map((o) => occYMDof(kind, o, tz)))
  const arch = futureIds.length ? await archiveRows('Repeat split', kind, [{ table, ids: futureIds }]) : { batchId: null }
  if (arch.error) return { error: friendly(arch.error) }

  const t = templateFromFields(kind, fields, tz)
  const before = occurrencesBetween(rec, rec.start_date, dayBefore).length
  const newRecipe = {
    target_kind: kind, freq: rec.freq, weekdays: rec.weekdays,
    end_kind: rec.end_kind, end_count: rec.end_kind === 'count' ? Math.max(1, (rec.end_count || 0) - before) : null,
    end_until: rec.end_kind === 'until' ? rec.end_until : null,
    start_date: occYMD, timezone: tz, split_parent_id: seriesId,
    title: t.title, notes: t.notes, category_id: t.category_id, location: t.location ?? null,
    all_day: !!t.all_day, wall_time: t.wall_time, duration_minutes: t.duration_minutes,
    time_bucket: kind === 'task' ? t.time_bucket : null,
  }
  const made = await materialiseSeries(newRecipe, keepDates)
  if (made.error) return { error: made.error }
  return { undo: { kind, newSeriesId: made.seriesId, oldSeriesId: seriesId, oldEnd, batchId: arch.batchId } }
}

// Dispatch an occurrence edit by the chosen scope. Returns { error } | { undo? }.
export async function applyOccurrenceEdit(scope, kind, occ, fields) {
  if (scope === 'one') { const e = await editThisOccurrence(kind, occ.id, fields); return e ? { error: e } : {} }
  if (scope === 'all') { const e = await editWholeSeries(kind, occ.series_id, fields); return e ? { error: e } : {} }
  return editThisAndFollowing(kind, occ, fields)
}

// Reverse a "this and following" split completely: drop the new occurrences + new
// recipe, restore the old recipe's end, and un-archive the old future occurrences.
export async function undoSeriesSplit({ kind, newSeriesId, oldSeriesId, oldEnd, batchId }) {
  await supabase.from(tableFor(kind)).delete().eq('series_id', newSeriesId)
  await supabase.from('recurrences').delete().eq('id', newSeriesId)
  await supabase.from('recurrences').update(oldEnd).eq('id', oldSeriesId)
  if (batchId) await unarchiveBatch(batchId)
}

// --- deleting a materialised occurrence (Piece 3b) -------------------------
// Delete is a CLEAN SWEEP: a series-scope delete removes EVERYTHING in scope,
// INCLUDING customised (detached) occurrences (contrast the edit, which preserves
// them). All via the soft-delete archive batch, so every delete is one undoable
// unit. Returns { error } | { undo }.
export async function deleteOccurrenceScope(scope, kind, occ) {
  const table = tableFor(kind)
  if (scope === 'one') {
    const r = await archiveRows(kind === 'task' ? 'Task' : 'Event', kind, [{ table, ids: [occ.id] }])
    return r.error ? { error: friendly(r.error) } : { undo: { batchId: r.batchId } }
  }
  const seriesId = occ.series_id
  const { data: rec, error: re } = await supabase.from('recurrences').select('*').eq('id', seriesId).single()
  if (re) return { error: friendly(re) }
  const tz = rec.timezone || 'Europe/Amsterdam'
  const oldEnd = { end_kind: rec.end_kind, end_count: rec.end_count, end_until: rec.end_until, generated_until: rec.generated_until }
  const dateCol = kind === 'event' ? 'start_at' : 'due_date'
  const { data: occs, error: qe } = await supabase.from(table).select(`id, ${dateCol}`).eq('series_id', seriesId).is('archived_at', null)
  if (qe) return { error: friendly(qe) }

  let ids
  let recipeUpdate
  if (scope === 'following') {
    const occYMD = occYMDof(kind, occ, tz)
    recipeUpdate = { end_kind: 'until', end_until: addDaysYMD(occYMD, -1), end_count: null } // stop generating on/after this date
    ids = (occs || []).filter((o) => occYMDof(kind, o, tz) >= occYMD).map((o) => o.id)
  } else { // all → retire the recipe so it never tops up / regenerates
    const dead = addDaysYMD(rec.start_date, -1)
    recipeUpdate = { end_kind: 'until', end_until: dead, end_count: null, generated_until: dead }
    ids = (occs || []).map((o) => o.id)
  }
  const { error: ue } = await supabase.from('recurrences').update(recipeUpdate).eq('id', seriesId)
  if (ue) return { error: friendly(ue) }
  const r = ids.length ? await archiveRows(scope === 'all' ? 'Repeat (all)' : 'Repeat (following)', kind, [{ table, ids }]) : { batchId: null }
  if (r.error) return { error: friendly(r.error) }
  return { undo: { batchId: r.batchId, recipeRestore: { id: seriesId, fields: oldEnd } } }
}

// Reverse a scoped delete: un-archive the batch and (for series scopes) restore the
// recipe's end so it isn't left retired/bounded.
export async function undoSeriesDelete({ batchId, recipeRestore }) {
  if (batchId) await unarchiveBatch(batchId)
  if (recipeRestore) await supabase.from('recurrences').update(recipeRestore.fields).eq('id', recipeRestore.id)
}
