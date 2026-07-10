// LifeOS — hermes-read: people section builder (D14a).
//
// READ-ONLY BY CONSTRUCTION. Uses the same select helper as the rest of the
// snapshot. Returns a shaped array of person objects with home circle, birthday,
// connections (with labels), and last contact + recent catch-ups. Notes are
// truncated to keep the payload lean.

import { ownerActive, ownerPlain, select } from "./sb.ts";

type Row = Record<string, unknown>;

const trunc = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length > 0
    ? v.length > max ? v.slice(0, max) + "\u2026" : v
    : null;

// Build the `people` section for the Hermes read snapshot.
export async function buildPeopleSection(): Promise<Row[] | null> {
  // 1. All non-archived people (owner-scoped + active-only)
  const people = await select(
    `people?${ownerActive()}&select=id,name,how_you_know,notes&order=name.asc&limit=500`,
  );
  if (!people || !people.length) return people;

  const activeIds = new Set(people.map((p) => p.id as string));
  const nameById = new Map(people.map((p) => [p.id as string, p.name as string]));

  // 2. Parallel sub-data fetches (all owner-scoped, JS-filtered to active people)
  const [homeMembers, allCircles, birthdays, allConns, recentInter] = await Promise.all([
    select(`people_circle_members?${ownerPlain()}&is_home=eq.true&select=person_id,circle_id&limit=500`),
    select(`people_circles?${ownerPlain()}&select=id,name&limit=100`),
    select(`people_dates?${ownerPlain()}&kind=eq.birthday&select=person_id,date_value,year_known&limit=500`),
    select(`people_connections?${ownerPlain()}&select=person_a_id,person_b_id,label_a_to_b,label_b_to_a&limit=500`),
    select(`people_interactions?${ownerPlain()}&select=person_id,interaction_date,channel,note&order=interaction_date.desc&limit=500`),
  ]);

  // Home circle lookup
  const circleNames = new Map((allCircles || []).map((c) => [c.id as string, c.name as string]));
  const homeByPerson = new Map<string, string>();
  for (const h of homeMembers || []) {
    const pid = h.person_id as string;
    if (activeIds.has(pid)) homeByPerson.set(pid, circleNames.get(h.circle_id as string) || "");
  }

  // Birthday lookup
  const bdayByPerson = new Map<string, Row>();
  for (const d of birthdays || []) {
    const pid = d.person_id as string;
    if (activeIds.has(pid)) bdayByPerson.set(pid, d);
  }

  // Connections per person (both directions, only between active people)
  const connsByPerson = new Map<string, { name: string; label: string | null }[]>();
  for (const c of allConns || []) {
    const aId = c.person_a_id as string;
    const bId = c.person_b_id as string;
    if (!activeIds.has(aId) || !activeIds.has(bId)) continue;
    if (!connsByPerson.has(aId)) connsByPerson.set(aId, []);
    if (!connsByPerson.has(bId)) connsByPerson.set(bId, []);
    connsByPerson.get(aId)!.push({ name: nameById.get(bId)!, label: (c.label_a_to_b as string) || null });
    connsByPerson.get(bId)!.push({ name: nameById.get(aId)!, label: (c.label_b_to_a as string) || null });
  }

  // Last 2 interactions per person (already sorted desc by date)
  const interByPerson = new Map<string, Row[]>();
  for (const i of recentInter || []) {
    const pid = i.person_id as string;
    if (!activeIds.has(pid)) continue;
    const list = interByPerson.get(pid) || [];
    if (list.length < 2) { list.push(i); interByPerson.set(pid, list); }
  }

  // Shape the output
  return people.map((p) => {
    const pid = p.id as string;
    const bday = bdayByPerson.get(pid);
    const catchups = interByPerson.get(pid) || [];
    return {
      id: pid,
      name: p.name,
      how_you_know: p.how_you_know || null,
      notes: trunc(p.notes, 500),
      home_circle: homeByPerson.get(pid) || null,
      birthday: bday ? { date: bday.date_value, year_known: bday.year_known } : null,
      connections: connsByPerson.get(pid) || [],
      last_contact: catchups.length ? catchups[0].interaction_date : null,
      recent_catchups: catchups.map((c) => ({
        date: c.interaction_date,
        channel: c.channel,
        note: trunc(c.note, 200),
      })),
    };
  });
}
