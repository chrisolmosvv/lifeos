// LifeOS — Health → Goals (S9): the WRITE path (append-only).
//
// The first in-app write in Track S. health_goals is an append-only event log:
//   setGoal   — appends a NEW active row (set OR change; the old row stays as history).
//   clearGoal — appends an active=false "cleared marker" row (the reader treats the
//               newest row as the verdict, so a cleared marker = no active goal).
// We NEVER update or delete — history is preserved and the reader (resolveGoals)
// decides from the newest row. user_id + set_at + created_at default in the DB
// (auth.uid() / now()); RLS scopes every write to the owner.
//
// `direction` is FROZEN by the caller (computed from the current reading vs the
// target AT SET TIME) so later passing the target can't flip the progress bar.

import { supabase } from "../supabaseClient.js";

export async function setGoal({ goal_type, target_value, unit, direction }) {
  const { error } = await supabase
    .from("health_goals")
    .insert({ goal_type, target_value, unit, direction, active: true });
  if (error) throw new Error(error.message);
}

export async function clearGoal(goal_type) {
  const { error } = await supabase
    .from("health_goals")
    .insert({ goal_type, target_value: null, unit: null, direction: null, active: false });
  if (error) throw new Error(error.message);
}
