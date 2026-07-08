// LifeOS — Health → Gym: the pins read/write layer (the FIRST front-end write in
// this module). Mirrors the app's existing Supabase pattern (see archive.js):
// plain supabaseClient calls that return { error } for the caller to handle. We
// NEVER pass user_id — gym_pins has `default auth.uid()` and owner-RLS, exactly
// like tasks/categories inserts elsewhere in src/.

import { supabase } from "../../spine/data/supabaseClient";

// Load the owner's pinned lift ids. { ids: string[] } or { error }.
export async function loadPins() {
  const { data, error } = await supabase.from("gym_pins").select("exercise_template_id");
  if (error) return { error };
  return { ids: (data || []).map((r) => r.exercise_template_id) };
}

// Pin a lift. Upsert with ignoreDuplicates respects unique(user_id, template_id),
// so pinning twice can never duplicate. { error } | {}.
export async function pinLift(templateId) {
  const { error } = await supabase
    .from("gym_pins")
    .upsert({ exercise_template_id: templateId }, { onConflict: "user_id,exercise_template_id", ignoreDuplicates: true });
  return { error };
}

// Unpin a lift — delete the owner's row (RLS scopes to the owner). { error } | {}.
export async function unpinLift(templateId) {
  const { error } = await supabase.from("gym_pins").delete().eq("exercise_template_id", templateId);
  return { error };
}
