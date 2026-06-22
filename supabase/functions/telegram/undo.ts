// LifeOS — Telegram bot, Piece 5e: "undo".
// Removes the SINGLE most recent item the bot saved (one level — not a history),
// using the telegram_saves log. It deletes EXACTLY that one row, by its id, and
// only if it's the owner's — so it can never touch a task/event you made in the
// app, nor anyone else's data. RLS owner-only is untouched.

import { dbConfigured, del, OWNER_USER_ID, select } from "./db.ts";

export async function undoLast(): Promise<string> {
  if (!dbConfigured) return "I can't undo right now — saving isn't set up. (Nothing changed.)";

  // The single most recent thing the bot logged for the owner.
  const logs = await select(
    `telegram_saves?user_id=eq.${OWNER_USER_ID}&select=id,item_table,item_id,title&order=created_at.desc&limit=1`,
  );
  if (logs === null) return "I couldn't reach my records just now — nothing was changed. Try again?";
  if (logs.length === 0) return "There's nothing recent for me to undo. (Nothing changed.)";

  const log = logs[0] as { id: string; item_table: string; item_id: string; title?: string };
  const kind = log.item_table === "events" ? "event" : "task";

  // Delete that exact row, by id, and only if it's the owner's (defence in depth:
  // service-role bypasses RLS, so the explicit user_id filter is the guard). The id
  // is unique, so this affects at most one row — never a broad/pattern delete.
  const deleted = await del(`${log.item_table}?id=eq.${log.item_id}&user_id=eq.${OWNER_USER_ID}&select=id`);
  // Clear the log entry either way, so we don't keep pointing at it.
  await del(`telegram_saves?id=eq.${log.id}`);

  if (deleted === null) return "I couldn't remove it just now — nothing was changed. Try again?";
  if (deleted.length === 0) {
    // Already gone (e.g. you deleted it in the app). Log cleaned; nothing else done.
    return `There's nothing to undo — the ${kind} '${log.title ?? ""}' was already gone. (Nothing changed.)`;
  }
  return `Removed the ${kind} '${log.title ?? ""}'.`;
}
