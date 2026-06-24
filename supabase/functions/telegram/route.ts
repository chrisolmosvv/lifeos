// LifeOS — Telegram bot, M1: the ROUTER. index.ts is the thin front door (security +
// owner gate + text check); this decides what to DO with an owner's message and returns
// the reply to send ("" = send nothing, e.g. the brief texts the owner itself).
//
// The order:
//   1. Reserved trigger words ("brief" / "brief test" / "undo") — exact match, no AI.
//   2. Otherwise classify (intent.ts): QUESTION → the read-only query path (query.ts);
//      CAPTURE → the existing, unchanged capture path (understand.ts → save.ts);
//      UNCLEAR → ASK, save nothing (a wrong capture guess would write).
//
// Capture behaviour for a clear capture is byte-for-byte what it was before M1 — the
// classify step is added IN FRONT; the capture path itself is untouched.

import { isUnsure, understand, unsureReply } from "./understand.ts";
import { saveItems, saveItemsTracked } from "./save.ts";
import { undoLast, undoNamed } from "./undo.ts";
import { classify } from "./intent.ts";
import { answerQuery } from "./query.ts";
import { handleEdit } from "./edit.ts";
import { briefItem } from "./briefmap.ts";
import { acceptNudge, declineNudge, openNudge } from "./nudge.ts";
import { clearPending, completePending, getPending, parseTimeAnswer, setPending, timeQuestion } from "./pending.ts";

// Used only to fire the separate PRIVATE brief function (it texts the owner itself).
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// The two AI-limit / AI-error replies, kept identical to pre-M1 so a clear capture's
// failure messages don't change. (Nothing is ever saved on either.)
const AI_LIMIT = "I've hit my AI limit for the moment — give it a minute and send it again. (Nothing saved.)";
const AI_ERROR = "I couldn't read that one just now — mind trying again? (Nothing saved.)";

// Shown when the classifier genuinely can't tell "add this" from "asking about it".
// We save nothing and ask — never guess capture.
const UNCLEAR =
  "I'm not sure if you want me to add that or you're asking about it, so I didn't save anything. " +
  "To add it, send it as a plain to-do (like \"call mum tomorrow\"). To ask, try \"what's on Thursday?\".";

// Shown when a capture parsed but none of the parsed items were usable (gibberish).
const NONE_USABLE =
  "None of those looked like a task or an appointment, so I didn't save anything.\n" +
  "Send me something to do, or an appointment with a time, and I'll file it.";

// Fire the separate `brief` function (deployed PRIVATE/jwt-verified). We authenticate
// with the service-role key this function already runs with. Returns true if accepted.
async function fireBrief(test: boolean): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/brief`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ test }),
    });
    return res.ok;
  } catch (_err) {
    return false;
  }
}

// Fire the brief function's DAYTIME NUDGE mode (M9). `force` (the "nudge test" path) skips
// its 9–6 gate + caps so the scan can be tried on demand. The brief function sends the
// offer itself; we only speak up if firing failed.
async function fireNudge(force: boolean): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/brief`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ nudge: true, force }),
    });
    return res.ok;
  } catch (_err) {
    return false;
  }
}

// Affirmative / negative replies to an open daytime nudge offer.
const YES = new Set(["yes", "yeah", "yep", "yup", "sure", "ok", "okay", "do it", "go on", "go for it", "block it", "please"]);
const NO = new Set(["no", "nope", "nah", "skip", "not now", "later", "no thanks", "no thank you"]);

// Decide and act on one owner message. Returns the text to send back, or "" to stay
// quiet (the brief path: the brief function does its own sending).
export async function route(text: string): Promise<string> {
  const lower = text.trim().toLowerCase();

  // 0. PENDING follow-up (M4): if we're waiting on the answer to a one-time question,
  // only the VERY NEXT message can complete it, and only if it's actually a time. A
  // reserved command, or anything that isn't a time, abandons the stale question and is
  // handled normally below.
  const pending = await getPending();
  if (pending) {
    const isCommand = lower === "undo" || lower.startsWith("undo ") || lower === "brief" || lower === "brief test";
    if (!isCommand) {
      const ans = await parseTimeAnswer(text, pending.item);
      if (ans.kind === "time") return await completePending(pending, ans.time); // clears + saves
      if (ans.kind === "rate_limit") return AI_LIMIT; // keep the pending so the owner can answer again
      // not_time / error → fall through: drop the question, handle this message normally.
    }
    await clearPending();
  }

  // M9: a "yes"/"no" answer to an OPEN daytime nudge offer (only checks the log when the
  // message is actually a yes/no word, so it's not an extra read on every message).
  if (YES.has(lower) || NO.has(lower)) {
    const offer = await openNudge();
    if (offer) return YES.has(lower) ? await acceptNudge(offer) : await declineNudge(offer);
    // No open offer → fall through (a bare "yes"/"no" with nothing pending is just unclear).
  }

  // 1. Reserved trigger words — no AI, behaviour exactly as before.
  if (lower === "brief" || lower === "brief test") {
    const ok = await fireBrief(lower === "brief test");
    return ok ? "" : "I couldn't fetch your brief just now — try again in a moment.";
  }
  if (lower === "nudge test") {
    const ok = await fireNudge(true); // force: bypass the 9–6 gate + caps to try it now
    return ok ? "" : "I couldn't run the nudge scan just now — try again in a moment.";
  }
  if (lower === "undo") return await undoLast();
  if (lower.startsWith("undo ")) return await undoNamed(text.trim().slice(4).trim());

  // 2. Classify everything else: question vs capture vs unclear.
  const intent = await classify(text);
  if (intent.kind === "rate_limit") return AI_LIMIT;
  if (intent.kind === "error") return AI_ERROR;

  const c = intent.value;
  if (c.kind === "question") return await answerQuery(c); // READ-ONLY path, saves nothing
  if (c.kind === "edit") {
    // A numbered reply to the brief ("done 1") → act on the EXACT briefed item (M8);
    // otherwise the normal name/last-item path.
    if (c.target_number > 0) {
      const it = await briefItem(c.target_number);
      if (!it) return `I don't have a #${c.target_number} from your last brief. (Nothing changed.)`;
      return await handleEdit(c, { table: it.table, id: it.id });
    }
    return await handleEdit(c); // change an existing item, riding undo
  }
  if (c.kind === "unclear") return UNCLEAR; // ask, save nothing

  // 3. Capture — read it into one or more items, then save and confirm. Unsure items
  // are dropped; if none survive, save nothing and ask the owner to rephrase.
  const result = await understand(text);
  if (result.kind === "rate_limit") return AI_LIMIT;
  if (result.kind === "error") return AI_ERROR;

  const good = result.value.filter((u) => !isUnsure(u));
  if (good.length === 0) {
    // One unsure item keeps its tailored "that wasn't a task" reply; nothing/many → generic.
    return result.value.length === 1 ? unsureReply(result.value[0]) : NONE_USABLE;
  }

  // Split into what's savable now vs what's an event missing its time.
  const ready = good.filter((u) => !(u.needs_time && !u.time));
  const unclear = good.filter((u) => u.needs_time && !u.time);

  // All clear → save together (single item or whole batch). Unchanged behaviour.
  if (unclear.length === 0) return await saveItems(good);

  // Exactly ONE needs a time → ask once (M4/M5). With nothing else, it's a lone follow-up;
  // with ready items, save those first and link the question to that batch's action so the
  // answer completes into the SAME action (undo still pulls the whole batch).
  if (unclear.length === 1) {
    const q = timeQuestion(unclear[0]);
    if (ready.length === 0) {
      if (await setPending(unclear[0], q)) return q;
      return await saveItems(good); // couldn't park → save normally, no broken question
    }
    const res = await saveItemsTracked(ready);
    if (res.actionId && await setPending(unclear[0], q, res.actionId)) return `Saved ${res.count}. ${q}`;
    // Couldn't park (table missing / no action) → don't lose the unclear one; save it too.
    return `${res.reply}\n${await saveItems([unclear[0]])}`;
  }

  // TWO OR MORE need a time → never fire multiple follow-ups. Save the clear ones and tell
  // the owner which still need a time (they can re-send each with one).
  const names = unclear.map((u) => `'${u.title}'`).join(", ");
  const eg = `e.g. "${unclear[0].title} 3pm"`;
  if (ready.length === 0) return `Those need a time before I can add them — send each with one (${eg}): ${names}.`;
  const res = await saveItemsTracked(ready);
  return `${res.reply}\nThese still need a time — send each with one (${eg}): ${names}.`;
}
