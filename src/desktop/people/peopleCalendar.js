// LifeOS — People → Calendar bridge (D12/2). Creates / updates / retires the
// yearly all-day birthday event via the existing recurrence engine. The
// recurrence_id (recipe uuid) is stored on the people_dates row as a plain value.
// NO source tag on the event — identified through the chain.

import { supabase } from '../../spine/data/supabaseClient'
import { updateDate } from '../../spine/data/peopleWrite'

// ── Find-or-create the "Birthdays" category ─────────────────────────────
async function ensureBirthdaysCategory() {
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Birthdays')
    .is('archived_at', null)
    .maybeSingle()
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: 'Birthdays', color: 'plum' })
    .select('id')
    .single()
  if (error) throw new Error('Birthdays category: ' + error.message)
  return data.id
}

// ── Create a yearly all-day recurring birthday event ────────────────────
// Uses the same materialiseSeries path as the form-based recurrence creation.
// Returns the recurrence_id (the recipe's uuid).
export async function createBirthdaySeries(personName, dateValue, eventTitle) {
  const categoryId = await ensureBirthdaysCategory()

  const recipe = {
    target_kind: 'event',
    freq: 'yearly',
    end_kind: 'never',
    start_date: dateValue,
    all_day: true,
    wall_time: null,
    duration_minutes: null,
    timezone: 'Europe/Amsterdam',
    title: eventTitle || `${personName}'s birthday`,
    notes: null,
    category_id: categoryId,
    location: null,
  }

  // Insert the recipe
  const HORIZON_DAYS = 365
  const addDaysYMD = (ymd, n) => {
    const d = new Date(`${ymd}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + n)
    const p = (v) => String(v).padStart(2, '0')
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
  }
  const generatedUntil = addDaysYMD(dateValue, HORIZON_DAYS)

  const { data: made, error: recErr } = await supabase
    .from('recurrences')
    .insert({
      target_kind: 'event', freq: 'yearly', weekdays: null,
      end_kind: 'never', end_count: null, end_until: null,
      start_date: dateValue, wall_time: null, duration_minutes: null,
      timezone: 'Europe/Amsterdam', title: recipe.title, notes: null,
      category_id: categoryId, location: null, all_day: true,
      time_bucket: null, generated_until: generatedUntil, split_parent_id: null,
    })
    .select('id')
    .single()
  if (recErr) throw new Error('recurrence insert: ' + recErr.message)

  // Generate occurrence dates (yearly from start_date through horizon)
  const occDates = []
  let cur = dateValue
  while (cur <= generatedUntil) {
    occDates.push(cur)
    const [y, m, d] = cur.split('-').map(Number)
    const nextYear = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    // Handle Feb 29 → skip non-leap years
    const check = new Date(`${nextYear}T12:00:00Z`)
    if (check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) { cur = nextYear; continue }
    cur = nextYear
  }

  // Insert occurrence events
  const midnightIso = (ymd) => { const [y2, m2, d2] = ymd.split('-').map(Number); return new Date(y2, m2 - 1, d2).toISOString() }
  const rows = occDates.map((ymd) => ({
    title: recipe.title, notes: null, category_id: categoryId,
    location: null, all_day: true,
    start_at: midnightIso(ymd),
    end_at: midnightIso(addDaysYMD(ymd, 1)),
    series_id: made.id, series_detached: false,
  }))
  if (rows.length) {
    const { error: occErr } = await supabase.from('events').insert(rows)
    if (occErr) { await supabase.from('recurrences').delete().eq('id', made.id); throw new Error('event insert: ' + occErr.message) }
  }

  return made.id
}

// ── Retire a birthday series (archive events + stop the recipe) ─────────
export async function retireBirthdaySeries(recurrenceId) {
  if (!recurrenceId) return
  // Archive all events in this series
  const { data: evts } = await supabase
    .from('events')
    .select('id')
    .eq('series_id', recurrenceId)
    .is('archived_at', null)
  if (evts && evts.length) {
    const { data: batch } = await supabase
      .from('archive_batches')
      .insert({ label: 'Birthday event', source_type: 'event' })
      .select('id').single()
    if (batch) {
      await supabase.from('events')
        .update({ archived_at: new Date().toISOString(), archive_batch_id: batch.id })
        .eq('series_id', recurrenceId)
        .is('archived_at', null)
    }
  }
  // Retire the recipe (end before start → topup never regenerates)
  const { data: rec } = await supabase.from('recurrences').select('start_date').eq('id', recurrenceId).maybeSingle()
  if (rec) {
    const dayBefore = rec.start_date // end_until = start_date means no future dates
    await supabase.from('recurrences').update({ end_kind: 'until', end_until: dayBefore, end_count: null, generated_until: dayBefore }).eq('id', recurrenceId)
  }
}

// ── Wire a date row to its calendar event ───────────────────────────────
// Call after saving a birthday: creates or retires the series, stores the id.
export async function syncDateCalendar(dateRowId, personName, dateValue, showOnCalendar, existingRecurrenceId, eventTitle) {
  if (showOnCalendar) {
    // Retire old if exists, then create fresh
    if (existingRecurrenceId) await retireBirthdaySeries(existingRecurrenceId)
    const newId = await createBirthdaySeries(personName, dateValue, eventTitle)
    await updateDate(dateRowId, { recurrenceId: newId })
    return newId
  } else {
    if (existingRecurrenceId) {
      await retireBirthdaySeries(existingRecurrenceId)
      await updateDate(dateRowId, { recurrenceId: null })
    }
    return null
  }
}

// ── Re-materialise all calendar dates for a restored person ──────────
// After un-archiving, recreate series for every show_on_calendar date
// that doesn't already have live events. Guards against duplicates.
export async function rematerialisePersonDates(personId, personName) {
  const { data: dates } = await supabase
    .from('people_dates')
    .select('id, kind, label, date_value, show_on_calendar, recurrence_id')
    .eq('person_id', personId)
    .eq('show_on_calendar', true)
  if (!dates || !dates.length) return
  for (const d of dates) {
    if (d.recurrence_id) {
      const { data: live } = await supabase
        .from('events').select('id').eq('series_id', d.recurrence_id)
        .is('archived_at', null).limit(1)
      if (live && live.length) continue
    }
    const title = d.kind === 'birthday'
      ? `${personName}'s birthday`
      : `${personName} — ${d.label || 'Date'}`
    if (d.recurrence_id) await retireBirthdaySeries(d.recurrence_id)
    const newId = await createBirthdaySeries(personName, d.date_value, title)
    await updateDate(d.id, { recurrenceId: newId })
  }
}
