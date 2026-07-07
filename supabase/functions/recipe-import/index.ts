// LifeOS — Food → recipe-import (F8 + Cookbook V2 Piece 2). Paste text OR a URL → Gemini parses it
// into the house recipe schema with ENRICHED steps (duration, tag, dependencies) and ingredients
// (step linkage) → the app pre-fills the editor (the review screen) → the owner spot-checks + saves.
// ONLY recipe text leaves the app — nothing personal, nothing from logs/health — which is WHY the
// FREE Gemini key (the shared callGemini seam) is acceptable here. The enrichment asks only for
// cooking metadata derivable from the recipe text: durations, activity tags, parallel cues, and
// which step uses which ingredient. No intake/goals/health reasoning — free-key boundary intact.
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

const SYSTEM = `You convert a recipe (pasted text or a web page's text) into STRICT JSON for a cookbook app. Output ONLY the JSON object — no prose, no markdown fences.
Schema:
{ "title": string, "servings": number|null, "prep_minutes": number|null, "cook_minutes": number|null,
  "ingredients": [ { "raw_text": string, "name": string, "amount": number|null, "unit": string|null, "step_number": number|null } ],
  "steps": [ { "text": string, "duration_seconds": number|null, "tag": string|null, "depends_on": number[]|null } ] }
Rules:
- "raw_text" = the original ingredient line (e.g. "2 tbsp melted butter").
- "name" = the core food for database matching: lowercase, no quantity or prep words (e.g. "butter").
- "amount"/"unit" = the numeric quantity + its unit when clearly present, else null.
- Steps are 0-INDEXED (the first step is 0, the second is 1, etc.).
- "duration_seconds" = how long this step takes in seconds. Null if genuinely unknowable (e.g. "salt to taste"). For a range like "8–10 minutes", use the LOWER bound (480).
- "tag" = exactly one of "hands_on", "hands_free", or "active_heat". Use "hands_on" if you must actively stir/chop/assemble. Use "hands_free" if it simmers, rests, bakes, or proofs unattended. Use "active_heat" if it's high-heat stovetop or grilling needing constant attention. Null if unclear.
- "depends_on" = array of 0-based step numbers that must FINISH before this step can start. You MUST fill this for every step:
  • null = this step starts IMMEDIATELY with no prerequisite (only valid for the very first steps).
  • [N] = this step waits for step N to finish first.
  • [N, M] = this step waits for BOTH step N and step M.
  EXAMPLE: if step 0 is "boil water", step 1 is "meanwhile, sauté onion", step 2 is "add garlic" (after onion), step 3 is "cook pasta" (needs boiling water), step 4 is "combine" (needs both pasta and sauce): then depends_on would be null, null, [1], [0], [2, 3].
  Be AGGRESSIVE: "meanwhile", "while the X…", independent components = PARALLEL (give them null or their true predecessor only). A step that just continues the previous step gets [previous_step_number]. The FINAL step usually depends on multiple threads converging.
- "step_number" on an ingredient = the 0-based step number that PRIMARILY uses this ingredient. Most ingredients are first introduced in a specific step — assign that step. Null only if genuinely unclear or if the ingredient is used equally across many steps (e.g. "salt" used throughout).
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
          step_number: { type: "NUMBER", nullable: true },
        },
        required: ["raw_text", "name"],
      },
    },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          duration_seconds: { type: "NUMBER", nullable: true },
          tag: { type: "STRING", nullable: true },
          depends_on: { type: "ARRAY", items: { type: "NUMBER" }, nullable: true },
        },
        required: ["text"],
      },
    },
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
const intOrNull = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
const strOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Tag safety: only the three allowed values pass; anything else → null (so the DB CHECK never rejects).
const VALID_TAGS = new Set(["hands_on", "hands_free", "active_heat"]);
const tagOrNull = (v: unknown) => (typeof v === "string" && VALID_TAGS.has(v) ? v : null);

// Deps safety: must be a clean array of non-negative integers; anything else → null (sequential).
function depsOrNull(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const clean = v.filter((d) => typeof d === "number" && Number.isInteger(d) && d >= 0);
  return clean.length > 0 ? clean : null;
}

// "Usable" = a title OR any ingredient OR any step (partial-ok); else nothing → parse_fail.
function isUsable(r: Record<string, unknown> | null): boolean {
  if (!r) return false;
  const hasTitle = typeof r.title === "string" && r.title.trim().length > 0;
  const hasIng = Array.isArray(r.ingredients) && r.ingredients.length > 0;
  const hasStep = Array.isArray(r.steps) && r.steps.length > 0;
  return hasTitle || hasIng || hasStep;
}

// Safe punctuation cleanup for ingredient raw_text. Only removes clearly-malformed artifacts
// Gemini sometimes leaves (stray "(,", empty "()", doubled spaces). Never rewrites semantically.
function cleanLabel(s: string): string {
  let t = s;
  t = t.replace(/\(\s*,\s*/g, "(");  // "(," or "( ," → "("
  t = t.replace(/\(\s*\)/g, "");      // empty "()" or "( )"
  t = t.replace(/\s{2,}/g, " ");      // collapse doubled spaces
  t = t.trim();
  return t;
}

// Normalise to the house shape the app expects (defensive against odd model output).
function normalise(r: Record<string, unknown>) {
  const ings = Array.isArray(r.ingredients) ? (r.ingredients as Record<string, unknown>[]) : [];
  const rawSteps = Array.isArray(r.steps) ? (r.steps as unknown[]) : [];
  return {
    title: typeof r.title === "string" ? r.title.trim() : "",
    servings: numOrNull(r.servings),
    prep_minutes: numOrNull(r.prep_minutes),
    cook_minutes: numOrNull(r.cook_minutes),
    ingredients: ings
      .filter((i) => i && (strOrNull(i.raw_text) || strOrNull(i.name)))
      .map((i) => ({
        raw_text: cleanLabel(strOrNull(i.raw_text) || strOrNull(i.name) || ""),
        name: strOrNull(i.name) || strOrNull(i.raw_text) || "",
        amount: numOrNull(i.amount),
        unit: strOrNull(i.unit),
        step_number: intOrNull(i.step_number),
      })),
    steps: rawSteps
      .map((s) => {
        // Backwards compat: if somehow a plain string arrives, wrap it.
        if (typeof s === "string") return { text: s.trim(), duration_seconds: null, tag: null, depends_on: null };
        const obj = s as Record<string, unknown>;
        const text = typeof obj.text === "string" ? obj.text.trim() : "";
        return {
          text,
          duration_seconds: numOrNull(obj.duration_seconds),
          tag: tagOrNull(obj.tag),
          depends_on: depsOrNull(obj.depends_on),
        };
      })
      .filter((s) => s.text.length > 0),
  };
}

// Repair depends_on: Gemini sometimes emits 1-INDEXED step numbers (step at position N has
// depends_on containing N — a self-reference). When any step self-references, the whole recipe
// is treated as 1-indexed: subtract 1 from every value in every step's depends_on. Then cleanup:
// drop values < 0 or >= own position (forward/self refs), deduplicate. Already-correct recipes
// (no self-refs) pass through the cleanup only — their valid values survive unchanged.
type StepShape = { text: string; duration_seconds: number | null; tag: string | null; depends_on: number[] | null };
function repairDeps(steps: StepShape[]): StepShape[] {
  const is1Indexed = steps.some((s, i) => Array.isArray(s.depends_on) && s.depends_on.includes(i));
  return steps.map((s, i) => {
    if (!Array.isArray(s.depends_on) || s.depends_on.length === 0) return s;
    let fixed = is1Indexed ? s.depends_on.map((d) => d - 1) : [...s.depends_on];
    fixed = [...new Set(fixed.filter((d) => d >= 0 && d < i))];
    return { ...s, depends_on: fixed.length > 0 ? fixed : null };
  });
}

// Ingredient→step link: for each ingredient whose step_number is null, find the FIRST step whose
// text contains any of the ingredient's identity words (whole-word match, plural-tolerant).
// Identity words = the ingredient name split into 3+ char words, stripping prep/form/size modifiers.
// If no step matches → null (honest "general / used throughout", not a forced guess).
const ING_STRIP = new Set(
  ("ground dried fresh raw cooked roasted chopped sliced diced minced crushed whole powdered frozen " +
  "canned smoked hot cold sweet plain organic natural baby flaked toasted blanched peeled pitted " +
  "unsalted salted boneless skinless shredded grated crumbled melted softened finely roughly thinly " +
  "lightly deseeded trimmed halved large medium small thin thick extra green red white black yellow " +
  "clove cloves leaves leaf stalks stalk sprig sprigs wedges wedge pieces piece bunch bunches " +
  "rashers rasher optional about loosely packed cut into juiced zest").split(" "),
);
function ingIdentity(name: string): string[] {
  return name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !ING_STRIP.has(w));
}
type IngShape = { raw_text: string; name: string; amount: number | null; unit: string | null; step_number: number | null };
function assignStepPositions(ingredients: IngShape[], steps: StepShape[]): IngShape[] {
  const texts = steps.map((s) => s.text.toLowerCase());
  return ingredients.map((ing) => {
    if (ing.step_number != null) return ing; // already set — don't override
    const words = ingIdentity(ing.name);
    if (words.length === 0) return ing; // no identity words → leave general
    const pats = words.map((w) => new RegExp(`\\b${w}(?:e?s)?\\b`));
    const idx = texts.findIndex((t) => pats.some((p) => p.test(t)));
    return idx >= 0 ? { ...ing, step_number: idx } : ing;
  });
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

  const recipe = normalise(parsed as Record<string, unknown>);
  recipe.steps = repairDeps(recipe.steps);
  recipe.ingredients = assignStepPositions(recipe.ingredients, recipe.steps);
  return json({ ok: true, recipe, source_url: sourceUrl });
});
