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
import { saveItems } from "./save.ts";
import { undoLast, undoNamed } from "./undo.ts";
import { classify } from "./intent.ts";
import { answerQuery } from "./query.ts";
import { handleEdit } from "./edit.ts";

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

// Decide and act on one owner message. Returns the text to send back, or "" to stay
// quiet (the brief path: the brief function does its own sending).
export async function route(text: string): Promise<string> {
  const lower = text.trim().toLowerCase();

  // 1. Reserved trigger words — no AI, behaviour exactly as before.
  if (lower === "brief" || lower === "brief test") {
    const ok = await fireBrief(lower === "brief test");
    return ok ? "" : "I couldn't fetch your brief just now — try again in a moment.";
  }
  if (lower === "undo") return await undoLast();
  if (lower.startsWith("undo ")) return await undoNamed(text.trim().slice(4).trim());

  // 2. Classify everything else: question vs capture vs unclear.
  const intent = await classify(text);
  if (intent.kind === "rate_limit") return AI_LIMIT;
  if (intent.kind === "error") return AI_ERROR;

  const c = intent.value;
  if (c.kind === "question") return await answerQuery(c); // READ-ONLY path, saves nothing
  if (c.kind === "edit") return await handleEdit(c); // change an existing item, riding undo
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
  return await saveItems(good);
}
