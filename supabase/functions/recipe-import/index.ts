// LifeOS — Food → recipe-import (F8): the ONE AI touch in V1. Paste text OR a URL → Gemini parses
// it into the house recipe schema → the app pre-fills the F7 editor (the review screen) → the owner
// spot-checks + saves via the F7 write. ONLY recipe text leaves the app (the paste, or the fetched
// page's text) — nothing personal, nothing from logs/health — which is WHY the FREE Gemini key (the
// shared callGemini seam) is acceptable here.
//
// Called by the app AS THE OWNER (verify_jwt = true, pinned in config.toml; CORS like food-search).
// DISTINCT outcomes so the UI shows the right message:
//   { ok:true, recipe, source_url? }   — a usable parse (may be partial: a title OR ingredient OR step)
//   { ok:false, error:"fetch_fail" }   — the URL couldn't be fetched/extracted → the UI offers paste
//   { ok:false, error:"parse_fail" }   — Gemini gave nothing usable / not a recipe → honest fail, text kept
//
// SECRET: GEMINI_API_KEY (already set for Marty), read inside the shared seam.

import { callGemini } from "../_shared/gemini.ts";
import { fetchRecipeText } from "./extract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const SYSTEM = `You convert a recipe (pasted text or a web page's text) into STRICT JSON for a cookbook. Output ONLY the JSON object — no prose, no markdown fences.
Schema:
{ "title": string, "servings": number|null, "prep_minutes": number|null, "cook_minutes": number|null,
  "ingredients": [ { "raw_text": string, "name": string, "amount": number|null, "unit": string|null } ],
  "steps": [ string ] }
Rules:
- "raw_text" = the original ingredient line (e.g. "2 tbsp melted butter").
- "name" = the core food for database matching: lowercase, no quantity or prep words (e.g. "butter").
- "amount"/"unit" = the numeric quantity + its unit when clearly present, else null.
- "steps" = the method, one string per step, in order.
- If the text is NOT a recipe, return {"title":"","servings":null,"prep_minutes":null,"cook_minutes":null,"ingredients":[],"steps":[]}.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    servings: { type: "NUMBER", nullable: true },
    prep_minutes: { type: "NUMBER", nullable: true },
    cook_minutes: { type: "NUMBER", nullable: true },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          raw_text: { type: "STRING" },
          name: { type: "STRING" },
          amount: { type: "NUMBER", nullable: true },
          unit: { type: "STRING", nullable: true },
        },
        required: ["raw_text", "name"],
      },
    },
    steps: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["title", "ingredients", "steps"],
};

// Defensive parse: strip stray ``` fences (despite the instruction), JSON.parse in try/catch.
function parseRecipe(text: string): Record<string, unknown> | null {
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// "Usable" = a title OR any ingredient OR any step (partial-ok); else nothing → parse_fail.
function isUsable(r: Record<string, unknown> | null): boolean {
  if (!r) return false;
  const hasTitle = typeof r.title === "string" && r.title.trim().length > 0;
  const hasIng = Array.isArray(r.ingredients) && r.ingredients.length > 0;
  const hasStep = Array.isArray(r.steps) && r.steps.length > 0;
  return hasTitle || hasIng || hasStep;
}

// Normalise to the house shape the app expects (defensive against odd model output).
function normalise(r: Record<string, unknown>) {
  const ings = Array.isArray(r.ingredients) ? (r.ingredients as Record<string, unknown>[]) : [];
  const steps = Array.isArray(r.steps) ? (r.steps as unknown[]) : [];
  return {
    title: typeof r.title === "string" ? r.title.trim() : "",
    servings: numOrNull(r.servings),
    prep_minutes: numOrNull(r.prep_minutes),
    cook_minutes: numOrNull(r.cook_minutes),
    ingredients: ings
      .filter((i) => i && (strOrNull(i.raw_text) || strOrNull(i.name)))
      .map((i) => ({
        raw_text: strOrNull(i.raw_text) || strOrNull(i.name) || "",
        name: strOrNull(i.name) || strOrNull(i.raw_text) || "",
        amount: numOrNull(i.amount),
        unit: strOrNull(i.unit),
      })),
    steps: steps.map((s) => (typeof s === "string" ? s.trim() : "")).filter((s) => s.length > 0),
  };
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

  const res = await callGemini({
    system: SYSTEM,
    user: input.slice(0, 12000),
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  });
  if (!res.ok) return json({ ok: false, error: "parse_fail", reason: res.reason }); // AI busy / error

  const parsed = parseRecipe(res.text);
  if (!isUsable(parsed)) return json({ ok: false, error: "parse_fail" });

  return json({ ok: true, recipe: normalise(parsed as Record<string, unknown>), source_url: sourceUrl });
});
