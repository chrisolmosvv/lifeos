// LifeOS — People (Rolodex): the thin FETCH-ONLY loader (D3).
//
// Reads the owner's people + circles + last-contact for the directory. NO writes
// (those arrive with the add piece). Mirrors foodLoad.js — RLS scopes every read
// to the owner, so these are plain selects.

import { supabase } from './supabaseClient.js'

// ── Circles (custom sort order) ─────────────────────────────────────────────
export async function listCircles() {
  const { data, error } = await supabase
    .from('people_circles')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error('people_circles: ' + error.message)
  return data || []
}

// ── Directory listing ───────────────────────────────────────────────────────
// All non-archived people with:
//   - their HOME circle (from people_circle_members where is_home = true)
//   - their LAST CONTACT date (max interaction_date, computed on read)
// Shaped for the directory: grouped by home circle, Unfiled last, within a
// circle ordered by most-recent-contact first (never-contacted at the end).

const PERSON_COLS = 'id, name, how_you_know, archived_at, created_at'

export async function listDirectory() {
  // 1. All active people
  const { data: people, error: pe } = await supabase
    .from('people')
    .select(PERSON_COLS)
    .is('archived_at', null)
    .order('name', { ascending: true })
  if (pe) throw new Error('people: ' + pe.message)
  if (!people || !people.length) return []

  const ids = people.map((p) => p.id)

  // 2. Home circle memberships (is_home = true) for all active people
  const { data: homes, error: he } = await supabase
    .from('people_circle_members')
    .select('person_id, circle_id')
    .in('person_id', ids)
    .eq('is_home', true)
  if (he) throw new Error('people_circle_members: ' + he.message)

  const homeByPerson = new Map()
  for (const h of homes || []) homeByPerson.set(h.person_id, h.circle_id)

  // 3. Last contact per person (most recent interaction_date)
  const { data: interactions, error: ie } = await supabase
    .from('people_interactions')
    .select('person_id, interaction_date')
    .in('person_id', ids)
    .order('interaction_date', { ascending: false })
  if (ie) throw new Error('people_interactions: ' + ie.message)

  const lastByPerson = new Map()
  for (const i of interactions || []) {
    if (!lastByPerson.has(i.person_id)) lastByPerson.set(i.person_id, i.interaction_date)
  }

  // 4. Shape each person for the directory
  return people.map((p) => ({
    id: p.id,
    name: p.name,
    how_you_know: p.how_you_know,
    home_circle_id: homeByPerson.get(p.id) || null,
    last_contact: lastByPerson.get(p.id) || null,
  }))
}
