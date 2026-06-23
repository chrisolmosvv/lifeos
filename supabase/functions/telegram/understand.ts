// LifeOS — Telegram bot, Piece 5c ("Gemini reads it"), understanding only.
// This module asks Gemini to read ONE owner message into structured fields and
// turns that into a plain-English "here's what I understood" reply.
// It SAVES NOTHING — no database, no tasks, no events. That is Piece 5d.
//
// GEMINI_API_KEY lives in Supabase's secret store, never in this file or the repo.
// The key/model/endpoint + the call-and-retry loop now live in ONE shared module
// (../_shared/gemini.ts — M0); this file keeps its OWN prompt, schema, and parsing.

import { callGemini } from "../_shared/gemini.ts";
import { rollPastBareDateForward } from "../_shared/datetime.ts";

export const TZ = "Europe/Amsterdam"; // all date/time reasoning is in the owner's local time

export interface Understood {
  type: "task" | "event" | "unknown";
  title: string;
  date: string; // resolved YYYY-MM-DD, or "" if none
  time: string; // HH:MM 24-hour, or "" if none
  bare_date: boolean; // true only for an absolute month-day with NO year (e.g. "Jan 10")
  needs_time: boolean; // true if this is an appointment/event that wants a clock time but none was given
  needs_clarification: boolean;
  note: string; // short reason when unsure (may be "")
}

// The rules the owner decided, baked in. Gemini is told to return ONLY JSON.
// M2: the message can describe MORE THAN ONE item; return a JSON ARRAY (one element for
// a single item). The per-item rules are unchanged from before.
const SYSTEM = `You read ONE message from the owner of a personal task/calendar app and extract structured data. You never save anything; you only parse.

Rules:
- All dates and times are in the Europe/Amsterdam timezone. You are given the current local date and time; resolve every relative reference ("today", "tomorrow", "Thursday", "next week") against it.
- A vague day name means the NEXT upcoming occurrence of that day. If the named day IS today, use today (do not skip a week).
- A bare month-and-day with NO year (e.g. "Jan 10", "10 January", "10/01") means the NEXT upcoming occurrence: if that date THIS year is already past, use NEXT year. NEVER resolve a bare date into the past.
- A message USUALLY describes ONE item. Only when it clearly lists SEVERAL distinct things to add (separated by commas, "and", or line breaks) return one object per item, in the order given. When in doubt, prefer a single item. Do NOT split one thing into several.
- For EACH item:
  - Classify "type":
    - "event" if it gives a SPECIFIC CLOCK TIME (e.g. "2pm", "at 9", "14:00").
    - "task" if it has only a day, or no time at all.
    Time-of-day is the deciding signal.
  - "title": a short, clean name for the thing itself (e.g. "dentist", "call the plumber"). Do NOT put the date or time words in the title.
  - "date": the resolved calendar date as YYYY-MM-DD, or "" if none is implied.
  - "time": the clock time as HH:MM 24-hour, or "" if none.
  - "bare_date": true ONLY when "date" came from an absolute month-and-day with NO year (e.g. "Jan 10"). For relative words ("today", "tomorrow", "Friday", "next week", "yesterday") or when a year was given, set it false.
  - "needs_time": true ONLY if this is an appointment or event that normally happens at a specific clock time (e.g. lunch, dinner, a meeting, a party, an appointment, a call at a set time) but NO time was given. For ordinary to-dos and errands (buy milk, call mum, pay rent, email someone) set it false. If a time IS given, set it false.
  - If that item is unclear, gibberish, or you cannot confidently extract a task or event, set "needs_clarification" to true (and "type" to "unknown" if it is neither). Never invent details you were not given.
  - "note": one short clause explaining any uncertainty, else "".
Output ONLY a JSON array of item objects. No prose, no markdown.`;

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["task", "event", "unknown"] },
    title: { type: "string" },
    date: { type: "string" },
    time: { type: "string" },
    bare_date: { type: "boolean" },
    needs_time: { type: "boolean" },
    needs_clarification: { type: "boolean" },
    note: { type: "string" },
  },
  required: ["type", "title", "date", "time", "bare_date", "needs_time", "needs_clarification", "note"],
};

// The reply is an ARRAY of items (one element for a single-item message).
const RESPONSE_SCHEMA = { type: "array", items: ITEM_SCHEMA };

// Current local date/time as a line Gemini can anchor relative dates to.
function nowLocal(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return `${weekday} ${date} ${time}`;
}

// The outcome of a read: understood, over the free AI limit, or unreadable.
// Lets the caller give the right plain-English reply instead of one catch-all.
export type ReadResult =
  | { kind: "ok"; value: Understood[] }
  | { kind: "rate_limit" }
  | { kind: "error" };

// Ask Gemini to read the message. Never throws — always returns a ReadResult.
// The network + retry + 429 handling is the shared module's job (M0); this function
// owns the prompt, the JSON schema, and turning Gemini's reply into a typed outcome.
export async function understand(text: string): Promise<ReadResult> {
  const result = await callGemini({
    system: SYSTEM,
    user: `Current local date and time (Europe/Amsterdam): ${nowLocal()}\nMessage: ${text}`,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  // Over the free-tier limit (429) vs. any other failure — kept distinct so the
  // caller still gives the right reply (unchanged behaviour from before).
  if (!result.ok) {
    return result.reason === "rate_limit" ? { kind: "rate_limit" } : { kind: "error" };
  }

  try {
    const parsed = JSON.parse(result.text);
    // Expect an array; keep only well-shaped items. An empty result (gibberish) comes
    // back as [] and the caller treats it as "nothing usable".
    if (!Array.isArray(parsed)) return { kind: "error" };
    const items = parsed.filter(
      (p) => typeof p?.type === "string" && typeof p?.title === "string",
    ) as Understood[];
    // Belt-and-suspenders: a bare month-day must never land in the past, even if the
    // model slips. (Scoped by bare_date so relative refs like "yesterday" are untouched.)
    for (const it of items) {
      if (it.bare_date && it.date) it.date = rollPastBareDateForward(it.date);
    }
    return { kind: "ok", value: items };
  } catch (_err) {
    return { kind: "error" };
  }
}

// "2026-06-25" -> "Thu 25 Jun" (in Europe/Amsterdam). Noon-UTC avoids any
// timezone date-shift when formatting a bare calendar date.
export function humanDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
}

// Today's date as YYYY-MM-DD in the owner's timezone (for bucket choice and as an
// event's default date when none was stated).
export function todayYMD(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// Whether Gemini couldn't confidently extract a task/event — in which case we save
// NOTHING and ask the owner to rephrase (no junk row from a bad read).
export function isUnsure(u: Understood): boolean {
  return u.needs_clarification || u.type === "unknown" || !u.title.trim();
}

// The plain-English "that wasn't a task/event" reply (saves nothing). Kind, and
// clear that nothing was stored — covers chit-chat and gibberish alike.
export function unsureReply(u: Understood): string {
  const why = u.note?.trim() ? ` (${u.note.trim()})` : "";
  return `That didn't look like a task or an appointment to me, so I didn't save anything.${why}\nSend me something to do, or an appointment with a time, and I'll file it.`;
}
