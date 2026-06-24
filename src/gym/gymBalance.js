// LifeOS — Health → Gym: body-part balance (PURE — calc layer).
//
// Groups the last-7-Amsterdam-days training by PRIMARY muscle group. The muscle
// comes from the G6 dictionary, already joined onto each exercise as `ex.muscle`
// by buildWorkouts (gym_exercises.exercise_template_id → primary_muscle_group).
//
// MEASURE = working-set COUNT (warm-ups excluded, matching PR/1RM). Why not volume:
// volume is dominated by heavy compound lifts and is 0 for bodyweight/duration
// moves, so set-count is the truer "how much attention each muscle got" and never
// drops a reps-only/duration exercise. Volume is summed too (for the hover/ later),
// but the ranking is by sets. The window is the SAME lastNDaysSet the band uses.

import { lastNDaysSet, amsYMD } from "./gymDates.js";
import { isWorking, setVolume } from "./gymCalc.js";

export function muscleBalance(workouts, { days = 7, now = Date.now() } = {}) {
  const window = lastNDaysSet(days, now);
  const groups = {}; // muscle -> { sets, volume }
  let totalSets = 0;

  for (const w of workouts || []) {
    if (!window.has(amsYMD(w.started_at))) continue;
    for (const ex of w.exercises || []) {
      const muscle = ex.muscle || "other"; // orphan template → "other" (G6 orphans were 0)
      for (const s of ex.sets || []) {
        if (!isWorking(s)) continue; // working sets only
        const g = (groups[muscle] ||= { sets: 0, volume: 0 });
        g.sets += 1;
        g.volume += setVolume(s);
        totalSets += 1;
      }
    }
  }

  const ranked = Object.entries(groups)
    .map(([muscle, g]) => ({ muscle, sets: g.sets, volume: g.volume }))
    .sort((a, b) => b.sets - a.sets || b.volume - a.volume);

  return { ranked, totalSets };
}
