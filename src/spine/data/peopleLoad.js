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

// ── Person summary (for the focus panel) ──────────────────────────────────
// Returns the person's core info + connections (with per-side labels) +
// last 2–3 catch-ups. For a name-only person most sections come back empty.

const FULL_COLS = 'id, name, how_you_know, notes, phone, email, other_contact, source, created_at'

export async function loadPersonSummary(personId) {
  // 1. The person
  const { data: person, error: pe } = await supabase
    .from('people')
    .select(FULL_COLS)
    .eq('id', personId)
    .is('archived_at', null)
    .single()
  if (pe) throw new Error('people: ' + pe.message)

  // 2. Home circle
  const { data: homeMem } = await supabase
    .from('people_circle_members')
    .select('circle_id')
    .eq('person_id', personId)
    .eq('is_home', true)
    .maybeSingle()
  let homeCircleName = null
  if (homeMem?.circle_id) {
    const { data: circ } = await supabase
      .from('people_circles')
      .select('name')
      .eq('id', homeMem.circle_id)
      .single()
    homeCircleName = circ?.name || null
  }

  // 3. Connections (direct links) — fetch both sides
  const { data: connsA } = await supabase
    .from('people_connections')
    .select('id, person_b_id, label_a_to_b')
    .eq('person_a_id', personId)
  const { data: connsB } = await supabase
    .from('people_connections')
    .select('id, person_a_id, label_b_to_a')
    .eq('person_b_id', personId)

  // Resolve connected person names
  const connIds = [
    ...((connsA || []).map((c) => c.person_b_id)),
    ...((connsB || []).map((c) => c.person_a_id)),
  ]
  const nameMap = new Map()
  if (connIds.length) {
    const { data: names } = await supabase
      .from('people')
      .select('id, name')
      .in('id', connIds)
      .is('archived_at', null)
    for (const n of names || []) nameMap.set(n.id, n.name)
  }

  const connections = [
    ...((connsA || []).filter((c) => nameMap.has(c.person_b_id)).map((c) => ({
      id: c.id, personId: c.person_b_id, name: nameMap.get(c.person_b_id), label: c.label_a_to_b,
    }))),
    ...((connsB || []).filter((c) => nameMap.has(c.person_a_id)).map((c) => ({
      id: c.id, personId: c.person_a_id, name: nameMap.get(c.person_a_id), label: c.label_b_to_a,
    }))),
  ]

  // 4. Last 3 catch-ups
  const { data: catchups } = await supabase
    .from('people_interactions')
    .select('id, interaction_date, channel, note')
    .eq('person_id', personId)
    .order('interaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3)

  return {
    person,
    homeCircleName,
    connections,
    catchups: catchups || [],
  }
}

// ── Full person file ──────────────────────────────────────────────────────
// Everything for the file page: person + all circles + all connections +
// groups (with co-member names) + full catch-up history + all dates.

export async function loadPersonFile(personId) {
  // 1. Person (full row)
  const { data: person, error: pe } = await supabase
    .from('people').select(FULL_COLS).eq('id', personId).is('archived_at', null).single()
  if (pe) throw new Error('people: ' + pe.message)

  // 2. All circle memberships (home + others)
  const { data: memberships } = await supabase
    .from('people_circle_members').select('circle_id, is_home').eq('person_id', personId)
  const circleIds = (memberships || []).map((m) => m.circle_id)
  let circleNames = new Map()
  if (circleIds.length) {
    const { data: crows } = await supabase.from('people_circles').select('id, name').in('id', circleIds)
    for (const c of crows || []) circleNames.set(c.id, c.name)
  }
  const allCircles = (memberships || []).map((m) => ({
    id: m.circle_id, name: circleNames.get(m.circle_id) || '?', isHome: m.is_home,
  }))
  const homeCircle = allCircles.find((c) => c.isHome) || null

  // 3. Connections (reuse the summary pattern)
  const { data: connsA } = await supabase.from('people_connections').select('id, person_b_id, label_a_to_b').eq('person_a_id', personId)
  const { data: connsB } = await supabase.from('people_connections').select('id, person_a_id, label_b_to_a').eq('person_b_id', personId)
  const connIds = [...((connsA || []).map((c) => c.person_b_id)), ...((connsB || []).map((c) => c.person_a_id))]
  const nameMap = new Map()
  if (connIds.length) {
    const { data: names } = await supabase.from('people').select('id, name').in('id', connIds).is('archived_at', null)
    for (const n of names || []) nameMap.set(n.id, n.name)
  }
  const connections = [
    ...((connsA || []).filter((c) => nameMap.has(c.person_b_id)).map((c) => ({ id: c.id, personId: c.person_b_id, name: nameMap.get(c.person_b_id), label: c.label_a_to_b }))),
    ...((connsB || []).filter((c) => nameMap.has(c.person_a_id)).map((c) => ({ id: c.id, personId: c.person_a_id, name: nameMap.get(c.person_a_id), label: c.label_b_to_a }))),
  ]

  // 4. Groups (with co-member names)
  const { data: groupMems } = await supabase.from('people_group_members').select('group_id').eq('person_id', personId)
  const groupIds = (groupMems || []).map((m) => m.group_id)
  const groups = []
  if (groupIds.length) {
    const { data: grows } = await supabase.from('people_groups').select('id, name').in('id', groupIds)
    for (const g of grows || []) {
      const { data: coMems } = await supabase.from('people_group_members').select('person_id').eq('group_id', g.id).neq('person_id', personId)
      const coIds = (coMems || []).map((m) => m.person_id)
      let coNames = []
      if (coIds.length) {
        const { data: cn } = await supabase.from('people').select('id, name').in('id', coIds).is('archived_at', null)
        coNames = (cn || []).map((p) => p.name)
      }
      groups.push({ id: g.id, name: g.name, coMembers: coNames })
    }
  }

  // 5. Full catch-up history
  const { data: catchups } = await supabase
    .from('people_interactions').select('id, interaction_date, interaction_time, channel, note')
    .eq('person_id', personId).order('interaction_date', { ascending: false }).order('created_at', { ascending: false })

  // 6. Dates (birthday + custom)
  const { data: dates } = await supabase
    .from('people_dates').select('id, kind, label, date_value, year_known, show_on_calendar, recurrence_id')
    .eq('person_id', personId).order('kind', { ascending: true }).order('date_value', { ascending: true })

  // 7. Last contact
  const lastContact = (catchups && catchups.length) ? catchups[0].interaction_date : null

  return { person, homeCircle, allCircles, connections, groups, catchups: catchups || [], dates: dates || [], lastContact }
}
