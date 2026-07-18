// LifeOS — Health → Gym V2 (Piece 3): routine classification + per-lift table (PURE).
//
// gym_workouts.title is free text from Hevy — there is NO stored routine field. The owner's
// call (overriding the original 3-tab plan): classify by a simple case-insensitive PREFIX on
// the title — starts with "push"/"pull"/"legs" → that routine; EVERYTHING else → "Other".
// This is deliberate: "Harriot Legs" (doesn't START with legs) and "Chest and Triceps 2" go
// to Other, NOT keyword-guessed into Legs/Push. Verified live: 37 Push / 35 Pull / 27 Legs /
// 8 Other across all 107 real sessions.
//
// The per-lift DELTA is window-scoped and routine-scoped: current best = heaviest WORKING
// weight IN the selected window; delta = that minus the heaviest working weight BEFORE the
// window (same routine). Bodyweight/duration lifts (no weight) show no best/delta, never a
// fabricated 0. All cheap client-side from the already-loaded workouts.

import { amsYMD } from "./gymDates.js";
import { prWeight } from "./gymCalc.js";

export const ROUTINES = [
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "other", label: "Other" },
];

// The prefix rule (case-insensitive, trimmed). Anything not starting push/pull/legs → other.
export function classifyRoutine(title) {
  const t = (title || "").trim().toLowerCase();
  if (t.startsWith("push")) return "push";
  if (t.startsWith("pull")) return "pull";
  if (t.startsWith("legs")) return "legs";
  return "other";
}

// The workouts belonging to one routine bucket.
export function routineWorkouts(workouts, routine) {
  return (workouts || []).filter((w) => classifyRoutine(w.title) === routine);
}

const liftKey = (ex) => ex.exercise_template_id || ex.title || "?";

// Per-lift table for a set of (routine-filtered) workouts over the window [start, end]:
//   [{ key, name, muscle, best, delta, isNew, bodyweight }] for each lift trained IN-window,
//   best desc (bodyweight/null last), then name.
//   best   = heaviest working weight in-window (null for bodyweight/duration → shown "—")
//   delta  = best − (heaviest working weight BEFORE start, same routine); null if no prior
//   isNew  = has an in-window weight but no prior weighted set (no baseline to diff)
export function liftTable(workouts, { start, end }) {
  const inWin = new Map(); // key → { key, name, muscle, best }
  const before = {}; // key → heaviest working weight strictly before `start`
  for (const w of workouts || []) {
    const ymd = amsYMD(w.started_at);
    if (!ymd) continue;
    const isIn = ymd >= start && ymd <= end;
    const isBefore = ymd < start;
    if (!isIn && !isBefore) continue; // future of the window — ignore
    for (const ex of w.exercises || []) {
      const key = liftKey(ex);
      const pr = prWeight(ex.sets); // heaviest working weight; null for bodyweight/duration
      if (isIn) {
        let rec = inWin.get(key);
        if (!rec) { rec = { key, name: ex.title || key, muscle: ex.muscle || null, best: null }; inWin.set(key, rec); }
        if (pr != null && (rec.best == null || pr > rec.best)) rec.best = pr;
      } else if (pr != null && (before[key] == null || pr > before[key])) {
        before[key] = pr;
      }
    }
  }
  const rows = [...inWin.values()].map((r) => {
    const prior = before[r.key] ?? null;
    let delta = null, isNew = false;
    if (r.best != null) {
      if (prior != null) delta = r.best - prior;
      else isNew = true; // trained with weight this window, no prior baseline
    }
    return { ...r, bodyweight: r.best == null, delta, isNew };
  });
  rows.sort((a, b) => {
    if (a.best == null && b.best == null) return a.name.localeCompare(b.name);
    if (a.best == null) return 1;
    if (b.best == null) return -1;
    return b.best - a.best || a.name.localeCompare(b.name);
  });
  return rows;
}
