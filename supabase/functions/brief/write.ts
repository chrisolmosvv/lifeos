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
// Reuses the existing Gemini setup: the GEMINI_API_KEY secret and the same model
// string as telegram/understand.ts (kept in sync by hand — see GEMINI_MODEL).

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-3.1-flash-lite"; // mirrors telegram/understand.ts (free tier)

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
- Do not add encouragement, advice, or opinion beyond a light factual framing.
- Times and dates are already in the owner's local time; state them as given.

Output ONLY the message text — no labels, no bullet list, no markdown.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Trim and strip any stray exclamation mark (the voice forbids them) — a light
// safety net behind the prompt; the facts themselves are never altered here.
function sanitize(s: string): string {
  return s.trim().replace(/!+/g, ".");
}

// Ask Gemini to write the brief from `facts`. On ANY failure returns `fallback`
// (the plain checklist). Never throws, never returns empty.
export async function writeBrief(facts: string, fallback: string): Promise<string> {
  if (!GEMINI_KEY) return fallback;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: facts }] }],
    generationConfig: { temperature: 0 },
  };

  // Up to 3 attempts. A 503 ("high demand") usually clears on a quick retry; a 429
  // means we're over the free limit — retrying won't help, so fall back immediately.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) return fallback;
      if (!res.ok) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof raw !== "string" || !raw.trim()) return fallback;
      return sanitize(raw);
    } catch (_err) {
      await sleep(1000 * (attempt + 1));
    }
  }
  return fallback;
}
