// LifeOS — Telegram bot, M9: handle the reply to a daytime nudge offer.
//
// The brief function offered "use this free window for X" and recorded it in marty_nudges.
// A "yes" blocks that task into the slot through the SAME edit engine the rest of M3 uses
// (so it's logged and UNDOABLE — never a parallel write); a "no" just closes the offer for
// today (no block, no nagging, no lasting memory). Only acts when an offer is actually open.

import { OWNER_USER_ID, select, update } from "./db.ts";
import { type Change, commitReply } from "./editcore.ts";
import { clockLabel } from "../_shared/datetime.ts";

export interface OpenOffer { id: string; taskId: string; slotStart: string; slotEnd: string }

async function markAnswered(id: string): Promise<void> {
  await update(`marty_nudges?id=eq.${id}&user_id=eq.${OWNER_USER_ID}`, { answered: true });
}

// The open (unanswered, window-not-yet-passed) nudge offer, or null. A passed window is
// closed as a side effect — we never block a task into a slot that's already gone.
export async function openNudge(): Promise<OpenOffer | null> {
  const rows = await select(
    `marty_nudges?user_id=eq.${OWNER_USER_ID}&answered=eq.false&select=id,offered_task_id,slot_start,slot_end&order=created_at.desc&limit=1`,
  );
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  if (r.slot_end && new Date(String(r.slot_end)).getTime() < Date.now()) {
    await markAnswered(String(r.id)); // stale window → close it
    return null;
  }
  return { id: String(r.id), taskId: String(r.offered_task_id), slotStart: String(r.slot_start), slotEnd: String(r.slot_end) };
}

// Is the slot still free — i.e. did nothing get scheduled into it between the offer and
// the "yes"? Checks events + OTHER scheduled tasks overlapping [start,end]. true = free.
// (Conservative: a read failure returns false, so we never risk a double-book.)
async function slotIsFree(startIso: string, endIso: string, taskId: string): Promise<boolean> {
  const events = await select(
    `events?user_id=eq.${OWNER_USER_ID}&archived_at=is.null&start_at=lt.${endIso}&end_at=gt.${startIso}&select=id&limit=1`,
  );
  if (events === null || events.length) return false;
  const tasks = await select(
    `tasks?user_id=eq.${OWNER_USER_ID}&archived_at=is.null&status=eq.open&id=neq.${taskId}&scheduled_start=lt.${endIso}&scheduled_end=gt.${startIso}&select=id&limit=1`,
  );
  if (tasks === null || tasks.length) return false;
  return true;
}

// "yes" → block the offered task into the slot (scheduled_start/end) via the edit engine,
// then close the offer. Undoable: "undo" clears the block back to its prior values. We
// re-check the window is STILL free first, so a slot you filled between the offer and your
// reply is never double-booked (M10).
export async function acceptNudge(o: OpenOffer): Promise<string> {
  const rows = await select(
    `tasks?id=eq.${o.taskId}&user_id=eq.${OWNER_USER_ID}&archived_at=is.null&status=eq.open&select=id,title,scheduled_start,scheduled_end&limit=1`,
  );
  await markAnswered(o.id);
  if (!rows || rows.length === 0) return "That task isn't around anymore, so I left your calendar as it is. (Nothing changed.)";

  if (!(await slotIsFree(o.slotStart, o.slotEnd, o.taskId))) {
    return "Looks like that hour's taken now — I've left your calendar as it is. (Nothing changed.)";
  }

  const t = rows[0];
  const change: Change = {
    table: "tasks", id: o.taskId, title: String(t.title),
    before: { scheduled_start: t.scheduled_start ?? null, scheduled_end: t.scheduled_end ?? null },
    after: { scheduled_start: o.slotStart, scheduled_end: o.slotEnd },
  };
  return await commitReply("edit", [change], `Done — blocked ${clockLabel(o.slotStart)}–${clockLabel(o.slotEnd)} for '${String(t.title)}'. (Text "undo" to remove the block.)`);
}

// "no" → close the offer for today. No block, no nagging, no lasting memory of it.
export async function declineNudge(o: OpenOffer): Promise<string> {
  await markAnswered(o.id);
  return "No worries — I'll leave it.";
}
