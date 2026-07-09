// LifeOS — Health → Gym: per-lift records (PURE — calc layer).
//
// For every lift trained, its heaviest-ever WORKING set (PR = heaviest weight,
// warm-ups excluded — the locked rule) with the Amsterdam date it was hit, its best
// est-1RM, how many sessions it appears in, and a per-session top-set "climb" series
// for the chart. Reuses gymCalc (prWeight/topSet/best1RM) + gymDates; no recompute,
// no second date path. Display layers only read this.

import { amsYMD } from "../../spine/logic/gymDates";
import { prWeight, topSet, best1RM } from "../../spine/logic/gymCalc";

const liftKey = (ex) => ex.exercise_template_id || ex.title || "?";

// → [{ key, name, muscle, prWeight, prReps, prDate, best1RM, sessions, climb:[{ymd, top, e1rm}] }]
export function liftRecords(workouts) {
  const map = new Map();
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    for (const ex of w.exercises || []) {
      const key = liftKey(ex);
      let rec = map.get(key);
      if (!rec) {
        rec = { key, name: ex.title || key, muscle: ex.muscle || null, prWeight: null, prReps: null, prDate: null, best1RM: null, sessions: 0, climb: [] };
        map.set(key, rec);
      }
      rec.sessions += 1;
      if (ex.muscle && !rec.muscle) rec.muscle = ex.muscle;

      const top = topSet(ex.sets);   // heaviest working set {weight_kg,reps} | null
      const pr = prWeight(ex.sets);  // heaviest working weight | null
      const e1 = best1RM(ex.sets);   // best est-1RM | null

      if (e1 != null && (rec.best1RM == null || e1 > rec.best1RM)) rec.best1RM = e1;
      if (pr != null && (rec.prWeight == null || pr > rec.prWeight)) {
        rec.prWeight = pr;
        rec.prReps = top ? top.reps : null;
        rec.prDate = ymd;
      }
      if (ymd && (top || e1 != null)) {
        rec.climb.push({ ymd, top: top ? top.weight_kg : null, e1rm: e1 });
      }
    }
  }
  for (const rec of map.values()) {
    rec.climb.sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : 0));
  }
  return [...map.values()];
}
