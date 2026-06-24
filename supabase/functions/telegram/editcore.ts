// LifeOS — Telegram bot: the shared EDIT COMMIT ENGINE (split out of edit.ts in M10 to
// keep that file under the size rule). It logs an item's PRIOR STATE to marty_actions
// FIRST, then applies the change — so every edit/delete (M3), every numbered-brief action
// (M8), and the daytime nudge's calendar block (M9) is UNDOABLE. Everything that changes a
// task/event writes through here; never a parallel write.

import { insert, OWNER_USER_ID, update } from "./db.ts";

// One row to change: its prior values (for undo) and the new values to write. For a
// delete, batch_id is the archive_batches row this archive belongs to (so undo can
// remove the empty batch afterwards, exactly like the app's restore).
export interface Change {
  table: "tasks" | "events";
  id: string;
  title: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  batch_id?: string;
}

export interface CommitResult { ok: boolean; reply: string }

// Log prior state FIRST, then apply — so we never change anything without a logged way
// back. (If the log write fails we change nothing; if an apply fails, the log is at worst
// a harmless no-op on undo.)
export async function commit(kind: "edit" | "delete", changes: Change[], confirm: string): Promise<CommitResult> {
  const items = changes.map((c) => ({
    table: c.table, id: c.id, title: c.title, before: c.before,
    ...(c.batch_id ? { batch_id: c.batch_id } : {}),
  }));
  const label = changes.length === 1 ? changes[0].title : `${changes.length} items`;
  const logged = await insert("marty_actions", { user_id: OWNER_USER_ID, kind, label, items });
  if (!logged) return { ok: false, reply: "I couldn't set up an undo for that, so I left it unchanged. Try again?" };

  for (const c of changes) {
    const ok = await update(`${c.table}?id=eq.${c.id}&user_id=eq.${OWNER_USER_ID}&select=id`, c.after);
    if (ok === null) return { ok: false, reply: "I hit a snag applying that — text \"undo\", then try again." };
  }
  return { ok: true, reply: confirm };
}

// Convenience for callers that don't need to compensate on failure (everything but delete).
export async function commitReply(kind: "edit" | "delete", changes: Change[], confirm: string): Promise<string> {
  return (await commit(kind, changes, confirm)).reply;
}
