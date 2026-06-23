// LifeOS — Telegram bot. Telegram calls this whenever someone texts the bot.
// This file is the THIN FRONT DOOR only: security → owner gate → text check → hand the
// message to the router (./route.ts), then send whatever reply it returns. All the
// "what does this message mean / what do we do with it" logic lives in route.ts (M1).
//
// Piece 5e (security): reject any request whose Telegram secret-token header doesn't
//   match our stored secret — the FIRST thing we do — so the public URL can't be abused.
// Piece 5b (the gate): behind that, still only the owner's chat id gets a reply.
// M1: route.ts decides capture vs. a command (undo/brief) vs. a read-only QUESTION.
//
// Secrets live in Supabase's secret store, never in this file or the repo:
//   TELEGRAM_BOT_TOKEN       — the bot's key
//   TELEGRAM_WEBHOOK_SECRET  — must match the X-Telegram-Bot-Api-Secret-Token header
//   OWNER_CHAT_ID            — the only chat allowed a reply
//   GEMINI_API_KEY           — the AI key (../_shared/gemini.ts, via route.ts)
//   OWNER_USER_ID            — the owner's auth id, set on every saved row (./db.ts)
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected by the platform; the
//  router uses them to call the PRIVATE `brief` function.)

import { route } from "./route.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OWNER_CHAT_ID = Deno.env.get("OWNER_CHAT_ID");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

Deno.serve(async (req) => {
  const ack = (body = "ok") => new Response(body, { status: 200 });

  // --- SECURITY (5e): only genuine Telegram calls get past here. ---
  // Telegram sends the secret we set on the webhook in this header. Fail CLOSED:
  // if our secret isn't configured, reject everything rather than run open.
  const sentSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!WEBHOOK_SECRET || sentSecret !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 401 });
  }

  try {
    const update = await req.json();
    const message = update?.message ?? update?.edited_message;
    const chatId = message?.chat?.id;

    // --- THE GATE (5b): not the owner → do nothing, send no reply. ---
    if (chatId === undefined || String(chatId) !== OWNER_CHAT_ID) {
      return ack("ignored");
    }

    const text = message?.text;
    if (typeof text !== "string") return ack(); // e.g. a sticker — just ack.

    // --- The router decides what this is and what to do; "" means send nothing. ---
    const reply = await route(text);
    if (reply) await sendMessage(chatId, reply);
    return ack();
  } catch (_err) {
    // Bad/empty body or any hiccup: still ack so Telegram moves on.
    return ack();
  }
});
