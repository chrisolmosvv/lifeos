// LifeOS — Food → WRITES (F6). The write layer for the logger — plain DB writes, no maths
// (snapshots are computed by entryMacros, the F3 getter, at the CALL site) and no React.
// Mirrors healthGoalsWrite.js. RLS scopes every write to the owner; food_log_entries.user_id
// defaults to auth.uid(). food_items writes set user_id explicitly (so the upsert conflict
// target user_id+source+source_ref matches). FETCH stays in foodLoad, CALC in foodCalc.

import { supabase } from "../supabaseClient.js";

const RETURN_COLS =
  "id,entry_date,meal_slot,food_item_id,recipe_id,amount,unit,kcal,protein,carbs,fat,fibre,sugar,sodium,entry_source,is_estimated,entry_label,is_alcohol,alcohol_units,created_at,updated_at";
const ITEM_COLS = "id,name,brand,source,source_ref,kcal,protein,carbs,fat,fibre,sugar,sodium,serving_grams,serving_label,is_favourite";
const PER100G = ["kcal", "protein", "carbs", "fat", "fibre", "sugar", "sodium"];

// The owner's id from the local session (no network) — used to fill user_id on food_items
// upserts so the unique (user_id, source, source_ref) conflict target resolves correctly.
async function ownerId() {
  const { data } = await supabase.auth.getSession();
  const id = data?.session?.user?.id;
  if (!id) throw new Error("not signed in");
  return id;
}

// ── log entries ──────────────────────────────────────────────────────────────
// Insert one logged entry; returns the inserted row (real id + timestamps) for reconcile.
export async function logEntry(row) {
  const { data, error } = await supabase.from("food_log_entries").insert(row).select(RETURN_COLS).single();
  if (error) throw new Error(error.message);
  return data;
}

// Update one entry (amount / meal_slot / food_item_id / a recomputed snapshot). updated_at is
// stamped explicitly (the table has no auto-update trigger), so a verify-by-updated_at is honest.
export async function updateEntry(id, patch) {
  const body = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("food_log_entries").update(body).eq("id", id).select(RETURN_COLS).single();
  if (error) throw new Error(error.message);
  return data;
}

// Delete one entry by id (the add/remove undo, and the row-remove). Throws on error.
export async function removeEntry(id) {
  const { error } = await supabase.from("food_log_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── food_items ───────────────────────────────────────────────────────────────
// Cache a searched OFF/USDA food into food_items ON LOG (the F2-deferred write). Upserts on the
// unique (user_id, source, source_ref) — on conflict it LINKS to the existing row (no duplicate)
// and returns it. A `food` is the F2 record shape { source, source_ref, name, brand, serving,
// per100g }. Returns the food_items row (id + name + brand + is_favourite).
export async function cacheFoodOnLog(food) {
  const row = { user_id: await ownerId(), name: food.name, brand: food.brand ?? null, source: food.source, source_ref: food.source_ref ?? null, serving_grams: food.serving?.grams ?? null, serving_label: food.serving?.label ?? null };
  for (const k of PER100G) row[k] = food.per100g?.[k] ?? null;
  const { data, error } = await supabase
    .from("food_items")
    .upsert(row, { onConflict: "user_id,source,source_ref" })
    .select(ITEM_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Insert a MANUAL food into food_items (source 'manual', source_ref null → never deduped).
// `food` carries name + per-100g numbers (already normalised) + optional serving_grams. Returns
// the inserted row. This gives every manual entry a food_item_id, so names always resolve.
export async function insertManualFood(food) {
  const row = { user_id: await ownerId(), name: food.name, brand: null, source: "manual", source_ref: null, serving_grams: food.serving?.grams ?? null, serving_label: food.serving?.label ?? null, is_favourite: false };
  for (const k of PER100G) row[k] = food.per100g?.[k] ?? null;
  const { data, error } = await supabase.from("food_items").insert(row).select(ITEM_COLS).single();
  if (error) throw new Error(error.message);
  return data;
}

// Toggle is_favourite on a food_items row. Returns the updated row.
export async function setFavourite(foodItemId, value) {
  const { data, error } = await supabase.from("food_items").update({ is_favourite: value, updated_at: new Date().toISOString() }).eq("id", foodItemId).select(ITEM_COLS).single();
  if (error) throw new Error(error.message);
  return data;
}
