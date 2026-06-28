// LifeOS — Food → Log (F5): the thin FETCH-ONLY loader.
//
// Reads the owner's food_log_entries (by Amsterdam-day window) + the display names behind
// each entry's food_item_id / recipe_id. NO maths (that's foodCalc/recipeCalc), no writes.
// Mirrors healthLoad.js — RLS scopes every read to the owner, so these are plain selects.
// The nutrition GOALS reuse the health goals reader (fetchGoals + resolveGoals), imported
// where used; this file owns only the entries + the name lookups.

import { supabase } from "../supabaseClient.js";

// Supabase caps a select at 1000 rows; page through a wide range. Same guard as healthLoad.
async function fetchAll(table, columns, apply = (q) => q) {
  const PAGE = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await apply(
      supabase.from(table).select(columns).range(from, from + PAGE - 1),
    );
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

const ENTRY_COLS =
  "id,entry_date,meal_slot,food_item_id,recipe_id,amount,unit,kcal,protein,carbs,fat,fibre,sugar,sodium,entry_source,is_alcohol,alcohol_units,created_at";

// All log entries whose entry_date falls in [start, end], inclusive — oldest-first, and
// within a day by created_at so the ledger order is stable.
export function fetchEntries(start, end) {
  return fetchAll("food_log_entries", ENTRY_COLS, (q) =>
    q
      .gte("entry_date", start)
      .lte("entry_date", end)
      .order("entry_date", { ascending: true })
      .order("created_at", { ascending: true }),
  );
}

// Resolve the display names behind a set of entries: food_item_id → food_items.name (+brand),
// recipe_id → recipes.title. Returns two id→value maps for the ledger to look names up.
// (food_log_entries stores no name — a manual entry's name path is decided at F6.)
export async function fetchNames(itemIds, recipeIds) {
  const items = itemIds.length
    ? await fetchAll("food_items", "id,name,brand", (q) => q.in("id", itemIds))
    : [];
  const recipes = recipeIds.length
    ? await fetchAll("recipes", "id,title", (q) => q.in("id", recipeIds))
    : [];
  const itemById = {};
  for (const it of items) itemById[it.id] = { name: it.name, brand: it.brand };
  const recipeById = {};
  for (const r of recipes) recipeById[r.id] = r.title;
  return { itemById, recipeById };
}
