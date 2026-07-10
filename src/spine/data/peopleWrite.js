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
