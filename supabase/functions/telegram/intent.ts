// LifeOS — Telegram bot: decide what ONE message IS before we act on it.
//
// The owner can: ADD something (capture), ASK about their schedule (question), CHANGE
// an existing item (edit: complete / reschedule / rename / delete), or be ambiguous.
// This module classifies which — it NEVER saves or changes anything; it only labels the
// message + extracts the fields the right handler needs.
//
// It goes through the M0 shared Gemini seam (../_shared/gemini.ts) — no key, model, or
// endpoint here. Temperature 0, structured JSON out.
//
// SAFETY BIAS: a wrong guess could WRITE or CHANGE data the owner didn't intend, so when
// it genuinely can't tell add/ask/change apart we return "unclear" and the router ASKS.

import { callGemini } from "../_shared/gemini.ts";
import { TZ } from "./understand.ts"; // reuse the one timezone constant

export type QueryType = "agenda" | "forgot" | "free";
export type EditOp = "complete" | "reschedule" | "rename" | "delete" | "categorize";

// What the classifier decided. For a question, the query_* fields are filled; for an
// edit, the op + target_* (which item) + new_* (the change) fields are filled. Unused
// fields are "" / false.
export interface Classified {
  kind: "question" | "capture" | "edit" | "unclear";
  // question:
  query_type: QueryType | "";
  date: string;
  day_part: "morning" | "afternoon" | "evening" | "day" | "";
  // edit:
  op: EditOp | "";
  target_title: string; // a name fragment identifying the existing item
  target_time: string; // HH:MM, to identify by time ("the 3pm"); else ""
  target_date: string; // YYYY-MM-DD, to identify by day; else ""
  new_title: string; // rename → the new name
  new_date: string; // reschedule → the new day (YYYY-MM-DD); else ""
  new_time: string; // reschedule → the new clock time (HH:MM); else ""
  new_date_bare: boolean; // true if new_date came from a bare month-day with no year
  new_category: string; // categorize → the category name to file under
}

export type ClassifyResult =
  | { kind: "ok"; value: Classified }
  | { kind: "rate_limit" }
  | { kind: "error" };

const SYSTEM = `You are the message router for the owner's personal task and calendar app. Decide what ONE incoming message is. You only classify — you never save, change, or answer anything.

"kind" is one of:
- "capture" — states something NEW to add/remember (e.g. "call mum tomorrow", "dentist friday 3pm", "buy milk, call the dentist and book the car in"). A new to-do or appointment.
- "question" — ASKS about the existing schedule/tasks (e.g. "what's on thursday?", "what did I forget?", "am I free friday afternoon?").
- "edit" — wants to CHANGE an item that already exists. One of:
    - complete: "done X", "mark X done", "finished X", "X is done".
    - reschedule: "move X to friday", "reschedule X to 3pm", "push X to next week".
    - rename: "rename X to Y", "change X's name to Y", "call X 'Y' instead".
    - delete: "delete X", "remove X", "cancel X", "drop X".
    - categorize: file/refile an item under a CATEGORY. "that's Admin", "no, Errands", "file call plumber under Work", "call plumber is Errands". Put the category name in "new_category". If the item isn't named (e.g. just "that's Admin" — correcting the thing just added), leave "target_title" "". NOTE: "move X to <a category>" is categorize, but "move X to <a day or time>" is reschedule — a category is a named bucket, not a date/time.
- "unclear" — you genuinely cannot tell whether they want to add, ask, or change. If in doubt, choose "unclear" — do NOT guess; a wrong guess could write or change the wrong thing.

Date/time rules (Europe/Amsterdam, resolve against the current local date you are given):
- A vague day name means the NEXT upcoming occurrence (today if it IS today).
- A bare month-day with NO year (e.g. "Jan 10") means the next upcoming occurrence: if this year's is past, use next year. NEVER resolve a bare date into the past.

Fill these (use "" / false when not applicable):
- question: "query_type" = "agenda" | "forgot" | "free"; "date" = the day asked about (YYYY-MM-DD); "day_part" = "morning"|"afternoon"|"evening"|"day" for a "free" question.
- edit: "op" = complete|reschedule|rename|delete|categorize. "target_title" = the words naming the existing item (e.g. "the dentist" → "dentist"); leave "" for a bare "that's X" correction. "target_time" = HH:MM if the item is identified by a clock time ("the 3pm" → "15:00"). "target_date" = YYYY-MM-DD if identified by a day. "new_title" = the new name (rename). "new_date" = the new day YYYY-MM-DD (reschedule). "new_time" = the new clock time HH:MM (reschedule). "new_date_bare" = true if new_date came from a bare month-day with no year. "new_category" = the category name (categorize).

Output ONLY the JSON object. No prose, no markdown.`;

const SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["question", "capture", "edit", "unclear"] },
    query_type: { type: "string" },
    date: { type: "string" },
    day_part: { type: "string" },
    op: { type: "string" },
    target_title: { type: "string" },
    target_time: { type: "string" },
    target_date: { type: "string" },
    new_title: { type: "string" },
    new_date: { type: "string" },
    new_time: { type: "string" },
    new_date_bare: { type: "boolean" },
    new_category: { type: "string" },
  },
  required: [
    "kind", "query_type", "date", "day_part", "op", "target_title",
    "target_time", "target_date", "new_title", "new_date", "new_time", "new_date_bare", "new_category",
  ],
};

// Current local date/time, so the classifier can resolve "Thursday"/"Jan 10" correctly.
function nowLocal(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return `${weekday} ${date} ${time}`;
}

const QUERY_TYPES: QueryType[] = ["agenda", "forgot", "free"];
const DAY_PARTS = ["morning", "afternoon", "evening", "day"];
const EDIT_OPS: EditOp[] = ["complete", "reschedule", "rename", "delete", "categorize"];
const str = (v: unknown) => (typeof v === "string" ? v : "");

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
    if (!["question", "capture", "edit", "unclear"].includes(p?.kind)) return { kind: "error" };
    return {
      kind: "ok",
      value: {
        kind: p.kind,
        query_type: (QUERY_TYPES.includes(p?.query_type) ? p.query_type : "") as QueryType | "",
        date: str(p?.date),
        day_part: (DAY_PARTS.includes(p?.day_part) ? p.day_part : "") as Classified["day_part"],
        op: (EDIT_OPS.includes(p?.op) ? p.op : "") as EditOp | "",
        target_title: str(p?.target_title),
        target_time: str(p?.target_time),
        target_date: str(p?.target_date),
        new_title: str(p?.new_title),
        new_date: str(p?.new_date),
        new_time: str(p?.new_time),
        new_date_bare: p?.new_date_bare === true,
        new_category: str(p?.new_category),
      },
    };
  } catch (_err) {
    return { kind: "error" };
  }
}
