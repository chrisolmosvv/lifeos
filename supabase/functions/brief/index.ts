// LifeOS — the morning brief (Phase 6, Piece 6a: the empty pipe).
//
// This is a SEPARATE function from `telegram` on purpose: the 7am alarm will call
// THIS directly in a later piece, so all brief logic lives here from the start —
// never inside the telegram/webhook function.
//
// Piece 6a does ONE thing: send the owner a single fixed Telegram message, proving
// the system can reach me unprompted (I didn't text first). No AI, no reading of
// tasks/events, no schedule, no database — those come in 6b onward.
//
// PRIVATE: this function is deployed WITH jwt verification (NOT --no-verify-jwt),
// so its public URL refuses anonymous calls. Only a caller holding the service-role
// key (the telegram function today, the 7am alarm later) can invoke it. This is
// deliberately stricter than the public telegram webhook.
//
// Secrets reused from Supabase's secret store (never in this file or the repo):
//   TELEGRAM_BOT_TOKEN  — the bot's key
//   OWNER_CHAT_ID       — the only chat we send to

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OWNER_CHAT_ID = Deno.env.get("OWNER_CHAT_ID");

const BRIEF_TEXT =
  "Good morning. This is your LifeOS brief — just testing the wiring today; the real edition is coming soon.";

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

Deno.serve(async () => {
  if (!BOT_TOKEN || !OWNER_CHAT_ID) {
    return new Response("not configured", { status: 500 });
  }
  await sendMessage(OWNER_CHAT_ID, BRIEF_TEXT);
  return new Response("sent", { status: 200 });
});
