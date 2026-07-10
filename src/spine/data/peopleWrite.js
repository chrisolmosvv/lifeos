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

// ── Circles ─────────────────────────────────────────────────────────────────

export async function createCircle(name) {
  const { data, error } = await supabase
    .from('people_circles')
    .insert({ name })
    .select('id, name, sort_order')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function renameCircle(id, name) {
  const { error } = await supabase
    .from('people_circles')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// Write the sort_order for each circle. `orderedIds` is the array of circle ids in the desired order.
export async function reorderCircles(orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('people_circles')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
    if (error) throw new Error(error.message)
  }
}

// Delete a circle. ON DELETE CASCADE on people_circle_members means members lose
// that membership → if it was their home circle, they become Unfiled.
export async function deleteCircle(id) {
  const { error } = await supabase
    .from('people_circles')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Circle membership ───────────────────────────────────────────────────────

// Set a person's circle memberships: exactly one home (or null = Unfiled) + zero
// or more others. Replaces all existing memberships for this person.
export async function setPersonCircles(personId, homeCircleId, otherCircleIds) {
  // 1. Delete all existing memberships
  const { error: de } = await supabase
    .from('people_circle_members')
    .delete()
    .eq('person_id', personId)
  if (de) throw new Error(de.message)

  // 2. Insert the new set
  const rows = []
  if (homeCircleId) rows.push({ person_id: personId, circle_id: homeCircleId, is_home: true })
  for (const cid of otherCircleIds || []) {
    if (cid !== homeCircleId) rows.push({ person_id: personId, circle_id: cid, is_home: false })
  }
  if (rows.length) {
    const { error: ie } = await supabase.from('people_circle_members').insert(rows)
    if (ie) throw new Error(ie.message)
  }
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
