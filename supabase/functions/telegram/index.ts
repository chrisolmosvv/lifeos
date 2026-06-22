// LifeOS — Telegram bot, Piece 5a ("the round trip").
// Telegram calls this whenever someone texts the bot. It does ONE thing:
// reply echoing the text and telling the sender their Telegram chat ID.
// No AI, no database, no saving — this only proves the chain works.
//
// The bot token lives in Supabase's secret store (TELEGRAM_BOT_TOKEN),
// never in this file or the repo.

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

Deno.serve(async (req) => {
  // Always answer 200 so Telegram doesn't keep retrying — even if we ignore it.
  const ok = () => new Response("ok", { status: 200 });

  try {
    const update = await req.json();
    const message = update?.message ?? update?.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    // Nothing we can reply to (no chat id, or not a text message) — just ack.
    if (!chatId || typeof text !== "string") return ok();

    const reply = `Got it: ${text} — your Telegram chat ID is ${chatId}`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    });

    return ok();
  } catch (_err) {
    // Bad/empty body or any hiccup: still ack so Telegram moves on.
    return ok();
  }
});
