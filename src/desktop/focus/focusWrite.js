// LifeOS — Focus module P2: the WRITE path. Every focus_sessions mutation lives
// here so the components never touch Supabase directly (same split as food/gym).
// RLS scopes every write to the owner (user_id defaults to auth.uid()); updated_at
// is stamped by the APP on every edit (house pattern — no DB trigger, exactly like
// cook_session / recipes). See focus-module-spec.md §1a / §5.

import { supabase } from "../../spine/data/supabaseClient.js";

const COLUMNS =
  "id,started_at,ended_at,mode,target_seconds,break_seconds,task_id,task_title_snapshot,category_id,category_snapshot,segments,source,rating,note,archived_at,created_at,updated_at";

// Fire-and-forget signal that focus data changed, so anything showing derived focus
// (the per-task row tags, the overview) can refresh — even across pillars. Harmless
// where window is absent (SSR/tests).
function announceChange() {
  try { window.dispatchEvent(new CustomEvent("lifeos:focus-changed")); } catch { /* no window */ }
}

// Start a session → a RUNNING row (ended_at NULL, empty segments). Returns the row
// (we need its id to finalise/discard). `fields` carries started_at + mode + the
// target/break lengths + the subject snapshots.
export async function startSession(fields) {
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({ ...fields, source: fields.source || "timer", segments: [] })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  announceChange();
  return data;
}

// Manual back-fill (spec §11) — a COMPLETE past session (source 'manual', ended_at
// set) with a snapshotted subject, so it places on the dial like any other. `fields`
// carries started_at + ended_at + the subject snapshots + optional rating/note.
export async function addManualSession(fields) {
  const { error } = await supabase
    .from("focus_sessions")
    .insert({ ...fields, source: "manual", segments: [] });
  if (error) throw new Error(error.message);
  announceChange();
}

// Stop → finalise the running row: fill ended_at + the real segments + rating/note.
// (Duration is never stored — ended_at + segments are the raw record.)
export async function finalizeSession(id, patch) {
  const { error } = await supabase
    .from("focus_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  announceChange();
}

// Discard an UNSAVED running row — a hard delete (a mis-start never reaches the
// archive). Also the "discard the stale row" path of the load-time guard.
export async function discardSession(id) {
  const { error } = await supabase.from("focus_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  announceChange();
}

// Delete a SAVED session = soft-archive (reads filter archived_at IS NULL); paired
// with unarchiveSession for the undo toast. Spine untouched.
export async function archiveSession(id) {
  const stamp = new Date().toISOString();
  const { error } = await supabase
    .from("focus_sessions")
    .update({ archived_at: stamp, updated_at: stamp })
    .eq("id", id);
  if (error) throw new Error(error.message);
  announceChange();
}
export async function unarchiveSession(id) {
  const { error } = await supabase
    .from("focus_sessions")
    .update({ archived_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  announceChange();
}

// The save-card "mark this task done?" toggle — reuses the EXISTING complete path
// (status → 'done'; the tasks trigger stamps completed_at). NO new spine writer.
export async function markTaskDone(taskId) {
  const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
  if (error) throw new Error(error.message);
}
