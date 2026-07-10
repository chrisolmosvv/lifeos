// LifeOS — People (Rolodex): date writes (split from peopleWrite for the 250-line ceiling).

import { supabase } from './supabaseClient.js'

function buildDateValue(month, day, year) {
  const p = (n) => String(n).padStart(2, '0')
  return `${year || 2000}-${p(month)}-${p(day)}`
}

export async function upsertBirthday(personId, { month, day, year, showOnCalendar }) {
  const yearKnown = !!year
  const dateValue = buildDateValue(month, day, year)
  const { data: existing } = await supabase
    .from('people_dates').select('id').eq('person_id', personId).eq('kind', 'birthday').maybeSingle()
  if (existing) {
    const { error } = await supabase.from('people_dates')
      .update({ date_value: dateValue, year_known: yearKnown, show_on_calendar: showOnCalendar ?? true, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
    return existing.id
  }
  const { data, error } = await supabase.from('people_dates')
    .insert({ person_id: personId, kind: 'birthday', date_value: dateValue, year_known: yearKnown, show_on_calendar: showOnCalendar ?? true })
    .select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function addCustomDate(personId, { label, month, day, year }) {
  const yearKnown = !!year
  const dateValue = buildDateValue(month, day, year)
  const { data, error } = await supabase.from('people_dates')
    .insert({ person_id: personId, kind: 'custom', label: label || null, date_value: dateValue, year_known: yearKnown, show_on_calendar: false })
    .select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function updateDate(id, fields) {
  const patch = { updated_at: new Date().toISOString() }
  if (fields.month !== undefined && fields.day !== undefined) {
    patch.date_value = buildDateValue(fields.month, fields.day, fields.year)
    patch.year_known = !!fields.year
  }
  if (fields.label !== undefined) patch.label = fields.label || null
  if (fields.showOnCalendar !== undefined) patch.show_on_calendar = fields.showOnCalendar
  if (fields.recurrenceId !== undefined) patch.recurrence_id = fields.recurrenceId
  const { error } = await supabase.from('people_dates').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteDate(id) {
  const { error } = await supabase.from('people_dates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
