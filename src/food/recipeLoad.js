// LifeOS — Food → recipe FETCH (F7). Reads recipes + their ingredients/steps + the food_items
// behind the ingredient FKs (for recipeMacros). No maths, no writes. Mirrors foodLoad.js.

import { supabase } from "../supabaseClient.js";
import { itemToFood } from "./foodShape.js";

async function fetchAll(table, columns, apply = (q) => q) {
  const PAGE = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await apply(supabase.from(table).select(columns).range(from, from + PAGE - 1));
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// The recipe library (newest first) — title/servings/times for the cards. The per-serving macros
// for a card need its ingredients; the card fetches those lazily (or the grid resolves on open).
export function fetchRecipeList() {
  return fetchAll("recipes", "id,title,servings,prep_minutes,cook_minutes,is_favourite,created_at,updated_at", (q) =>
    q.order("created_at", { ascending: false }),
  );
}

// The whole cookbook for the library grid: recipes + their ingredients grouped by recipe + the
// food_items behind the ingredient FKs (candidate shape), so each card's kcal/serving computes on
// read via recipeMacros. One pass over the children + items (cheap for a personal cookbook).
export async function fetchCookbook() {
  const recipes = await fetchRecipeList();
  if (!recipes.length) return { recipes, ingredientsByRecipe: {}, itemsById: {}, stepCountByRecipe: {}, cookEntries: [] };
  const ids = recipes.map((r) => r.id);
  const [ings, steps, cookEntries] = await Promise.all([
    fetchAll("recipe_ingredients", "recipe_id,food_item_id,amount,unit,manual_macros,no_macros,position", (q) => q.in("recipe_id", ids).order("position", { ascending: true })),
    // step PRESENCE per recipe — recipeKind needs it to tell a meal (no steps) from a recipe (V2 P3).
    fetchAll("recipe_steps", "recipe_id", (q) => q.in("recipe_id", ids)),
    // the recipe's cook entries — lastCookedFor's compute-on-read source for the "Cooked" sort (V2 P3).
    fetchAll("food_log_entries", "recipe_id,entry_source,entry_date", (q) => q.eq("entry_source", "recipe_cook").in("recipe_id", ids)),
  ]);
  const itemIds = [...new Set(ings.filter((i) => i.food_item_id).map((i) => i.food_item_id))];
  const rows = itemIds.length
    ? await fetchAll("food_items", "id,name,brand,source,source_ref,kcal,protein,carbs,fat,fibre,sugar,sodium,serving_grams,serving_label", (q) => q.in("id", itemIds))
    : [];
  const itemsById = {};
  for (const r of rows) itemsById[r.id] = itemToFood(r);
  const ingredientsByRecipe = {};
  const stepCountByRecipe = {};
  for (const r of recipes) { ingredientsByRecipe[r.id] = []; stepCountByRecipe[r.id] = 0; }
  for (const ing of ings) ingredientsByRecipe[ing.recipe_id].push(ing);
  for (const s of steps) stepCountByRecipe[s.recipe_id] = (stepCountByRecipe[s.recipe_id] || 0) + 1;
  return { recipes, ingredientsByRecipe, itemsById, stepCountByRecipe, cookEntries };
}

// One recipe with its ingredients + steps (by position) + the food_items rows behind the
// ingredient FKs, mapped to the candidate shape recipeMacros/entryMacros expect (per100g nested).
// → { recipe, ingredients, steps, itemsById }.
export async function fetchRecipe(id) {
  const [recipeRes, ingredients, steps, cookEntries] = await Promise.all([
    supabase.from("recipes").select("id,title,servings,prep_minutes,cook_minutes,source_url,is_favourite,created_at,updated_at").eq("id", id).single(),
    fetchAll("recipe_ingredients", "id,food_item_id,raw_text,amount,unit,manual_macros,no_macros,position", (q) => q.eq("recipe_id", id).order("position", { ascending: true })),
    fetchAll("recipe_steps", "id,position,text,timer_seconds", (q) => q.eq("recipe_id", id).order("position", { ascending: true })),
    // this recipe's cook entries — lastCookedFor's compute-on-read source for the "last cooked" line (V2 P3).
    fetchAll("food_log_entries", "recipe_id,entry_source,entry_date", (q) => q.eq("recipe_id", id).eq("entry_source", "recipe_cook")),
  ]);
  if (recipeRes.error) throw new Error(recipeRes.error.message);

  const itemIds = [...new Set(ingredients.filter((i) => i.food_item_id).map((i) => i.food_item_id))];
  const rows = itemIds.length
    ? await fetchAll("food_items", "id,name,brand,source,source_ref,kcal,protein,carbs,fat,fibre,sugar,sodium,serving_grams,serving_label", (q) => q.in("id", itemIds))
    : [];
  const itemsById = {};
  for (const r of rows) itemsById[r.id] = itemToFood(r);
  return { recipe: recipeRes.data, ingredients, steps, itemsById, cookEntries };
}
