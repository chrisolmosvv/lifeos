// LifeOS — People (Rolodex): WRITES (D4). Plain DB writes, no React.
// Mirrors foodWrite.js. RLS scopes every write to the owner; people.user_id
// defaults to auth.uid(). FETCH stays in peopleLoad.

import { supabase } from './supabaseClient.js'

// Insert a name-only person (the quick-add). Returns the inserted row.
export async function createPerson(name) {
  const { data, error } = await supabase
    .from('people')
    .insert({ name, source: 'app' })
    .select('id, name, created_at')
    .single()
  if (error) throw new Error(error.message)
  return data
}

// Archive a person (soft-delete: set archived_at). Birthday-event suspend is deferred to D11.
export async function archivePerson(id) {
  const { error } = await supabase
    .from('people')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// Restore an archived person (clear archived_at).
export async function restorePerson(id) {
  const { error } = await supabase
    .from('people')
    .update({ archived_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// Update a person's scalar fields. `fields` is { name, how_you_know, notes, phone, email, other_contact }.
export async function updatePerson(id, fields) {
  const { data, error } = await supabase
    .from('people')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data
}
