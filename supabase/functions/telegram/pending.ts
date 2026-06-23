// LifeOS — Telegram bot, M4: hold ONE half-finished capture between two messages.
//
// When a capture is missing the single key detail (an event with no time), the router
// asks once and parks the draft here; the owner's NEXT message completes it. This is the
// first time the bot remembers anything across messages — kept deliberately tiny and safe:
//   - at most ONE pending per owner (the marty_pending table's PK is user_id);
//   - SHORT-LIVED — anything older than PENDING_TTL is ignored and cleared;
//   - cleared on completion, on abandonment, and on expiry, so nothing stale lingers.
// Nothing real is written until the capture completes — it then saves through the normal
// capture path (Inbox, source, undoable). No spine row is ever parked here.

import { callGemini } from "../_shared/gemini.ts";
import { dbConfigured, del, insert, OWNER_USER_ID, select } from "./db.ts";
import { humanDate, type Understood } from "./understand.ts";
import { saveItems } from "./save.ts";

const PENDING_TTL_MS = 5 * 60 * 1000; // a parked capture older than this is stale → dropped

export interface Pending { draft: Understood; question: string }

// The current pending capture, or null if there's none / it has expired (expired rows are
// cleared as a side effect, so a stale question can never be answered).
export async function getPending(): Promise<Pending | null> {
  if (!dbConfigured) return null;
  const rows = await select(`marty_pending?user_id=eq.${OWNER_USER_ID}&select=draft,question,created_at&limit=1`);
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  const age = Date.now() - new Date(String(row.created_at)).getTime();
  if (age > PENDING_TTL_MS) {
    await clearPending();
    return null;
  }
  return { draft: row.draft as Understood, question: String(row.question ?? "") };
}

// Park a half-finished capture (replacing any previous one — PK is user_id). Returns
// false if it couldn't be saved (e.g. the table isn't set up yet) so the caller can fall
// back to just saving the item rather than asking a question it can't follow up on.
export async function setPending(draft: Understood, question: string): Promise<boolean> {
  if (!dbConfigured) return false;
  await del(`marty_pending?user_id=eq.${OWNER_USER_ID}`);
  const row = await insert("marty_pending", { user_id: OWNER_USER_ID, draft, question });
  return !!row;
}

export async function clearPending(): Promise<void> {
  if (!dbConfigured) return;
  await del(`marty_pending?user_id=eq.${OWNER_USER_ID}`);
}

const TIME_SYSTEM = `The owner was asked ONE follow-up question to finish adding an item to their calendar — specifically WHAT TIME. Read their reply and extract the clock time.

Return JSON { "time": "HH:MM" 24-hour, or "" }.
- Return a time ONLY if the whole reply is essentially just a time-of-day answer (e.g. "1pm", "at 1", "13:00", "half past 2", "around 2"). Use a sensible am/pm for the named item (lunch/dinner → pm, breakfast → am).
- If the reply is a sentence, a command, a question, a new task, or anything more than a time-of-day answer, return "".
Output ONLY the JSON object.`;

const TIME_SCHEMA = { type: "object", properties: { time: { type: "string" } }, required: ["time"] };

export type TimeAnswer =
  | { kind: "time"; time: string }
  | { kind: "not_time" }
  | { kind: "rate_limit" }
  | { kind: "error" };

// Decide whether `text` is the time-answer to the pending question. Returns a time only
// when the reply is essentially just a time — so a new capture / question / command (even
// one that happens to mention a time, like "move dentist to 3pm") is NOT mistaken for it.
export async function parseTimeAnswer(text: string, draft: Understood): Promise<TimeAnswer> {
  const res = await callGemini({
    system: TIME_SYSTEM,
    user: `Item: ${draft.title}${draft.date ? ` on ${draft.date}` : ""}\nReply: ${text}`,
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: TIME_SCHEMA },
  });
  if (!res.ok) return { kind: res.reason === "rate_limit" ? "rate_limit" : "error" };
  try {
    const p = JSON.parse(res.text);
    const t = typeof p?.time === "string" ? p.time.trim() : "";
    // Accept only a real HH:MM (defends the save path from a malformed time); anything
    // else means the reply wasn't a usable time answer.
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return { kind: "not_time" };
    return { kind: "time", time: `${m[1].padStart(2, "0")}:${m[2]}` };
  } catch (_err) {
    return { kind: "error" };
  }
}

// Finish a parked capture with the answered time and save it (now a timed event), through
// the normal capture path — so it lands in Inbox, is undoable, and reads like any save.
export async function completePending(draft: Understood, time: string): Promise<string> {
  await clearPending();
  const item: Understood = { ...draft, type: "event", time, needs_time: false };
  return await saveItems([item]);
}

// The follow-up question Marty asks for an event-shaped item that's missing its time.
export function timeQuestion(draft: Understood): string {
  const when = draft.date ? ` on ${humanDate(draft.date)}` : "";
  return `What time is '${draft.title}'${when}? (Reply with a time, or send something else to skip.)`;
}
