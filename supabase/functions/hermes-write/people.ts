// LifeOS — hermes-write: people kind handlers (D14b).
//
// Four kinds: person (create), note (append), catchup (log interaction),
// connect (link two people). Each follows the standard pattern: validate →
// dedup → insert/update → marty_actions → rollback on undo-log failure.
// All owner-scoped via OWNER_USER_ID stamped explicitly.

import { todayYMD } from "../_shared/datetime.ts";
import { del, insert, OWNER_USER_ID, patch, select, upsert } from "./sb.ts";

type D = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status, headers: { "Content-Type": "application/json" },
  });
}
function fail(error: string, status = 400) { return json({ ok: false, error }, status); }
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isDate = (v: unknown) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
const DEDUP_ISO = () => new Date(Date.now() - 2 * 60_000).toISOString();

async function logCreate(table: string, id: string, label: string): Promise<string | null> {
  const r = await insert("marty_actions", {
    user_id: OWNER_USER_ID, kind: "create", label, items: [{ table, id, title: label }],
  });
  return r ? String(r.id) : null;
}
async function logEdit(table: string, id: string, label: string, before: Record<string, unknown>): Promise<string | null> {
  const r = await insert("marty_actions", {
    user_id: OWNER_USER_ID, kind: "edit", label, items: [{ table, id, title: label, before }],
  });
  return r ? String(r.id) : null;
}

// ── Name matching ───────────────────────────────────────────────────────────

type Match = { found: true; id: string; name: string }
  | { found: false; candidates: { id: string; name: string }[] };

async function matchPerson(name: string): Promise<Match> {
  const esc = encodeURIComponent(name.trim());
  const rows = await select(
    `people?user_id=eq.${OWNER_USER_ID}&archived_at=is.null&name=ilike.*${esc}*&select=id,name&limit=10`,
  );
  if (!rows || rows.length === 0) return { found: false, candidates: [] };
  if (rows.length === 1) return { found: true, id: String(rows[0].id), name: String(rows[0].name) };
  const exact = rows.find((r) => String(r.name).toLowerCase() === name.trim().toLowerCase());
  if (exact) return { found: true, id: String(exact.id), name: String(exact.name) };
  return { found: false, candidates: rows.map((r) => ({ id: String(r.id), name: String(r.name) })) };
}

function matchFail(name: string, match: Match & { found: false }): Response {
  if (match.candidates.length === 0) return fail(`no person named "${name}" — add them first`);
  return json({ ok: false, error: "ambiguous_name", candidates: match.candidates }, 400);
}

// ── kind: "person" — create a person (confirmed=true required) ──────────

export async function handlePerson(data: D): Promise<Response> {
  const name = isStr(data.name) ? data.name.trim().slice(0, 200) : "";
  if (!name) return fail("person requires a non-empty name");
  const hyk = isStr(data.how_you_know) ? (data.how_you_know as string).trim().slice(0, 500) : null;

  // Dedup: exact name already exists → return it, no duplicate
  const esc = encodeURIComponent(name);
  const existing = await select(
    `people?user_id=eq.${OWNER_USER_ID}&archived_at=is.null&name=eq.${esc}&select=id,name&limit=1`,
  );
  if (existing && existing.length > 0) {
    return json({ ok: true, id: String(existing[0].id), already_existed: true, name: String(existing[0].name) });
  }

  const saved = await insert("people", {
    user_id: OWNER_USER_ID, name, how_you_know: hyk, source: "hermes",
  });
  if (!saved) return fail("insert failed", 500);
  const id = String(saved.id);
  const undoId = await logCreate("people", id, name);
  if (!undoId) { await del(`people?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId, name });
}

// ── kind: "note" — append text to a person's notes (direct-log) ─────────

export async function handleNote(data: D): Promise<Response> {
  const name = isStr(data.name) ? data.name.trim() : "";
  if (!name) return fail("note requires a person name");
  const text = isStr(data.text) ? data.text.trim().slice(0, 2000) : "";
  if (!text) return fail("note requires non-empty text");

  const match = await matchPerson(name);
  if (!match.found) return matchFail(name, match);

  const rows = await select(`people?user_id=eq.${OWNER_USER_ID}&id=eq.${match.id}&select=notes`);
  const prev = rows && rows[0] && typeof rows[0].notes === "string" ? (rows[0].notes as string) : "";
  const updated = prev ? `${prev}\n${text}` : text;

  const patched = await patch(`people?id=eq.${match.id}&user_id=eq.${OWNER_USER_ID}`, {
    notes: updated, updated_at: new Date().toISOString(),
  });
  if (!patched) return fail("update failed", 500);
  const label = `Note on ${match.name}`;
  const undoId = await logEdit("people", match.id, label, { notes: prev || null });
  return json({ ok: true, person_id: match.id, person_name: match.name, undo_id: undoId });
}

// ── kind: "catchup" — log an interaction (direct-log) ───────────────────

const CHANNELS = ["in_person", "call", "video", "message", "letter", "other"] as const;
const CH_MAP: Record<string, string> = {
  texted: "message", text: "message", messaged: "message", dm: "message", whatsapp: "message",
  called: "call", rang: "call", phoned: "call",
  saw: "in_person", met: "in_person", coffee: "in_person", lunch: "in_person", dinner: "in_person",
  video: "video", zoom: "video", facetime: "video", teams: "video",
  wrote: "letter", letter: "letter", card: "letter",
};

export async function handleCatchup(data: D): Promise<Response> {
  const name = isStr(data.name) ? data.name.trim() : "";
  if (!name) return fail("catchup requires a person name");

  const match = await matchPerson(name);
  if (!match.found) return matchFail(name, match);

  let channel = "in_person";
  if (isStr(data.channel)) {
    const raw = (data.channel as string).trim().toLowerCase();
    if ((CHANNELS as readonly string[]).includes(raw)) channel = raw;
    else channel = CH_MAP[raw] || "other";
  }

  const date = isDate(data.date) ? (data.date as string).trim() : todayYMD();
  const note = isStr(data.note) ? (data.note as string).trim().slice(0, 1000) : null;

  // Dedup (same person + date + channel within 2 min)
  const dq = `people_interactions?user_id=eq.${OWNER_USER_ID}&person_id=eq.${match.id}&interaction_date=eq.${date}&channel=eq.${channel}&created_at=gte.${DEDUP_ISO()}&select=id&limit=1`;
  const dupes = await select(dq);
  if (dupes && dupes.length > 0) return json({ ok: true, skipped: true, reason: "duplicate_detected" });

  const saved = await insert("people_interactions", {
    user_id: OWNER_USER_ID, person_id: match.id,
    interaction_date: date, channel, note, source: "hermes",
  });
  if (!saved) return fail("insert failed", 500);
  const id = String(saved.id);
  const label = `Catch-up with ${match.name}`;
  const undoId = await logCreate("people_interactions", id, label);
  if (!undoId) { await del(`people_interactions?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId, person_name: match.name, channel, date });
}

// ── kind: "connect" — link two people (confirmed=true required) ─────────

// Directional label presets (mirrors src/spine/data/peopleWrite.js INVERSE)
const INVERSE: Record<string, string> = {
  parent: "child", child: "parent",
  grandparent: "grandchild", grandchild: "grandparent",
  mentor: "mentee", mentee: "mentor",
  "aunt/uncle": "niece/nephew", "niece/nephew": "aunt/uncle",
};

export async function handleConnect(data: D): Promise<Response> {
  const nameA = isStr(data.person_a) ? data.person_a.trim() : "";
  const nameB = isStr(data.person_b) ? data.person_b.trim() : "";
  if (!nameA || !nameB) return fail("connect requires person_a and person_b names");
  const label = isStr(data.label) ? (data.label as string).trim().slice(0, 200) : null;

  const [mA, mB] = await Promise.all([matchPerson(nameA), matchPerson(nameB)]);
  if (!mA.found) {
    if (mA.candidates.length === 0) return fail(`no person named "${nameA}" — add them first`);
    return json({ ok: false, error: "ambiguous_name", which: "person_a", candidates: mA.candidates }, 400);
  }
  if (!mB.found) {
    if (mB.candidates.length === 0) return fail(`no person named "${nameB}" — add them first`);
    return json({ ok: false, error: "ambiguous_name", which: "person_b", candidates: mB.candidates }, 400);
  }
  if (mA.id === mB.id) return fail("can't connect a person to themselves");

  // Canonical ordering (a < b) — mirrors the app's addConnection
  const a = mA.id < mB.id ? mA.id : mB.id;
  const b = mA.id < mB.id ? mB.id : mA.id;
  const callerIsA = mA.id === a;
  const inverse = label ? (INVERSE[label] || label) : null;
  const callerLabel = label || null;
  const otherLabel = inverse;
  const labelAtoB = callerIsA ? callerLabel : otherLabel;
  const labelBtoA = callerIsA ? otherLabel : callerLabel;

  const saved = await upsert("people_connections", {
    user_id: OWNER_USER_ID, person_a_id: a, person_b_id: b,
    label_a_to_b: labelAtoB, label_b_to_a: labelBtoA, source: "hermes",
  }, "person_a_id,person_b_id");
  if (!saved) return fail("upsert failed", 500);
  const id = String(saved.id);
  const connLabel = `${mA.name} — ${mB.name}${label ? ` (${label})` : ""}`;
  const undoId = await logCreate("people_connections", id, connLabel);
  if (!undoId) { await del(`people_connections?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`); return fail("undo log failed — write rolled back", 500); }
  return json({ ok: true, id, undo_id: undoId, person_a: mA.name, person_b: mB.name, label: label || null });
}
