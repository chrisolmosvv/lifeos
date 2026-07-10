import { supabase } from '../../spine/data/supabaseClient'
import { archiveRows, unarchiveBatch } from '../archive'
import { occurrencesBetween, addDaysYMD } from './engine'
import { tableFor, occurrenceRow, templateFromFields, contentFields, timeFields, occYMDof, dateCol, timeChanged } from './kinds'

// LifeOS — series creation, materialisation + editing (T10, Pieces 2B + 3a).
// Approach A: a recipe (recurrences row) generates real events/tasks/transactions
// ("occurrences") that render through the existing pipeline. Kind-specific helpers
// live in kinds.js; this file owns the orchestration (create / edit / delete).
const HORIZON_DAYS = 365

// Re-export for topup.js and other callers that import from series.
export { tableFor, occurrenceRow }

const friendly = (e) => (e?.code === '23514' ? 'That repeat has times that end before they start — check them.' : e?.message || 'Could not save the repeat.')

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
    // Transaction-template fields (null for event/task recipes, populated for transaction).
    amount: recipe.amount ?? null, account_id: recipe.account_id ?? null,
    transfer_account_id: recipe.transfer_account_id ?? null, txn_type: recipe.txn_type ?? null,
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
  const dc = dateCol(kind)
  const { data: occs, error: fe } = await supabase.from(table).select(`id, ${dc}`).eq('series_id', seriesId).eq('series_detached', false).is('archived_at', null)
  if (fe) return friendly(fe)
  for (const o of occs || []) {
    const { error } = await supabase.from(table).update(timeFields(kind, occYMDof(kind, o, tz), t, tz)).eq('id', o.id)
    if (error) return friendly(error)
  }
  return null
}

// "This and following": keep the past, make this-and-forward a NEW series with the
// change. Returns { error } or { undo }.
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

  const dc = dateCol(kind)
  const { data: occs, error: qe } = await supabase.from(table).select(`id, ${dc}, series_detached`).eq('series_id', seriesId).is('archived_at', null)
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
    amount: t.amount ?? null, account_id: t.account_id ?? null,
    transfer_account_id: t.transfer_account_id ?? null, txn_type: t.txn_type ?? null,
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

// Reverse a "this and following" split completely.
export async function undoSeriesSplit({ kind, newSeriesId, oldSeriesId, oldEnd, batchId }) {
  await supabase.from(tableFor(kind)).delete().eq('series_id', newSeriesId)
  await supabase.from('recurrences').delete().eq('id', newSeriesId)
  await supabase.from('recurrences').update(oldEnd).eq('id', oldSeriesId)
  if (batchId) await unarchiveBatch(batchId)
}

// --- deleting a materialised occurrence (Piece 3b) -------------------------
export async function deleteOccurrenceScope(scope, kind, occ) {
  const table = tableFor(kind)
  if (scope === 'one') {
    const label = kind === 'transaction' ? 'Transaction' : (kind === 'task' ? 'Task' : 'Event')
    const r = await archiveRows(label, kind === 'transaction' ? 'transaction' : kind, [{ table, ids: [occ.id] }])
    return r.error ? { error: friendly(r.error) } : { undo: { batchId: r.batchId } }
  }
  const seriesId = occ.series_id
  const { data: rec, error: re } = await supabase.from('recurrences').select('*').eq('id', seriesId).single()
  if (re) return { error: friendly(re) }
  const tz = rec.timezone || 'Europe/Amsterdam'
  const oldEnd = { end_kind: rec.end_kind, end_count: rec.end_count, end_until: rec.end_until, generated_until: rec.generated_until }
  const dc = dateCol(kind)
  const { data: occs, error: qe } = await supabase.from(table).select(`id, ${dc}`).eq('series_id', seriesId).is('archived_at', null)
  if (qe) return { error: friendly(qe) }

  let ids
  let recipeUpdate
  if (scope === 'following') {
    const occYMD = occYMDof(kind, occ, tz)
    recipeUpdate = { end_kind: 'until', end_until: addDaysYMD(occYMD, -1), end_count: null }
    ids = (occs || []).filter((o) => occYMDof(kind, o, tz) >= occYMD).map((o) => o.id)
  } else {
    const dead = addDaysYMD(rec.start_date, -1)
    recipeUpdate = { end_kind: 'until', end_until: dead, end_count: null, generated_until: dead }
    ids = (occs || []).map((o) => o.id)
  }
  const { error: ue } = await supabase.from('recurrences').update(recipeUpdate).eq('id', seriesId)
  if (ue) return { error: friendly(ue) }
  const srcType = kind === 'transaction' ? 'transaction' : kind
  const r = ids.length ? await archiveRows(scope === 'all' ? 'Repeat (all)' : 'Repeat (following)', srcType, [{ table, ids }]) : { batchId: null }
  if (r.error) return { error: friendly(r.error) }
  return { undo: { batchId: r.batchId, recipeRestore: { id: seriesId, fields: oldEnd } } }
}

// Reverse a scoped delete.
export async function undoSeriesDelete({ batchId, recipeRestore }) {
  if (batchId) await unarchiveBatch(batchId)
  if (recipeRestore) await supabase.from('recurrences').update(recipeRestore.fields).eq('id', recipeRestore.id)
}
