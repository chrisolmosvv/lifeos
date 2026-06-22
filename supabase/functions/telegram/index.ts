// LifeOS — Telegram bot.
// Telegram calls this whenever someone texts the bot.
//
// Piece 5b (the gate): only the owner gets a response. Any other sender is read,
// silently ignored (no reply), and acked with 200 so Telegram stops retrying.
// Piece 5c (understanding): the owner's message goes to Gemini, which reads it
// into structured fields; Marty replies with what he understood. SAVES NOTHING.
//
// Secrets live in Supabase's secret store, never in this file or the repo:
//   TELEGRAM_BOT_TOKEN — the bot's key
//   OWNER_CHAT_ID      — the only chat allowed a reply
//   GEMINI_API_KEY     — the AI key (read in ./understand.ts)

import { understand, formatReply } from "./understand.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OWNER_CHAT_ID = Deno.env.get("OWNER_CHAT_ID");

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

Deno.serve(async (req) => {
  // Telegram ignores the response body — it only cares that we answer 200 so it
  // stops retrying. We use distinct bodies ("ok" / "ignored") purely so the gate
  // can be checked from outside without messaging anyone.
  const ack = (body = "ok") => new Response(body, { status: 200 });

  try {
    const update = await req.json();
    const message = update?.message ?? update?.edited_message;
    const chatId = message?.chat?.id;

    // --- THE GATE (5b): not the owner → do nothing, send no reply. ---
    // Compared as strings so a number id and the env-string id match cleanly.
    if (chatId === undefined || String(chatId) !== OWNER_CHAT_ID) {
      return ack("ignored");
    }

    // --- The owner: read the message with Gemini and report (no saving). ---
    const text = message?.text;
    if (typeof text !== "string") return ack(); // e.g. a sticker — just ack.

    const understood = await understand(text);
    const reply = understood
      ? formatReply(understood)
      : "I couldn't read that one just now — mind trying again? (Nothing saved.)";

    await sendMessage(chatId, reply);
    return ack();
  } catch (_err) {
    // Bad/empty body or any hiccup: still ack so Telegram moves on.
    return ack();
  }
});
