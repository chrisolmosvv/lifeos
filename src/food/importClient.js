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

import { supabase } from "../supabaseClient.js";
import { searchFoods } from "./foodLoad.js";
import { ensureFoodItem } from "./recipeWrite.js";
import { resolvePortion } from "./portions.js";

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

async function matchOne(ing, itemsById) {
  const base = { parsedName: ing.name || ing.raw_text || "", raw_text: ing.raw_text || ing.name || "", no_macros: false, step_position: ing.step_number ?? null };
  try {
    const res = await searchFoods(ing.name || ing.raw_text || "");
    const results = res.results || [];
    // The reranker's top pick when available; OR the confident Basics staple when the search
    // suppressed the reranker (dbSuppressed = true → results[0] IS the staple). Without this
    // fallback, common foods like butter/onion/egg get flagged despite having a perfect match.
    const hit = Array.isArray(res.top3) && res.top3.length
      ? results[res.top3[0]]
      : res.dbSuppressed && results.length ? results[0] : null;
    if (!hit) return { ...base, food_item_id: null, amount: null, unit: null };
    const item = await ensureFoodItem(hit);
    itemsById[item.id] = { ...hit, food_item_id: item.id };
    const grams = resolvePortion(ing.name, ing.amount, ing.unit);
    return { ...base, food_item_id: item.id, amount: grams, unit: grams != null ? "g" : null };
  } catch {
    return { ...base, food_item_id: null, amount: null, unit: null };
  }
}
