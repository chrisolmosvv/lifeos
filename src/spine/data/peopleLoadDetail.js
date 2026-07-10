// LifeOS — People (Rolodex): detail loaders (split from peopleLoad for the 250-line ceiling).
// loadPersonSummary (focus panel) + loadPersonFile (full file page).

import { supabase } from './supabaseClient.js'

const FULL_COLS = 'id, name, how_you_know, notes, phone, email, other_contact, source, created_at'

// ── Person summary (for the focus panel) ──────────────────────────────────
export async function loadPersonSummary(personId) {
  const { data: person, error: pe } = await supabase
    .from('people').select(FULL_COLS).eq('id', personId).is('archived_at', null).single()
  if (pe) throw new Error('people: ' + pe.message)

  const { data: homeMem } = await supabase
    .from('people_circle_members').select('circle_id').eq('person_id', personId).eq('is_home', true).maybeSingle()
  let homeCircleName = null
  if (homeMem?.circle_id) {
    const { data: circ } = await supabase.from('people_circles').select('name').eq('id', homeMem.circle_id).single()
    homeCircleName = circ?.name || null
  }

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

  const { data: catchups } = await supabase
    .from('people_interactions').select('id, interaction_date, channel, note')
    .eq('person_id', personId).order('interaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(3)

  return { person, homeCircleName, connections, catchups: catchups || [] }
}

// ── Full person file ──────────────────────────────────────────────────────
export async function loadPersonFile(personId) {
  const { data: person, error: pe } = await supabase
    .from('people').select(FULL_COLS).eq('id', personId).is('archived_at', null).single()
  if (pe) throw new Error('people: ' + pe.message)

  const { data: memberships } = await supabase.from('people_circle_members').select('circle_id, is_home').eq('person_id', personId)
  const circleIds = (memberships || []).map((m) => m.circle_id)
  let circleNames = new Map()
  if (circleIds.length) {
    const { data: crows } = await supabase.from('people_circles').select('id, name').in('id', circleIds)
    for (const c of crows || []) circleNames.set(c.id, c.name)
  }
  const allCircles = (memberships || []).map((m) => ({ id: m.circle_id, name: circleNames.get(m.circle_id) || '?', isHome: m.is_home }))
  const homeCircle = allCircles.find((c) => c.isHome) || null

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
        coNames = (cn || []).map((p) => ({ id: p.id, name: p.name }))
      }
      groups.push({ id: g.id, name: g.name, coMembers: coNames })
    }
  }

  const { data: catchups } = await supabase
    .from('people_interactions').select('id, interaction_date, interaction_time, channel, note')
    .eq('person_id', personId).order('interaction_date', { ascending: false }).order('created_at', { ascending: false })

  const { data: dates } = await supabase
    .from('people_dates').select('id, kind, label, date_value, year_known, show_on_calendar, recurrence_id')
    .eq('person_id', personId).order('kind', { ascending: true }).order('date_value', { ascending: true })

  const lastContact = (catchups && catchups.length) ? catchups[0].interaction_date : null
  return { person, homeCircle, allCircles, connections, groups, catchups: catchups || [], dates: dates || [], lastContact }
}
