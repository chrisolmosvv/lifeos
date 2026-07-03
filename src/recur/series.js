import { supabase } from '../supabaseClient'
import { occurrencesBetween, wallTimeToInstant, addDaysYMD } from './engine'

// LifeOS — series creation + materialisation (T10, Piece 2B). Approach A: on
// creating a repeat we (1) insert the recipe row (recurrences), (2) generate the
// occurrence DATES with the engine, (3) batch-insert the occurrence ROWS (real
// events/tasks), each stamped series_id = the recipe id, series_detached = false —
// so they render through the existing pipeline with no new drawing code. Writes go
// through the same client the rest of the app uses; user_id fills from the DB
// default (auth.uid()) per row, exactly like the one-off inserts.

// "Forever" repeats materialise a rolling window of ~12 months and record how far
// they've been generated (generated_until); Piece 4 will extend it lazily. Bounded
// repeats (count / until) generate fully up front.
const HORIZON_DAYS = 365

const midnightIso = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).toISOString() }
const friendly = (e) => (e?.code === '23514' ? 'That repeat has times that end before they start — check them.' : e?.message || 'Could not create the repeat.')

// Build one occurrence ROW for a given date, from the recipe's template. Returns
// an events-shaped or tasks-shaped object (minus series_id, added by the caller).
function occurrenceRow(recipe, ymd) {
  const { target_kind, all_day, wall_time, duration_minutes, timezone } = recipe
  const dur = duration_minutes || 60
  if (target_kind === 'event') {
    if (all_day || !wall_time) {
      // All-day occurrence: one day, end-EXCLUSIVE midnight (the existing convention).
      return {
        title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
        location: recipe.location || null, all_day: true,
        start_at: midnightIso(ymd), end_at: midnightIso(addDaysYMD(ymd, 1)),
      }
    }
    const start = wallTimeToInstant(ymd, wall_time, timezone)
    const end = new Date(start.getTime() + dur * 60000)
    return {
      title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
      location: recipe.location || null, all_day: false,
      start_at: start.toISOString(), end_at: end.toISOString(),
    }
  }
  // TASK occurrence: always due-dated + open + the recipe's bucket; ALSO calendar-
  // scheduled when the recipe carries a wall-clock time (the owner's "depends on
  // time" rule).
  const row = {
    title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
    due_date: ymd, status: 'open', time_bucket: recipe.time_bucket || 'Today',
  }
  if (wall_time) {
    const start = wallTimeToInstant(ymd, wall_time, timezone)
    row.scheduled_start = start.toISOString()
    row.scheduled_end = new Date(start.getTime() + dur * 60000).toISOString()
  }
  return row
}

// Insert the recipe + all its occurrences. Returns null on success, or a plain
// error message (for the form panel). Best-effort cleanup: if the occurrence
// batch fails, the just-created recipe is removed so no empty series is left.
export async function createSeriesAndMaterialise(recipe) {
  // 1) the window to generate now + how far we record having generated.
  let toYMD
  let generatedUntil
  if (recipe.end_kind === 'until') { toYMD = recipe.end_until; generatedUntil = recipe.end_until }
  else if (recipe.end_kind === 'count') { toYMD = '2999-12-31' } // the count itself stops it
  else { toYMD = addDaysYMD(recipe.start_date, HORIZON_DAYS); generatedUntil = toYMD }

  const dates = occurrencesBetween(recipe, recipe.start_date, toYMD)
  if (recipe.end_kind === 'count') generatedUntil = dates.length ? dates[dates.length - 1] : recipe.start_date
  if (!dates.length) return 'That repeat produces no dates — check the pattern.'

  // 2) insert the recipe row (all recurrences columns), get its id.
  const recipeRow = {
    target_kind: recipe.target_kind, freq: recipe.freq, weekdays: recipe.weekdays || null,
    end_kind: recipe.end_kind, end_count: recipe.end_count ?? null, end_until: recipe.end_until ?? null,
    start_date: recipe.start_date, wall_time: recipe.wall_time || null,
    duration_minutes: recipe.duration_minutes ?? null, timezone: recipe.timezone || 'Europe/Amsterdam',
    title: recipe.title, notes: recipe.notes || null, category_id: recipe.category_id || null,
    location: recipe.location || null, all_day: !!recipe.all_day,
    time_bucket: recipe.target_kind === 'task' ? (recipe.time_bucket || 'Today') : null,
    generated_until: generatedUntil,
  }
  const { data: made, error: recErr } = await supabase.from('recurrences').insert(recipeRow).select('id').single()
  if (recErr) return friendly(recErr)
  const seriesId = made.id

  // 3) batch-insert the occurrence rows, each linked to the recipe.
  const table = recipe.target_kind === 'event' ? 'events' : 'tasks'
  const rows = dates.map((ymd) => ({ ...occurrenceRow(recipe, ymd), series_id: seriesId, series_detached: false }))
  const { error: occErr } = await supabase.from(table).insert(rows)
  if (occErr) {
    await supabase.from('recurrences').delete().eq('id', seriesId) // drop the orphan recipe
    return friendly(occErr)
  }
  return null
}
