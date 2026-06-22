// LifeOS — Telegram bot.
// Telegram calls this whenever someone texts the bot.
//
// Piece 5e (security): reject any request whose Telegram secret-token header
// doesn't match our stored secret — the FIRST thing we do — so the public URL
// can't be abused by a forged request even if someone guessed the chat id.
// Piece 5b (the gate): behind that, still only the owner's chat id gets a reply.
// Piece 5c (understanding) → 5d (saving): a confident read is written as a real
// task/event owned by the owner; an unsure read saves nothing.
// Piece 5e (undo): texting "undo" removes the single most recent item Marty saved.
// Piece 6a (brief): texting "brief" fires the separate, private `brief` function
//   (which texts the owner the morning brief). "brief" is a reserved trigger word.
//
// Secrets live in Supabase's secret store, never in this file or the repo:
//   TELEGRAM_BOT_TOKEN       — the bot's key
//   TELEGRAM_WEBHOOK_SECRET  — must match the X-Telegram-Bot-Api-Secret-Token header
//   OWNER_CHAT_ID            — the only chat allowed a reply
//   GEMINI_API_KEY           — the AI key (./understand.ts)
//   OWNER_USER_ID            — the owner's auth id, set on every saved row (./db.ts)
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected by the platform.)

import { understand, isUnsure, unsureReply } from "./understand.ts";
import { saveAndConfirm } from "./save.ts";
import { undoLast } from "./undo.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OWNER_CHAT_ID = Deno.env.get("OWNER_CHAT_ID");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
// Auto-injected by the platform; used to call the PRIVATE `brief` function.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function sendMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Fire the separate `brief` function (it texts the owner itself). It's deployed
// PRIVATE (jwt verification on), so we authenticate with the service-role key this
// function already runs with. Returns true if the brief accepted the call.
async function fireBrief(): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/brief`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    return res.ok;
  } catch (_err) {
    return false;
  }
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

    // --- BRIEF (6a): "brief" fires the separate brief function and stops here. ---
    // The brief function texts the owner itself, so we don't send our own reply on
    // success; only speak up if firing it failed. No capture/understand/save runs.
    if (text.trim().toLowerCase() === "brief") {
      const ok = await fireBrief();
      if (!ok) {
        await sendMessage(chatId, "I couldn't fetch your brief just now — try again in a moment.");
      }
      return ack();
    }

    let reply: string;
    if (text.trim().toLowerCase() === "undo") {
      // --- UNDO (5e): remove the single most recent item Marty saved. ---
      reply = await undoLast();
    } else {
      // --- Read the message, then save and confirm (or save nothing). ---
      const result = await understand(text);
      if (result.kind === "rate_limit") {
        reply = "I've hit my AI limit for the moment — give it a minute and send it again. (Nothing saved.)";
      } else if (result.kind === "error") {
        reply = "I couldn't read that one just now — mind trying again? (Nothing saved.)";
      } else if (isUnsure(result.value)) {
        reply = unsureReply(result.value); // not a task/event → save nothing
      } else {
        reply = await saveAndConfirm(result.value); // confident read → write the row
      }
    }

    await sendMessage(chatId, reply);
    return ack();
  } catch (_err) {
    // Bad/empty body or any hiccup: still ack so Telegram moves on.
    return ack();
  }
});
