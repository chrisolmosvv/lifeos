// LifeOS — Food → recipe-import (F8 + Cookbook rebuild Piece 2a). Paste text OR a URL → Gemini
// parses it in TWO passes → the app pre-fills the review screen → the owner spot-checks + saves.
//   PASS 1 (schema.ts) — the body: title/servings/times/cuisine, a multi_recipe flag, ingredients,
//     and steps as a terse rewrite + the verbatim original. Merge-don't-split lives in the prompt.
//   PASS 2 (enrich.ts) — enrichment: a duration/tag/station/hold_tolerance on EVERY step, plus
//     generated prep steps for the physical work recipes hide in their ingredient lists.
// The accuracy layer (normalise.ts: repairDeps, assignStepPositions, cleanLabel, the validators)
// runs on the base step list exactly as before. Only recipe text leaves the app — nothing from
// logs/health — which is WHY the FREE Gemini key is acceptable here.
//
// Called by the app AS THE OWNER (verify_jwt = true, pinned in config.toml; CORS like food-search).
// DISTINCT outcomes so the UI shows the right message:
//   { ok:true, recipe, source_url? }        — a usable parse (may be partial; enriched flag inside)
//   { ok:false, error:"fetch_fail" }        — the URL couldn't be fetched/extracted → UI offers paste
//   { ok:false, error:"multi_recipe" }      — the page holds more than one recipe → UI asks for one
//   { ok:false, error:"parse_fail" }        — Gemini gave nothing usable → honest fail, text kept
//
// SECRET: GEMINI_API_KEY (already set for Marty), read inside the shared seam.

import { callGemini } from "../_shared/gemini.ts";
import { fetchRecipeText } from "./extract.ts";
import { PASS1_SYSTEM, PASS1_SCHEMA } from "./schema.ts";
import { normalisePass1, isUsable, parseJson, repairDeps, assignStepPositions } from "./normalise.ts";
import { enrich } from "./enrich.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body: { text?: unknown; url?: unknown };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }

  const pasted = typeof body.text === "string" ? body.text.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";

  // Paste wins when both are present. A URL is fetched server-side; a fetch failure is DISTINCT.
  let input = pasted;
  let sourceUrl: string | null = null;
  if (!input && url) {
    try {
      input = await fetchRecipeText(url);
      sourceUrl = url;
    } catch {
      return json({ ok: false, error: "fetch_fail" });
    }
  }
  if (!input) return json({ ok: false, error: "parse_fail" });

  // ── PASS 1: the body ──
  const res = await callGemini({
    system: PASS1_SYSTEM,
    user: input.slice(0, 12000),
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: PASS1_SCHEMA },
  });
  if (!res.ok) return json({ ok: false, error: "parse_fail", reason: res.reason }); // AI busy / error

  const parsed = parseJson(res.text);
  if (!isUsable(parsed)) return json({ ok: false, error: "parse_fail" });

  const bodyData = normalisePass1(parsed as Record<string, unknown>);
  // A page with more than one distinct recipe: refuse cleanly rather than guessing which one.
  if (bodyData.multi_recipe) return json({ ok: false, error: "multi_recipe" });

  // Accuracy layer on the base step list, unchanged from the single-call era.
  bodyData.steps = repairDeps(bodyData.steps);
  bodyData.ingredients = assignStepPositions(bodyData.ingredients, bodyData.steps);

  // ── PASS 2: enrichment (never loses the body on failure) ──
  const { steps, enriched, prepCount } = await enrich(bodyData);

  // Prep steps take the front, so shift each ingredient's step link back by that count.
  const ingredients = bodyData.ingredients.map((i) =>
    i.step_number == null ? i : { ...i, step_number: i.step_number + prepCount });

  const recipe = {
    title: bodyData.title,
    servings: bodyData.servings,
    prep_minutes: bodyData.prep_minutes,
    cook_minutes: bodyData.cook_minutes,
    cuisine: bodyData.cuisine,
    cuisine_confidence: bodyData.cuisine_confidence,
    enriched,
    ingredients,
    steps,
  };
  return json({ ok: true, recipe, source_url: sourceUrl });
});
