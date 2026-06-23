// LifeOS — Telegram bot, M7: turn a voice note into text, then let the normal pipeline
// handle it. This module ONLY does the speech→text step; the transcript is fed into the
// SAME router a typed message uses (see index.ts), so capture, multi-item split, category
// guessing and the follow-up all apply automatically — nothing here re-implements them.
//
// Telegram doesn't send the audio inline — it sends a file_id. We getFile → download the
// OGG/Opus audio → transcribe it via the M0 shared Gemini seam (free tier; no key/model
// here). Always returns a result; never throws.

import { transcribeAudio } from "../_shared/gemini.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

// Base64-encode bytes in chunks (avoids String.fromCharCode argument limits on big files).
function base64Encode(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// getFile → download the audio bytes for a voice note's file_id. null on any failure.
async function downloadVoice(fileId: string): Promise<Uint8Array | null> {
  try {
    const gf = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    if (!gf.ok) return null;
    const meta = await gf.json();
    const path = meta?.result?.file_path;
    if (typeof path !== "string") return null;
    const dl = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${path}`);
    if (!dl.ok) return null;
    return new Uint8Array(await dl.arrayBuffer());
  } catch (_err) {
    return null;
  }
}

export type VoiceResult =
  | { kind: "ok"; text: string }
  | { kind: "rate_limit" }
  | { kind: "error" };

// Download + transcribe a voice note. mimeType comes from message.voice.mime_type
// (Telegram voice is OGG/Opus → "audio/ogg"); defaulted if absent.
export async function transcribeVoice(fileId: string, mimeType = "audio/ogg"): Promise<VoiceResult> {
  const bytes = await downloadVoice(fileId);
  if (!bytes || bytes.length === 0) return { kind: "error" };

  const res = await transcribeAudio(base64Encode(bytes), mimeType);
  if (!res.ok) return { kind: res.reason === "rate_limit" ? "rate_limit" : "error" };

  const text = res.text.trim();
  return text ? { kind: "ok", text } : { kind: "error" };
}
