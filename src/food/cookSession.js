// LifeOS — Food → cook_session FETCH/WRITE (V2 P7). Persists the resume-a-cook session STATE only
// (struck steps, ticked ingredients, timer END-timestamps, board states, status/dismissed) — NOT the
// schedule (that's compute-on-read). Owner-RLS scopes every row. Mirrors foodWrite.js.

import { supabase } from "../supabaseClient.js";

const COLS = "id,recipe_id,struck_steps,ticked_ingredients,timer_ends,board_states,status,dismissed";

// The active, non-dismissed session for a recipe (owner-scoped), newest first — or null.
export async function fetchActiveSession(recipeId) {
  const { data, error } = await supabase
    .from("cook_session")
    .select(COLS)
    .eq("recipe_id", recipeId)
    .eq("status", "active")
    .eq("dismissed", false)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return (data && data[0]) || null;
}

// The DONE, non-dismissed session for a recipe (session-surfacing C — the done-card read) — or null.
export async function fetchDoneSession(recipeId) {
  const { data, error } = await supabase
    .from("cook_session")
    .select("id,recipe_id,status,dismissed")
    .eq("recipe_id", recipeId)
    .eq("status", "done")
    .eq("dismissed", false)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return (data && data[0]) || null;
}

// The single active, non-dismissed session across ALL recipes (session-surfacing B — the resume banner
// read), with the recipe title embedded via the recipe_id FK. Newest first — or null.
export async function fetchAnyActiveSession() {
  const { data, error } = await supabase
    .from("cook_session")
    .select("id,recipe_id,created_at,recipes(title)")
    .eq("status", "active")
    .eq("dismissed", false)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return (data && data[0]) || null;
}

// Upsert the session: update by id, else insert (user_id defaults to auth.uid()). Stamps updated_at
// explicitly (no trigger). Returns the row id so the caller keeps writing to the same session.
export async function saveSession(id, patch) {
  const body = { ...patch, updated_at: new Date().toISOString() };
  if (id) {
    const { data, error } = await supabase.from("cook_session").update(body).eq("id", id).select("id").single();
    if (error) throw new Error(error.message);
    return data.id;
  }
  const { data, error } = await supabase.from("cook_session").insert(body).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}
