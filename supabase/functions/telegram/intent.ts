// LifeOS — Telegram bot, M1: decide what ONE message IS before we act on it.
//
// The owner either wants to ADD something (a task/appointment) or is ASKING about
// what's already in their schedule. This module classifies which — it NEVER saves or
// changes anything; it only labels the message so route.ts can send it the right way.
//
// It goes through the M0 shared Gemini seam (../_shared/gemini.ts) — no key, model, or
// endpoint here. Temperature 0, structured JSON out.
//
// SAFETY BIAS: a wrong "capture" guess would WRITE something the owner didn't want, so
// when it genuinely can't tell capture from question we return "unclear" and the router
// ASKS — we never default to capture on a coin-flip.

import { callGemini } from "../_shared/gemini.ts";
import { TZ } from "./understand.ts"; // reuse the one timezone constant (save.ts does too)

export type QueryType = "agenda" | "forgot" | "free";

// What the classifier decided. For a question, the extra fields say which kind and
// (for agenda/free) which day / part of day — already resolved against local "now".
export interface Classified {
  kind: "question" | "capture" | "unclear";
  query_type: QueryType | "";
  date: string; // resolved YYYY-MM-DD, or "" if none/none-needed
  day_part: "morning" | "afternoon" | "evening" | "day" | "";
}

// Same 3-outcome shape understand.ts uses, so the router handles AI limits/errors the
// same way whether it's classifying or capturing.
export type ClassifyResult =
  | { kind: "ok"; value: Classified }
  | { kind: "rate_limit" }
  | { kind: "error" };

const SYSTEM = `You are the message router for the owner's personal task and calendar app. Decide what ONE incoming message is. You only classify — you never save, change, or answer anything.

Return JSON:
- "kind":
  - "capture" — the message states something to ADD or remember (e.g. "call mum tomorrow", "dentist friday 3pm", "buy milk", "gym at 6", "pay rent on the 1st"). A new to-do or appointment.
  - "question" — the message ASKS about the existing schedule or tasks (e.g. "what's on thursday?", "what did I forget?", "what's overdue?", "am I free friday afternoon?", "do I have anything tomorrow?", "when's the dentist?").
  - "unclear" — you genuinely cannot tell whether they want to add something or are asking. If you are in doubt between "capture" and "question", choose "unclear". Do NOT guess "capture": a wrong guess would save something the owner did not ask for.
- "query_type" (for a question only): "agenda" (what's on / do I have on a day), "forgot" (what's overdue / slipping / did I forget), or "free" (am I free / do I have time). Use "" for capture or unclear.
- "date" (for a question that names a day): that day resolved to YYYY-MM-DD in the Europe/Amsterdam timezone, against the current local date you are given. A vague day name means the NEXT upcoming occurrence (today if it IS today). Use "" if no specific day is mentioned or it is not needed.
- "day_part" (for a "free" question): "morning", "afternoon", "evening", or "day" (a whole day). Use "" otherwise.

Output ONLY the JSON object. No prose, no markdown.`;

const SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["question", "capture", "unclear"] },
    query_type: { type: "string" },
    date: { type: "string" },
    day_part: { type: "string" },
  },
  required: ["kind", "query_type", "date", "day_part"],
};

// Current local date/time, so the classifier can resolve "Thursday" the same way
// capture does. (Kept tiny and local — understand.ts has its own copy; unifying the
// telegram date helpers is a separate later cleanup, see 08-marty-upgrade.md.)
function nowLocal(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return `${weekday} ${date} ${time}`;
}

const QUERY_TYPES: QueryType[] = ["agenda", "forgot", "free"];
const DAY_PARTS = ["morning", "afternoon", "evening", "day"];

// Classify one message. Never throws — always returns a ClassifyResult.
export async function classify(text: string): Promise<ClassifyResult> {
  const result = await callGemini({
    system: SYSTEM,
    user: `Current local date and time (Europe/Amsterdam): ${nowLocal()}\nMessage: ${text}`,
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: SCHEMA },
  });

  if (!result.ok) {
    return result.reason === "rate_limit" ? { kind: "rate_limit" } : { kind: "error" };
  }

  try {
    const p = JSON.parse(result.text);
    if (p?.kind !== "question" && p?.kind !== "capture" && p?.kind !== "unclear") return { kind: "error" };
    // Coerce the free-text fields to the values we expect; anything else becomes "".
    const query_type = QUERY_TYPES.includes(p?.query_type) ? p.query_type : "";
    const day_part = DAY_PARTS.includes(p?.day_part) ? p.day_part : "";
    return {
      kind: "ok",
      value: {
        kind: p.kind,
        query_type: query_type as QueryType | "",
        date: typeof p?.date === "string" ? p.date : "",
        day_part: day_part as Classified["day_part"],
      },
    };
  } catch (_err) {
    return { kind: "error" };
  }
}
