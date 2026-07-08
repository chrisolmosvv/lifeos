import { supabase } from '../../spine/data/supabaseClient'
import { occurrencesBetween, addDaysYMD } from './engine'
import { tableFor, occurrenceRow } from './series'

// LifeOS — lazy top-up of the rolling window (T10, Piece 4). "Forever" series
// (recurrences.end_kind = 'never') were created with ~12 months of occurrences +
// generated_until set; this extends that window forward when the user navigates
// near/past its end. CLIENT-SIDE ONLY, triggered by the Week/Month fetch — no cron,
// no edge function (the whole reason the owner chose materialise-with-top-up).
// Bounded series (count / until) generated fully up front and are left untouched.
const BUFFER_DAYS = 31   // top up a series whose window ends within a month of the target
const AHEAD_DAYS = 365   // ...out to ~12 months beyond the target

// An in-flight guard so a burst of fetches can't re-enter and double-insert; the
// real duplicate protection is the strictly-after-generated_until date filter below.
let inFlight = false

// Ensure every "forever" series is materialised through ~12 months beyond targetYMD.
// Idempotent: a series already covering the target is skipped (the query filter). It
// generates ONLY dates strictly AFTER each series' generated_until, so re-calling can
// never double an occurrence at the window boundary. Best-effort (never blocks nav).
// Returns true if any occurrence was inserted (so the caller can refetch to show it).
export async function ensureGeneratedThrough(targetYMD) {
  if (inFlight) return false
  inFlight = true
  try {
    const needBy = addDaysYMD(targetYMD, BUFFER_DAYS)
    const { data: recs, error } = await supabase
      .from('recurrences').select('*').eq('end_kind', 'never').lt('generated_until', needBy)
    if (error || !recs || !recs.length) return false

    const newEnd = addDaysYMD(targetYMD, AHEAD_DAYS)
    let inserted = false
    for (const rec of recs) {
      if (!rec.generated_until) continue
      const from = addDaysYMD(rec.generated_until, 1) // STRICTLY after → the duplicate guard
      if (from > newEnd) continue
      const dates = occurrencesBetween(rec, from, newEnd)
      if (dates.length) {
        const rows = dates.map((ymd) => ({ ...occurrenceRow(rec, ymd), series_id: rec.id, series_detached: false }))
        const { error: ie } = await supabase.from(tableFor(rec.target_kind)).insert(rows)
        if (ie) continue // best-effort: skip this series, don't block navigation
        inserted = true
      }
      await supabase.from('recurrences').update({ generated_until: newEnd }).eq('id', rec.id)
    }
    return inserted
  } finally {
    inFlight = false
  }
}
