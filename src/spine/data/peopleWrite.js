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

// ── Groups ──────────────────────────────────────────────────────────────────

export async function createGroup(name) {
  const { data, error } = await supabase
    .from('people_groups')
    .insert({ name })
    .select('id, name')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function renameGroup(id, name) {
  const { error } = await supabase
    .from('people_groups')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteGroup(id) {
  const { error } = await supabase
    .from('people_groups')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addGroupMember(groupId, personId) {
  const { error } = await supabase
    .from('people_group_members')
    .insert({ group_id: groupId, person_id: personId })
  if (error) throw new Error(error.message)
}

export async function removeGroupMember(groupId, personId) {
  const { error } = await supabase
    .from('people_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('person_id', personId)
  if (error) throw new Error(error.message)
}

// ── Connections ─────────────────────────────────────────────────────────────

// The directional presets: { label → inverse }. Symmetric presets just map to themselves.
const INVERSE = {
  parent: 'child', child: 'parent',
  grandparent: 'grandchild', grandchild: 'grandparent',
  mentor: 'mentee', mentee: 'mentor',
  'aunt/uncle': 'niece/nephew', 'niece/nephew': 'aunt/uncle',
}

// Add or update a connection between two people. `label` is the word the CALLER
// uses to describe the other person (e.g. caller adds otherPerson as "parent" →
// on caller's file otherPerson shows as "parent", on otherPerson's file the caller
// shows as "child"). Canonical ordering: person_a_id < person_b_id.
export async function addConnection(callerId, otherPersonId, label) {
  const a = callerId < otherPersonId ? callerId : otherPersonId
  const b = callerId < otherPersonId ? otherPersonId : callerId
  const callerIsA = callerId === a

  // Resolve the two-sided labels
  const inverse = INVERSE[label] || label || null
  const callerLabel = label || null
  const otherLabel = inverse
  const labelAtoB = callerIsA ? callerLabel : otherLabel
  const labelBtoA = callerIsA ? otherLabel : callerLabel

  // Upsert on the unique (person_a_id, person_b_id) — update label if already connected
  const { data, error } = await supabase
    .from('people_connections')
    .upsert({ person_a_id: a, person_b_id: b, label_a_to_b: labelAtoB, label_b_to_a: labelBtoA, source: 'app' },
      { onConflict: 'person_a_id,person_b_id' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function removeConnection(connectionId) {
  const { error } = await supabase
    .from('people_connections')
    .delete()
    .eq('id', connectionId)
  if (error) throw new Error(error.message)
}

// ── Interactions (catch-ups) ─────────────────────────────────────────────────

const todayYMD = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export async function logInteraction(personId, { date, time, channel, note }) {
  const { data, error } = await supabase
    .from('people_interactions')
    .insert({
      person_id: personId,
      interaction_date: date || todayYMD(),
      interaction_time: time || null,
      channel: channel || 'in_person',
      note: note?.trim() || null,
      source: 'app',
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateInteraction(id, fields) {
  const patch = { updated_at: new Date().toISOString() }
  if (fields.date !== undefined) patch.interaction_date = fields.date
  if (fields.time !== undefined) patch.interaction_time = fields.time || null
  if (fields.channel !== undefined) patch.channel = fields.channel
  if (fields.note !== undefined) patch.note = fields.note?.trim() || null
  const { error } = await supabase
    .from('people_interactions')
    .update(patch)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteInteraction(id) {
  const { error } = await supabase
    .from('people_interactions')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// Dates (birthday + custom) split to peopleWriteDates.js for the 250-line ceiling.
export { upsertBirthday, addCustomDate, updateDate, deleteDate } from './peopleWriteDates.js'

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
