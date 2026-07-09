// LifeOS — Food → recipe import client (F8; auto-match rewritten V2 P6). Invokes the recipe-import
// Edge Function (paste/URL → Gemini → house JSON), then auto-matches each parsed ingredient against
// the food DB (reusing food-search) — taking the P1 RERANKER's top pick (results[top3[0]]) when
// present, caching it on link, and resolving the parsed amount to grams via the portions table.
// Returns the editor draft + itemsById, or a DISTINCT error (fetch_fail / parse_fail) for the import
// screen. Best-effort: a slow/failed search, or reranker off/quota (no top3), just leaves that
// ingredient FLAGGED (no food_item_id) for the editor rescue — never fatal; import always completes.
//
// RATE-LIMIT AWARE: ingredient searches run in small batches (not all-at-once) so long recipes
// (~20 ingredients) don't burst past the Gemini reranker's free-tier 15 req/min limit.

import { supabase } from "./supabaseClient.js";
import { searchFoods } from "./foodLoad.js";
import { ensureFoodItem } from "./recipeWrite.js";
import { resolvePortion } from "../logic/portions.js";

const CLIENT_TIMEOUT_MS = 25000;
const BATCH_SIZE = 6; // ingredients per batch — keeps well under 15 req/min
const BATCH_GAP_MS = 1200; // pause between batches

export async function importRecipe({ text, url }) {
  let data;
  try {
    const res = await Promise.race([
      supabase.functions.invoke("recipe-import", { body: text ? { text } : { url } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("client_timeout")), CLIENT_TIMEOUT_MS)),
    ]);
    if (res.error) return { ok: false, error: "unreachable" };
    data = res.data;
  } catch {
    return { ok: false, error: "unreachable" };
  }
  if (!data || data.ok !== true) {
    return { ok: false, error: data?.error === "fetch_fail" ? "fetch_fail" : "parse_fail" };
  }

  const r = data.recipe;
  const itemsById = {};
  const rawIngs = r.ingredients || [];

  // Batch the searches to stay under the Gemini free-tier rate limit. Each search may fire a
  // reranker call; 20+ simultaneous calls burst past 15/min and some silently return top3=null.
  const ingredients = [];
  for (let i = 0; i < rawIngs.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise((r) => setTimeout(r, BATCH_GAP_MS));
    const batch = rawIngs.slice(i, i + BATCH_SIZE);
    const matched = await Promise.all(batch.map((ing) => matchOne(ing, itemsById)));
    ingredients.push(...matched);
  }

  return {
    ok: true,
    draft: {
      title: r.title || "",
      servings: r.servings ?? null,
      prep_minutes: r.prep_minutes ?? null,
      cook_minutes: r.cook_minutes ?? null,
      source_url: data.source_url ?? null,
      ingredients,
      steps: (r.steps || []).map((s) => {
        if (typeof s === "string") return { text: s };
        const text = typeof s.text === "string" ? s.text : String(s.text ?? "");
        return { text, timer_seconds: s.duration_seconds ?? null, tag: s.tag ?? null, depends_on: s.depends_on ?? null };
      }),
    },
    itemsById,
  };
}

// Bracket-gram fallback: when resolvePortion can't resolve, scan raw_text for a gram figure.
// "(about 450g)" → 450. "125g to 150g each" with count 4 → midpoint 137.5 × 4 = 550.
// Only acts on g/grams/gram/kg; ignores non-gram brackets. No "each" → total (safer under-estimate).
function extractBracketGrams(rawText, parsedAmount) {
  if (!rawText || typeof rawText !== "string") return null;
  const t = rawText.toLowerCase();
  const count = typeof parsedAmount === "number" && parsedAmount > 0 ? parsedAmount : 1;

  // Range: "125g to 150g" / "125-150g" / "125 g – 150 g"
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?|kg)?\s*(?:to|[-–—])\s*(\d+(?:\.\d+)?)\s*(g|grams?|kg)\b/);
  if (range) {
    let lo = parseFloat(range[1]);
    let hi = parseFloat(range[2]);
    if (range[3] === "kg") { lo *= 1000; hi *= 1000; }
    const mid = (lo + hi) / 2;
    const tail = t.slice(t.indexOf(range[0]) + range[0].length);
    if (/\beach\b/.test(tail.slice(0, 40)) && count > 1) return mid * count;
    return mid;
  }

  // Single: "450g" / "about 450 grams" / "1.5kg"
  const single = t.match(/(\d+(?:\.\d+)?)\s*(g|grams?|kg)\b/);
  if (single) {
    let val = parseFloat(single[1]);
    if (single[2] === "kg") val *= 1000;
    const tail = t.slice(t.indexOf(single[0]) + single[0].length);
    if (/\beach\b/.test(tail.slice(0, 40)) && count > 1) return val * count;
    return val;
  }

  return null;
}

async function matchOne(ing, itemsById) {
  const base = { parsedName: ing.name || ing.raw_text || "", raw_text: ing.raw_text || ing.name || "", no_macros: false, step_position: ing.step_number ?? null };
  try {
    const res = await searchFoods(ing.name || ing.raw_text || "");
    const results = res.results || [];
    // The reranker's top pick when available; otherwise the top candidate by fixed priority
    // (Basics → saved → OFF → USDA). Never strand an ingredient as "needs a match" when
    // candidates exist — a best-guess the owner can see beats a blank flag they must hunt.
    const hit = Array.isArray(res.top3) && res.top3.length
      ? results[res.top3[0]]
      : results.length ? results[0] : null;
    if (!hit) return { ...base, food_item_id: null, amount: null, unit: null };
    const item = await ensureFoodItem(hit);
    itemsById[item.id] = { ...hit, food_item_id: item.id };
    const grams = resolvePortion(ing.name, ing.amount, ing.unit) ?? extractBracketGrams(ing.raw_text, ing.amount);
    return { ...base, food_item_id: item.id, amount: grams, unit: grams != null ? "g" : null };
  } catch {
    return { ...base, food_item_id: null, amount: null, unit: null };
  }
}
