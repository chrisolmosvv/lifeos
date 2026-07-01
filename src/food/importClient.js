// LifeOS — Food → recipe import client (F8; auto-match rewritten V2 P6). Invokes the recipe-import
// Edge Function (paste/URL → Gemini → house JSON), then auto-matches each parsed ingredient against
// the food DB (reusing food-search) — taking the P1 RERANKER's top pick (results[top3[0]]) when
// present, caching it on link, and resolving the parsed amount to grams via the portions table.
// Returns the editor draft + itemsById, or a DISTINCT error (fetch_fail / parse_fail) for the import
// screen. Best-effort + parallel: a slow/failed search, or reranker off/quota (no top3), just leaves
// that ingredient FLAGGED (no food_item_id) for the editor rescue — never fatal; import always completes.

import { supabase } from "../supabaseClient.js";
import { searchFoods } from "./foodLoad.js";
import { ensureFoodItem } from "./recipeWrite.js";
import { resolvePortion } from "./portions.js";

const CLIENT_TIMEOUT_MS = 25000; // backstop so the UI never hangs (function self-bounds at ~8s fetch + Gemini)

export async function importRecipe({ text, url }) {
  let data;
  try {
    // Never-freeze guard: race the invoke against a client-side timeout so "Reading the recipe…"
    // can't hang forever even if the function somehow doesn't respond. The function's own fetch is
    // bounded at 8s + Gemini, so a healthy call finishes well inside this; only a true hang trips it.
    const res = await Promise.race([
      supabase.functions.invoke("recipe-import", { body: text ? { text } : { url } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("client_timeout")), CLIENT_TIMEOUT_MS)),
    ]);
    // A transport/HTTP error (can't reach the function, non-2xx, relay) is DISTINCT from the
    // function's own fetch_fail/parse_fail — never let a connection problem read as "not a recipe".
    if (res.error) return { ok: false, error: "unreachable" };
    data = res.data;
  } catch {
    return { ok: false, error: "unreachable" }; // invoke threw OR the client guard fired — no freeze
  }
  if (!data || data.ok !== true) {
    return { ok: false, error: data?.error === "fetch_fail" ? "fetch_fail" : "parse_fail" };
  }

  const r = data.recipe;
  const itemsById = {};
  const ingredients = await Promise.all((r.ingredients || []).map((ing) => matchOne(ing, itemsById)));

  return {
    ok: true,
    draft: {
      title: r.title || "",
      servings: r.servings ?? null,
      prep_minutes: r.prep_minutes ?? null,
      cook_minutes: r.cook_minutes ?? null,
      source_url: data.source_url ?? null,
      ingredients,
      steps: (r.steps || []).map((t) => ({ text: t })),
    },
    itemsById,
  };
}

// One parsed ingredient → a draft ingredient (V2 P6, auto-match Option A). AUTO-MATCH = the P1
// RERANKER's top pick: search the DB, take results[top3[0]] when the reranker returned a pick, else
// FLAG it (food_item_id null, fixable via the editor rescue). Supersedes recipeMatch's comma rule; adds
// NO new AI surface — the reranker is P1's existing call. DETERMINISTIC FALLBACK: reranker off/quota →
// top3 null → flagged → import STILL COMPLETES (every ingredient lands, some flagged; nothing hard-stops).
// `parsedName` rides along (transient) so the editor can pre-fill the finder when re-matching.
async function matchOne(ing, itemsById) {
  const base = { parsedName: ing.name || ing.raw_text || "", raw_text: ing.raw_text || ing.name || "", no_macros: false };
  try {
    const res = await searchFoods(ing.name || ing.raw_text || "");
    const results = res.results || [];
    const hit = Array.isArray(res.top3) && res.top3.length ? results[res.top3[0]] : null;
    if (!hit) return { ...base, food_item_id: null, amount: null, unit: null }; // flagged — no confident rerank
    const item = await ensureFoodItem(hit);
    itemsById[item.id] = { ...hit, food_item_id: item.id };
    const grams = resolvePortion(ing.name, ing.amount, ing.unit);
    return { ...base, food_item_id: item.id, amount: grams, unit: grams != null ? "g" : null };
  } catch {
    return { ...base, food_item_id: null, amount: null, unit: null };
  }
}
