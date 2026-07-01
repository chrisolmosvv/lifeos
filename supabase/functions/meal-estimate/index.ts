// LifeOS — Food → meal-estimate (V2 P5): the SECOND live AI touch — a ballpark macro estimate for a
// TYPED MEAL DESCRIPTION. Description in → Gemini → {kcal, protein, carbs, fat} → the app pre-fills
// the estimate panel, the owner CONFIRMS/adjusts, then logs (is_estimated=true). It reasons over a
// DESCRIPTION the owner typed — never their logged intake/goals — and is human-confirmed, so it rides
// the FREE Gemini key (shared with recipe-import + the P1 reranker; the paid-key health boundary holds).
//
// Called by the app AS THE OWNER (verify_jwt=true, pinned in config.toml; CORS like the others).
// DETERMINISTIC FALLBACK: the panel is a manual 4-number form the AI merely pre-fills. This function
// returning { ok:false } (Gemini down/quota-out, OR the MEAL_ESTIMATE_OFF kill-switch) makes the panel
// open to manual entry — an estimate NEVER hard-stops. MEAL_ESTIMATE_OFF proves that path with AI off.
//
// SECRET: GEMINI_API_KEY (already set), read inside the shared seam.

import { callGemini } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const SYSTEM = `You estimate the nutrition of a described meal or food for a nutrition logger. Given a short DESCRIPTION, return a best-effort BALLPARK for the WHOLE described portion. Output ONLY JSON: {"kcal":number,"protein":number,"carbs":number,"fat":number} — kcal in kilocalories, protein/carbs/fat in grams, all >= 0. If you truly cannot estimate, return zeros.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: { kcal: { type: "NUMBER" }, protein: { type: "NUMBER" }, carbs: { type: "NUMBER" }, fat: { type: "NUMBER" } },
  required: ["kcal", "protein", "carbs", "fat"],
};

const nn = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  // The kill-switch (fallback proof): AI off → the panel drops to manual entry.
  if (Deno.env.get("MEAL_ESTIMATE_OFF")) return json({ ok: false, error: "unavailable" });

  let body: { description?: unknown };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 2) return json({ ok: false, error: "empty" });

  const res = await callGemini({
    system: SYSTEM,
    user: description.slice(0, 500),
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  });
  if (!res.ok) return json({ ok: false, error: "unavailable" }); // quota/error → client falls to manual

  try {
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const p = JSON.parse(raw);
    return json({ ok: true, estimate: { kcal: nn(p.kcal), protein: nn(p.protein), carbs: nn(p.carbs), fat: nn(p.fat) } });
  } catch {
    return json({ ok: false, error: "unavailable" });
  }
});
