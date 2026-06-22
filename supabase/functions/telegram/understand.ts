// LifeOS — Telegram bot, Piece 5c ("Gemini reads it"), understanding only.
// This module asks Gemini to read ONE owner message into structured fields and
// turns that into a plain-English "here's what I understood" reply.
// It SAVES NOTHING — no database, no tasks, no events. That is Piece 5d.
//
// GEMINI_API_KEY lives in Supabase's secret store, never in this file or the repo.

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash"; // Flash, free tier (per the architecture doc)
const TZ = "Europe/Amsterdam"; // all date/time reasoning is in the owner's local time

export interface Understood {
  type: "task" | "event" | "unknown";
  title: string;
  date: string; // resolved YYYY-MM-DD, or "" if none
  time: string; // HH:MM 24-hour, or "" if none
  needs_clarification: boolean;
  note: string; // short reason when unsure (may be "")
}

// The rules the owner decided, baked in. Gemini is told to return ONLY JSON.
const SYSTEM = `You read ONE message from the owner of a personal task/calendar app and extract structured data. You never save anything; you only parse.

Rules:
- All dates and times are in the Europe/Amsterdam timezone. You are given the current local date and time; resolve every relative reference ("today", "tomorrow", "Thursday", "next week") against it.
- A vague day name means the NEXT upcoming occurrence of that day. If the named day IS today, use today (do not skip a week).
- Classify "type":
  - "event" if the message gives a SPECIFIC CLOCK TIME (e.g. "2pm", "at 9", "14:00").
  - "task" if it has only a day, or no time at all.
  Time-of-day is the deciding signal.
- "title": a short, clean name for the thing itself (e.g. "dentist", "call the plumber"). Do NOT put the date or time words in the title.
- "date": the resolved calendar date as YYYY-MM-DD, or "" if none is implied.
- "time": the clock time as HH:MM 24-hour, or "" if none.
- If the message is unclear, gibberish, or you cannot confidently extract a task or event, set "needs_clarification" to true (and "type" to "unknown" if it is neither). Never invent details you were not given.
- "note": one short clause explaining any uncertainty, else "".
Output ONLY the JSON object. No prose, no markdown.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["task", "event", "unknown"] },
    title: { type: "string" },
    date: { type: "string" },
    time: { type: "string" },
    needs_clarification: { type: "boolean" },
    note: { type: "string" },
  },
  required: ["type", "title", "date", "time", "needs_clarification", "note"],
};

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
  | { kind: "ok"; value: Understood }
  | { kind: "rate_limit" }
  | { kind: "error" };

// Ask Gemini to read the message. Never throws — always returns a ReadResult.
export async function understand(text: string): Promise<ReadResult> {
  if (!GEMINI_KEY) return { kind: "error" };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{
      role: "user",
      parts: [{ text: `Current local date and time (Europe/Amsterdam): ${nowLocal()}\nMessage: ${text}` }],
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  // Up to 3 attempts. A transient "high demand" (503) usually clears on a quick
  // retry. A 429 means we're over the free-tier limit — retrying in seconds won't
  // help, so report that distinctly and stop (don't waste the quota or stall).
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) return { kind: "rate_limit" };
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof raw !== "string") return { kind: "error" };
      const parsed = JSON.parse(raw);
      // Basic shape check — if Gemini wandered off the schema, treat as unreadable.
      if (typeof parsed?.type !== "string" || typeof parsed?.title !== "string") return { kind: "error" };
      return { kind: "ok", value: parsed as Understood };
    } catch (_err) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { kind: "error" };
}

// "2026-06-25" -> "Thu 25 Jun" (in Europe/Amsterdam). Noon-UTC avoids any
// timezone date-shift when formatting a bare calendar date.
function humanDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
}

// Build Marty's plain-English "what I understood" reply. Always ends with the
// "(Not saved yet.)" line so the owner knows nothing was stored.
export function formatReply(u: Understood): string {
  const unsure = u.needs_clarification || u.type === "unknown" || !u.title.trim();
  if (unsure) {
    const why = u.note?.trim() ? ` (${u.note.trim()})` : "";
    return `I'm not sure I understood that — could you rephrase?${why}\n(Nothing saved.)`;
  }

  const isEvent = u.type === "event";
  const label = isEvent ? "an EVENT" : "a TASK";
  const when: string[] = [];
  if (u.date) when.push(humanDate(u.date));
  if (u.time) when.push(u.time);
  const whenStr = when.length ? when.join(", ") : "no date";

  return `I read that as ${label}: '${u.title.trim()}', ${whenStr}.\n(Not saved yet.)`;
}
