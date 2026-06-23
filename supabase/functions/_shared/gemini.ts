// LifeOS — the ONE place all Gemini access goes through (Marty track, M0).
//
// Before M0, the two Gemini callers (telegram/understand.ts = words→data, and
// brief/write.ts = data→words) each hard-coded the model string, rebuilt the same
// endpoint URL, and carried their own copy of the fetch + 3-retry + 429 loop — the
// model even had to be "kept in sync by hand." Now all of that lives here ONCE.
//
// Each caller keeps its OWN parsing and its OWN fallback — this module only does the
// network part and reports a plain outcome (ok / rate-limited / error). It does NOT
// decide what a failure means for the user; the caller does (understand.ts surfaces a
// typed "rate limited" reply; write.ts falls back to the plain checklist).
//
// GEMINI_API_KEY lives in Supabase's secret store, never in this file or the repo.
//
// ── GOING PAID LATER (one-step, no code change) ────────────────────────────────
// The free tier trains on inputs — fine for tasks/events, NOT for health/mood. When
// we need a private, paid key, the clean path is:
//   1. Create a NEW Google Cloud project with billing enabled and make a Gemini key
//      there. (Do NOT enable billing on the existing free-tier project — that DELETES
//      its free tier; a separate project keeps the free one intact as a fallback.)
//   2. Swap the GEMINI_API_KEY secret value in Supabase to the new key.
// No code changes here — the key is read from the secret at run time. (If the paid
// tier wants a different model name, that's the one line below — MODEL — and it
// updates both callers at once, which is the whole point of this module.)

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const MODEL = "gemini-3.1-flash-lite"; // free tier: 500 req/day, 15/min — highest free daily limit
const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The plain outcome of a call. `ok` carries Gemini's raw text (the caller parses it);
// a failure is either "rate_limit" (over the free limit — retrying in seconds won't
// help) or "error" (anything else: missing key, junk shape, repeated transient fault).
export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; reason: "rate_limit" | "error" };

// The shared network core: POST a request body, with up to 3 attempts (a transient 503
// usually clears on a quick retry; a 429 means we're over the free limit, reported
// distinctly and stopped). Returns the first text candidate. Never throws.
async function post(body: unknown): Promise<GeminiResult> {
  if (!GEMINI_KEY) return { ok: false, reason: "error" };
  const url = `${ENDPOINT}?key=${GEMINI_KEY}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) return { ok: false, reason: "rate_limit" };
      if (!res.ok) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof raw !== "string") return { ok: false, reason: "error" };
      return { ok: true, text: raw };
    } catch (_err) {
      await sleep(1000 * (attempt + 1));
    }
  }
  return { ok: false, reason: "error" };
}

// Call Gemini with a system instruction + one user message. `generationConfig` is
// passed straight through, so callers keep their own settings (e.g. temperature 0,
// or a JSON responseSchema for the capture parser). Never throws.
export async function callGemini(opts: {
  system: string;
  user: string;
  generationConfig?: Record<string, unknown>;
}): Promise<GeminiResult> {
  return post({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: opts.generationConfig ?? {},
  });
}

// Transcribe a voice note to text (M7). Audio needs a different call shape — an inline
// audio part instead of a text user message — but the SAME key/model/endpoint/retry. Free
// tier per the M0 decision (a spoken "buy milk" isn't sensitive). Returns the transcript.
export async function transcribeAudio(base64: string, mimeType: string): Promise<GeminiResult> {
  return post({
    contents: [{
      role: "user",
      parts: [
        { text: "Transcribe this voice note to plain text. Return ONLY the words spoken — no commentary, no quotes, no labels." },
        { inlineData: { mimeType, data: base64 } },
      ],
    }],
    generationConfig: { temperature: 0 },
  });
}
