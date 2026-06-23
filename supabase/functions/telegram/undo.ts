// LifeOS — Telegram bot, M2: undo against the action log (marty_actions).
//
// THE GRAMMAR:
//   "undo"        → reverse the LAST full action. A multi-item capture is ONE action,
//                   so the whole batch comes back/out together.
//   "undo <name>" → reverse just that one named item out of its action.
//   ambiguous     → ASK before doing anything (never guess).
//
// DATA SAFETY (non-negotiable): undo is surgical. It only ever acts on items Marty
// logged, one action at a time, deleting/restoring by id WITH an owner filter. It can
// never touch a row a human made in the app (those are never in the log) — except to
// restore one Marty itself deleted, on an explicit undo. A row deleted elsewhere is
// reported as "already gone — nothing changed".
//
// M2 only logs 'create' actions (from capture), so only create-reversal exists here
// (delete the created row). 'edit'/'delete' reversal lands in M3 — the structure and
// grammar are already in place for it.

import { dbConfigured, del, OWNER_USER_ID, select, update } from "./db.ts";

interface ActionItem { table: string; id: string; title?: string; before?: Record<string, unknown> }
interface Action { id: string; kind: string; label?: string; items: ActionItem[] }

const NO_DB = "I can't undo right now — saving isn't set up. (Nothing changed.)";
const NO_REACH = "I couldn't reach my records just now — nothing was changed. Try again?";

function kindWord(table: string): string {
  return table === "events" ? "event" : "task";
}

// The past-tense verb for each action kind, so the reply reads right:
//   create → "Removed …"  ·  edit → "Reverted …"  ·  delete → "Restored …".
function pastVerb(kind: string): string {
  return kind === "create" ? "Removed" : kind === "delete" ? "Restored" : "Reverted";
}

// Reverse ONE item per its action's kind. Returns what happened so the caller can word
// the reply and decide whether to clear the log entry. "reversed" = the row was put back.
type Outcome = "reversed" | "gone" | "failed";
async function reverseItem(kind: string, item: ActionItem): Promise<Outcome> {
  // Every reversal is by exact id WITH the owner filter (defence in depth: service-role
  // bypasses RLS, so the explicit user_id filter is the guard). The id is unique → at
  // most one row, never a broad/pattern change. A hand-made app row is never in the log.
  if (kind === "create") {
    // Un-create: delete the row Marty made.
    const deleted = await del(`${item.table}?id=eq.${item.id}&user_id=eq.${OWNER_USER_ID}&select=id`);
    if (deleted === null) return "failed";
    return deleted.length ? "reversed" : "gone";
  }
  if (kind === "edit" || kind === "delete") {
    // Revert an edit / restore a delete: PATCH the row back to its recorded prior values
    // (for a delete that means clearing archived_at — the row was never destroyed).
    const updated = await update(`${item.table}?id=eq.${item.id}&user_id=eq.${OWNER_USER_ID}&select=id`, item.before ?? {});
    if (updated === null) return "failed";
    return updated.length ? "reversed" : "gone";
  }
  return "failed";
}

function itemsOf(a: Action): ActionItem[] {
  return Array.isArray(a.items) ? a.items : [];
}

// "undo" — reverse the most recent action as a unit.
export async function undoLast(): Promise<string> {
  if (!dbConfigured) return NO_DB;

  const rows = await select(
    `marty_actions?user_id=eq.${OWNER_USER_ID}&select=id,kind,label,items&order=created_at.desc&limit=1`,
  );
  if (rows === null) return NO_REACH;
  if (rows.length === 0) return "There's nothing recent for me to undo. (Nothing changed.)";

  const action = rows[0] as unknown as Action;
  const items = itemsOf(action);

  const done: string[] = [];
  const gone: string[] = [];
  let failed = false;
  for (const it of items) {
    const r = await reverseItem(action.kind, it);
    if (r === "reversed") done.push(it.title ?? "");
    else if (r === "gone") gone.push(it.title ?? "");
    else failed = true;
  }

  // A hard failure (DB error) → keep the action so a retry can finish it. Otherwise the
  // action is done with: clear it (owner-filtered) so we don't point at it again.
  if (failed) return "I couldn't fully undo that just now — nothing's lost. Try again in a moment.";
  await del(`marty_actions?id=eq.${action.id}&user_id=eq.${OWNER_USER_ID}`);

  const verb = pastVerb(action.kind);
  if (done.length === 0) return "There was nothing left to undo — it was already gone. (Nothing changed.)";
  if (items.length === 1) return `${verb} the ${kindWord(items[0].table)} '${done[0]}'.`;
  const tail = gone.length ? ` (${gone.length} ${gone.length === 1 ? "was" : "were"} already gone.)` : "";
  return `${verb} ${done.length} item${done.length === 1 ? "" : "s"}: '${done.join("', '")}'.${tail}`;
}

// "undo <name>" — reverse just the one named item. Ambiguous → ask.
export async function undoNamed(name: string): Promise<string> {
  if (!dbConfigured) return NO_DB;
  const q = name.trim().toLowerCase();
  if (!q) return await undoLast(); // bare "undo " → treat as a plain undo

  const rows = await select(
    `marty_actions?user_id=eq.${OWNER_USER_ID}&select=id,kind,label,items&order=created_at.desc&limit=25`,
  );
  if (rows === null) return NO_REACH;

  // Flatten recent actions into candidate items (newest action first).
  interface Cand { action: Action; idx: number; item: ActionItem }
  const all: Cand[] = [];
  for (const r of rows) {
    const a = r as unknown as Action;
    itemsOf(a).forEach((item, idx) => all.push({ action: a, idx, item }));
  }
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();

  // Prefer an exact title match; fall back to a "contains" match only if no exact one.
  let matches = all.filter((c) => norm(c.item.title) === q);
  if (matches.length === 0) matches = all.filter((c) => norm(c.item.title).includes(q));

  if (matches.length === 0) return `I couldn't find anything called "${name.trim()}" to undo. (Nothing changed.)`;
  if (matches.length > 1) {
    const names = [...new Set(matches.map((c) => c.item.title ?? ""))].slice(0, 5).map((n) => `'${n}'`);
    return `I found more than one thing matching "${name.trim()}" (${names.join(", ")}). ` +
      `Tell me which one exactly, or text "undo" to reverse your last action. (Nothing changed.)`;
  }

  const m = matches[0];
  const r = await reverseItem(m.action.kind, m.item);
  if (r === "failed") return "I couldn't do that just now — nothing was changed. Try again?";

  // Drop this item from its action; if that empties the action, clear the whole row.
  // Both writes are owner-filtered (consistency with the real-row reversals above).
  const remaining = itemsOf(m.action).filter((_, i) => i !== m.idx);
  if (remaining.length === 0) await del(`marty_actions?id=eq.${m.action.id}&user_id=eq.${OWNER_USER_ID}`);
  else await update(`marty_actions?id=eq.${m.action.id}&user_id=eq.${OWNER_USER_ID}`, { items: remaining });

  const word = kindWord(m.item.table);
  if (r === "gone") return `The ${word} '${m.item.title ?? ""}' is no longer there. (Nothing changed.)`;
  return `${pastVerb(m.action.kind)} the ${word} '${m.item.title ?? ""}'.`;
}
