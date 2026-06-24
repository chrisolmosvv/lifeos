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
// Piece 6d (forgotten): the code picks the ONE most-forgotten This Week task (or
//   none) and threads it into BOTH the prose and the checklist fallback.
// Piece 6e (gap): the code also finds a real free stretch in today's calendar and a
//   worth-doing task for it (reserved — often nothing), and offers ONE gentle
//   suggestion; also in both prose and fallback.
// Piece 6f: the 7am alarm. pg_cron calls this function (service-role key from Vault) at
//   05:00 AND 06:00 UTC; a SCHEDULED run proceeds only in the 7am Amsterdam hour (DST-safe,
//   exactly once/day). The scheduled run ALWAYS sends, even on an empty day, and an internal
//   error still attempts a minimal "had trouble" message — so a silent morning means broke.
// M9: the DAYTIME NUDGE mode (the hourly cron, and on-demand "nudge") — scanForNudge()
//   enforces all its own guardrails (9–6, max 2/day, never back-to-back).
//
// REQUEST BODY (all optional). There is NO test/force bypass anywhere (retired M10):
//   { scheduled: true }  — a cron run: apply the 7am-Amsterdam-hour gate + always-send.
//   { nudge: true }      — run the daytime nudge scan (always fully guardrailed).
//   no body / on-demand "brief" = the normal real-rule brief.
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
import { pickGapOffer } from "./gap.ts";
import { writeBrief } from "./write.ts";
import { buildActions } from "./actions.ts";
import { storeBriefMap } from "./store.ts";
import { scanForNudge } from "./nudge.ts";
import { localHour } from "../_shared/datetime.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OWNER_CHAT_ID = Deno.env.get("OWNER_CHAT_ID");
const SEND_HOUR = 7; // 07:00 Europe/Amsterdam

// Sent only if we couldn't READ the day at all (a transient DB blip) — never a
// half-brief. (An AI failure is different: there we still have the day, so we send
// the plain checklist — see writeBrief's fallback.)
const READ_FAILED =
  "I couldn't read your day just now — give it a moment and ask again.";
// The scheduled-run safety net: even if building the brief throws, the owner still
// gets a sign of life — so a truly silent morning means the job itself broke.
const TROUBLE =
  "Good morning — I had trouble building your brief today. I'll try again tomorrow.";

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Build today's brief text and send it. On an empty day this still sends a calm
// "quiet one" (gatherDay returns empty groups, not null) — the always-send behaviour.
async function buildAndSend() {
  const day = await gatherDay();
  if (!day) {
    await sendMessage(OWNER_CHAT_ID!, READ_FAILED);
    return;
  }
  // The CODE picks the one forgotten task (6d) and the one gap offer (6e) — or none
  // of either; put both in the prose facts AND the checklist fallback so the nudges
  // hold even if Gemini is unavailable. The gap offer reuses the forgotten task as
  // its top-priority candidate, so it's computed after.
  const forgotten = await pickForgotten(FORGOTTEN_DAYS); // {id,title} | null (M8)
  const fTitle = forgotten?.title ?? null;
  const gap = await pickGapOffer(fTitle);
  const brief = await writeBrief(factsForGemini(day, fTitle, gap), formatChecklist(day, fTitle, gap));

  // M8: number the actionable items, store the number→item map, and append a "Reply to
  // act" list — but only if the map actually stored (so we never show numbers that can't
  // resolve, e.g. before the marty_brief table exists).
  const { lines, map } = buildActions(day, forgotten);
  const stored = await storeBriefMap(map);
  const text = (lines.length && stored)
    ? `${brief}\n\nReply to act — e.g. "done 1" or "move 2 to Friday":\n${lines.join("\n")}`
    : brief;

  await sendMessage(OWNER_CHAT_ID!, text);
}

Deno.serve(async (req) => {
  if (!BOT_TOKEN || !OWNER_CHAT_ID) {
    return new Response("not configured", { status: 500 });
  }

  let scheduled = false, nudge = false;
  try {
    const body = await req.json();
    scheduled = body?.scheduled === true;
    nudge = body?.nudge === true;
  } catch (_err) { /* no/!json body — a normal on-demand brief */ }

  // M9: the DAYTIME NUDGE is a different mode of this proactive function. scanForNudge()
  // ALWAYS enforces the guardrails itself (9–6, max 2/day, never back-to-back), whether it
  // was poked by the hourly cron or on demand — there is no bypass. It sends only when it
  // has a calm offer; otherwise it stays quiet (that's correct, not a failure).
  if (nudge) {
    try {
      const offer = await scanForNudge();
      if (offer) await sendMessage(OWNER_CHAT_ID, offer);
      return new Response(offer ? "nudge sent" : "no nudge", { status: 200 });
    } catch (_err) {
      return new Response("nudge-error-handled", { status: 200 });
    }
  }

  // DST-safe 7am: a scheduled run fires at both 05:00 and 06:00 UTC; only the one in the
  // 7am Amsterdam hour proceeds (so exactly one send/day, year-round). An on-demand "brief"
  // has no `scheduled` flag, so it skips this gate and always sends.
  if (scheduled && localHour() !== SEND_HOUR) {
    return new Response("skipped (not 7am Amsterdam)", { status: 200 });
  }

  try {
    await buildAndSend();
    return new Response("sent", { status: 200 });
  } catch (_err) {
    // Always-send safety net: never die silently — attempt a minimal sign of life.
    try { await sendMessage(OWNER_CHAT_ID, TROUBLE); } catch { /* nothing more we can do */ }
    return new Response("error-handled", { status: 200 });
  }
});
