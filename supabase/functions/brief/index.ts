// LifeOS — the morning brief.
//
// This is a SEPARATE function from `telegram` on purpose: the 7am alarm will call
// THIS directly in a later piece, so all brief logic lives here from the start —
// never inside the telegram/webhook function.
//
// Piece 6a (the empty pipe): proved the system can reach me unprompted.
// Piece 6b (read my day): a plain, rule-built summary of today's real data
//   (events, Today-bucket tasks, due-today, overdue) — read-only, no AI.
// Piece 6c (write it): hand 6b's SAME verified facts to Gemini and send its written
//   version in the "quiet broadsheet" voice. If Gemini fails, send the plain
//   checklist instead — never go silent.
// Piece 6d (THIS): the code also picks the ONE most-forgotten This Week task (or
//   none) and threads it into BOTH the prose and the checklist fallback, so the
//   gentle nudge survives even when Gemini is unavailable. Still no schedule (6e+).
//
// TEMPORARY TEST AID (6d): if the caller passes { test: true }, the forgotten-task
//   threshold is 0 days (so the picker fires on real This Week tasks immediately,
//   no 3-day wait). Plain calls use the real FORGOTTEN_DAYS rule. Telegram maps the
//   text "brief test" to test mode. We may remove this aid later.
//
// PRIVATE: this function is deployed WITH jwt verification (NOT --no-verify-jwt),
// so its public URL refuses anonymous calls. Only a caller holding the service-role
// key (the telegram function today, the 7am alarm later) can invoke it. This is
// deliberately stricter than the public telegram webhook.
//
// Secrets reused from Supabase's secret store (never in this file or the repo):
//   TELEGRAM_BOT_TOKEN  — the bot's key
//   OWNER_CHAT_ID       — the only chat we send to
//   OWNER_USER_ID       — the owner's auth id, every read is filtered to it (./day.ts)
//   GEMINI_API_KEY      — the AI key (./write.ts)
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected by the platform.)

import { factsForGemini, FORGOTTEN_DAYS, formatChecklist, gatherDay, pickForgotten } from "./day.ts";
import { writeBrief } from "./write.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OWNER_CHAT_ID = Deno.env.get("OWNER_CHAT_ID");

// Sent only if we couldn't READ the day at all (a transient DB blip) — never a
// half-brief. (An AI failure is different: there we still have the day, so we send
// the plain checklist — see writeBrief's fallback.)
const READ_FAILED =
  "I couldn't read your day just now — give it a moment and ask again.";

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

Deno.serve(async (req) => {
  if (!BOT_TOKEN || !OWNER_CHAT_ID) {
    return new Response("not configured", { status: 500 });
  }

  // Test aid: { test: true } drops the forgotten-task threshold to 0 days (no body
  // / bad body = the normal brief). See the header note.
  let test = false;
  try {
    const body = await req.json();
    test = body?.test === true;
  } catch (_err) { /* no/!json body — a normal brief */ }

  const day = await gatherDay();
  if (!day) {
    await sendMessage(OWNER_CHAT_ID, READ_FAILED);
    return new Response("sent", { status: 200 });
  }

  // The CODE picks the one forgotten task (or none); put it in BOTH the prose facts
  // and the checklist fallback so the nudge holds even if Gemini is unavailable.
  const forgotten = await pickForgotten(test ? 0 : FORGOTTEN_DAYS);
  const text = await writeBrief(factsForGemini(day, forgotten), formatChecklist(day, forgotten));
  await sendMessage(OWNER_CHAT_ID, text);
  return new Response("sent", { status: 200 });
});
