// LifeOS — Health → Gym (G7): the thin data loader.
//
// FETCH ONLY — no maths. It reads the owner's raw Hevy cache from Supabase
// (gym_workouts / gym_exercises / gym_sets / gym_exercise_templates) and hands
// plain rows to gymCalc.js. Keeping fetch and maths apart means the calc stays
// a pure, testable unit and this file stays a dumb pipe.
//
// RLS already scopes every table to the owner (auth.uid() = user_id), so these
// are plain selects — no user filter needed in the query.

import { supabase } from "../supabaseClient.js";

// Supabase caps a select at 1000 rows; sets can exceed that, so page by range.
async function fetchAll(table, columns) {
  const PAGE = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// Load everything the calc needs. Returns { workouts, exercises, sets, templatesById }.
export async function loadGymData() {
  const [workouts, exercises, sets, templates] = await Promise.all([
    fetchAll("gym_workouts", "id,hevy_id,title,started_at,ended_at"),
    fetchAll("gym_exercises", "id,workout_id,title,position,exercise_template_id"),
    fetchAll("gym_sets", "id,exercise_id,position,weight_kg,reps,set_type,rpe,distance_m,duration_seconds"),
    fetchAll("gym_exercise_templates", "template_id,title,primary_muscle_group,secondary_muscle_groups,type"),
  ]);
  const templatesById = {};
  for (const t of templates) templatesById[t.template_id] = t;
  return { workouts, exercises, sets, templatesById };
}
