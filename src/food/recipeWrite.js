// LifeOS — Food → recipe WRITES (F7). Multi-table writes for the cookbook: a recipe row + its
// ingredients + steps. Mirrors foodWrite.js; RLS scopes to the owner (user_id defaults to
// auth.uid()). The recipe row carries updated_at (stamped explicitly on edit — no trigger); the
// children have no updated_at, so EDIT rewrites them (delete all, re-insert the current set).
// Reuses the F6 cache-on-log so each matched ingredient FKs to a stable food_items row.

import { supabase } from "../supabaseClient.js";
import { cacheFoodOnLog, insertManualFood } from "./foodWrite.js";

// A food candidate → its food_items row (reuse the F6 cache/insert). Already-FK'd → minimal pass.
export async function ensureFoodItem(food) {
  if (food.food_item_id) return { id: food.food_item_id, name: food.name };
  return food.source === "manual" ? await insertManualFood(food) : await cacheFoodOnLog(food);
}

const recipeRow = (r) => ({
  title: r.title,
  servings: r.servings ?? null,
  prep_minutes: r.prep_minutes ?? null,
  cook_minutes: r.cook_minutes ?? null,
  source_url: r.source_url ?? null, // imported recipes keep their provenance link
});

// Insert the recipe's ingredient + step rows (positions from array order). user_id defaults to
// auth.uid() on the client. Throws on error.
async function writeChildren(recipeId, ingredients, steps) {
  if (ingredients?.length) {
    const rows = ingredients.map((ing, i) => ({
      recipe_id: recipeId,
      food_item_id: ing.food_item_id ?? null,
      raw_text: ing.raw_text ?? null,
      amount: ing.amount ?? null,
      unit: ing.unit ?? null,
      manual_macros: ing.manual_macros ?? null,
      no_macros: !!ing.no_macros,
      position: i,
    }));
    const { error } = await supabase.from("recipe_ingredients").insert(rows);
    if (error) throw new Error(error.message);
  }
  if (steps?.length) {
    const rows = steps.map((s, i) => ({ recipe_id: recipeId, position: i, text: s.text, timer_seconds: s.timer_seconds ?? null }));
    const { error } = await supabase.from("recipe_steps").insert(rows);
    if (error) throw new Error(error.message);
  }
}

// Create: insert the recipe, then its children. If the children fail, ROLL BACK the recipe (delete
// it) and rethrow — so a mid-save failure never leaves a half-written recipe. Returns the new id.
export async function createRecipe(recipe, ingredients, steps) {
  const { data, error } = await supabase.from("recipes").insert(recipeRow(recipe)).select("id").single();
  if (error) throw new Error(error.message);
  try {
    await writeChildren(data.id, ingredients, steps);
  } catch (e) {
    await supabase.from("recipes").delete().eq("id", data.id); // rollback the orphan
    throw e;
  }
  return data.id;
}

// Edit: update the recipe (stamp updated_at), then REWRITE its children (delete all, re-insert).
export async function updateRecipe(id, recipe, ingredients, steps) {
  const { error } = await supabase.from("recipes").update({ ...recipeRow(recipe), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
  await supabase.from("recipe_steps").delete().eq("recipe_id", id);
  await writeChildren(id, ingredients, steps);
}

// Delete the recipe; children CASCADE; food_log_entries.recipe_id is SET NULL (logged history +
// its macro snapshot survive). Throws on error.
export async function deleteRecipe(id) {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
