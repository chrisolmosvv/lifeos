// cookEventStore — fetch/write layer for the event-sourced cook tables (db/39).
// Reads: active session + its events. Writes: event inserts + session status transitions.
// Every action is an INSERT into cook_event — never an update-in-place on state.

import { supabase } from "./supabaseClient.js";

// ── Session reads ─────────────────────────────────────────────────────────────

// The active session for a recipe (owner-scoped), newest first — or null.
export async function fetchActiveSession(recipeId) {
  const { data, error } = await supabase
    .from("cook_session")
    .select("id,recipe_id,status,started_at,ended_at,created_at,updated_at")
    .eq("recipe_id", recipeId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

// Any active session across all recipes (for the resume banner + header marker).
export async function fetchAnyActiveSession() {
  const { data, error } = await supabase
    .from("cook_session")
    .select("id,recipe_id,status,started_at,created_at,recipes(title)")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

// A done session for a recipe (for the done-card after finishing).
export async function fetchDoneSession(recipeId) {
  const { data, error } = await supabase
    .from("cook_session")
    .select("id,recipe_id,status")
    .eq("recipe_id", recipeId)
    .eq("status", "done")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

// ── Event reads ───────────────────────────────────────────────────────────────

// All events for a session, ordered for replay.
export async function fetchSessionEvents(sessionId) {
  const { data, error } = await supabase
    .from("cook_event")
    .select("id,session_id,event_type,target_ref,payload,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Session writes ────────────────────────────────────────────────────────────

// Start a new cook session. Abandons any existing active session first.
export async function startSession(recipeId) {
  // One active cook at a time: abandon existing active sessions
  const { data: existing } = await supabase
    .from("cook_session")
    .select("id")
    .eq("status", "active");
  if (existing?.length) {
    const now = new Date().toISOString();
    for (const s of existing) {
      await supabase.from("cook_session").update({ status: "abandoned", ended_at: now, updated_at: now }).eq("id", s.id);
    }
  }

  const { data, error } = await supabase
    .from("cook_session")
    .insert({ recipe_id: recipeId })
    .select("id,recipe_id,status,started_at,created_at,updated_at")
    .single();
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event("lifeos:cook-session-change"));
  return data;
}

// Finish a cook session (insert 'finished' event + update session status).
export async function finishSession(sessionId) {
  const now = new Date().toISOString();
  await insertEvent(sessionId, "finished", null, null);
  const { error } = await supabase
    .from("cook_session")
    .update({ status: "done", ended_at: now, updated_at: now })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event("lifeos:cook-session-change"));
}

// Abandon a session (e.g. when starting a new cook).
export async function abandonSession(sessionId) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("cook_session")
    .update({ status: "abandoned", ended_at: now, updated_at: now })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event("lifeos:cook-session-change"));
}

// ── Event writes (each is an INSERT — never update-in-place) ──────────────────

export async function insertEvent(sessionId, eventType, targetRef, payload) {
  const { data, error } = await supabase
    .from("cook_event")
    .insert({
      session_id: sessionId,
      event_type: eventType,
      target_ref: targetRef ?? null,
      payload: payload ?? null,
    })
    .select("id,event_type,target_ref,payload,created_at")
    .single();
  if (error) throw new Error(error.message);
  // Stamp updated_at on the session so recency ordering works
  await supabase.from("cook_session").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
  return data;
}

// ── Convenience action wrappers ───────────────────────────────────────────────

export function markStep(sessionId, stepIndex, newStatus) {
  return insertEvent(sessionId, "step_marked", String(stepIndex), { status: newStatus });
}

export function tickIngredient(sessionId, ingredientRef) {
  return insertEvent(sessionId, "ingredient_ticked", String(ingredientRef), null);
}

export function useIngredient(sessionId, ingredientRef) {
  return insertEvent(sessionId, "ingredient_used", String(ingredientRef), null);
}

export function startTimer(sessionId, stepIndex, durationSeconds) {
  return insertEvent(sessionId, "timer_started", String(stepIndex), { duration_seconds: durationSeconds });
}

export function stopTimer(sessionId, stepIndex) {
  return insertEvent(sessionId, "timer_stopped", String(stepIndex), null);
}
