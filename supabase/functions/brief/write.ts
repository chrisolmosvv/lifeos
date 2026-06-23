// LifeOS — the morning brief, Piece 6c: Gemini writes it in real words.
//
// This is the OPPOSITE direction from capture (Phase 5): there it's words -> data;
// here it's data -> words. We take the SAME verified facts day.ts gathered and ask
// Gemini to rewrite them in the "quiet broadsheet" voice. Gemini ONLY rewrites the
// supplied facts — it must not invent, add, drop, or guess at any item.
//
// SAFETY — FALL BACK, NEVER GO SILENT: if Gemini is missing, errors, returns junk,
// or hits its free-tier limit (429), we return the plain 6b checklist instead, so
// the owner ALWAYS gets their day. A silent brief is the worst outcome. Never throws.
//
// The Gemini key/model/endpoint + the call-and-retry loop now live in ONE shared
// module (../_shared/gemini.ts — M0), so the model is no longer "kept in sync by
// hand." This file keeps its OWN voice prompt and its OWN fallback (the checklist).

import { callGemini } from "../_shared/gemini.ts";

// The voice (06-design.md "Voice & words"): warm but restrained, a columnist not a
// cheerleader. The hard constraints keep it truthful to the supplied facts.
const SYSTEM = `You write a short personal morning brief for the owner of a calendar and task app. You are given the facts of the owner's day, already gathered and verified. Rewrite ONLY those facts as one short message.

Voice:
- Warm but restrained — a good columnist, not a cheerleader. Calm, spare, factual, with a light editorial touch.
- Sentence case. Plain verbs. No hype, no filler, no emoji, no exclamation marks.
- Short: about 2 to 4 short sentences. It's a 7am glance, not a read.
- Open with a brief greeting such as "Good morning."

Strict rules:
- Use ONLY the facts given. Do NOT invent, add, drop, or guess at any item, time, count, name, or detail. Every event, task, or deadline you mention must appear in the facts.
- If a group is empty, say so plainly ("a quiet calendar today", "nothing overdue") — never imply something is there.
- If a "task that's been waiting" is given, weave it in as ONE gentle line (for example: "One thing that's been waiting: renew the passport."). Mention it once, using the task exactly as named. If none is given, do NOT add any such reminder or imply one.
- If a "clear stretch" / free window is given, you may offer it as ONE gentle option — an offer, never a command (for example: "Your afternoon after 3 is clear — could be a good window for it."). Name the suggested task and the time. If the note says the task is already noted above, fold it into a single coherent thought and do NOT name that task twice. If no free window is given, do NOT invent free time or a suggestion.
- Do not add encouragement, advice, or opinion beyond a light factual framing.
- Times and dates are already in the owner's local time; state them as given.

Output ONLY the message text — no labels, no bullet list, no markdown.`;

// Trim and strip any stray exclamation mark (the voice forbids them) — a light
// safety net behind the prompt; the facts themselves are never altered here.
function sanitize(s: string): string {
  return s.trim().replace(/!+/g, ".");
}

// Ask Gemini to write the brief from `facts`. On ANY failure (missing key, rate
// limit, error, or empty/junk output) returns `fallback` (the plain checklist) — the
// "never go silent" rule. Never throws, never returns empty.
export async function writeBrief(facts: string, fallback: string): Promise<string> {
  const result = await callGemini({
    system: SYSTEM,
    user: facts,
    generationConfig: { temperature: 0 },
  });
  // Rate-limited or any other failure → the plain checklist (unchanged behaviour).
  if (!result.ok) return fallback;
  // Empty/whitespace output → also fall back, so the owner always gets their day.
  if (!result.text.trim()) return fallback;
  return sanitize(result.text);
}
