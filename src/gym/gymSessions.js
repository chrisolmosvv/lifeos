// LifeOS — Health → Gym: recent-sessions rows (PURE — calc layer).
//
// Builds display rows for the recent-sessions table: date (Amsterdam day), title,
// volume, time, and whether the session set a new PR. PR detection REUSES the same
// rule as the box score — `prWeight` (heaviest WORKING-set weight, warm-ups
// excluded) per lift: a chronological pass keeps the best weight seen per lift, and
// a session is flagged when any of its lifts beats (or first sets) that best. The
// table only DISPLAYS these rows; it never recomputes.

import { amsYMD } from "./gymDates.js";
import { workoutVolume, workoutMinutes, prWeight } from "./gymCalc.js";

const ms = (v) => {
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};
const liftKey = (ex) => ex.exercise_template_id || ex.title || "?";

// The working-set PRs set IN one session → [{ lift, weight }] (empty if none).
// Same rule as recentSessions: chronological best-per-lift (gymCalc.prWeight,
// warm-ups excluded); a lift counts if it beats — or first sets — its all-time best
// as of that session. Used by the session report's templated "new best" line.
export function sessionPRs(workouts, sessionId) {
  const chrono = (workouts || []).slice().sort((a, b) => ms(a.started_at) - ms(b.started_at));
  const best = {};
  for (const w of chrono) {
    const isTarget = w.id === sessionId;
    const found = [];
    for (const ex of w.exercises || []) {
      const top = prWeight(ex.sets);
      if (top == null) continue;
      const key = liftKey(ex);
      if (best[key] == null || top > best[key]) {
        if (isTarget) found.push({ lift: ex.title || key, weight: top });
        best[key] = top;
      }
    }
    if (isTarget) return found; // prior sessions already folded into `best`
  }
  return [];
}

// All session rows, most recent first. Each: { id, dateYMD, title, volume, minutes, isPR }.
export function recentSessions(workouts) {
  // Oldest-first pass to accumulate the all-time best working weight per lift, so a
  // session is a PR only relative to everything before it.
  const chrono = (workouts || []).slice().sort((a, b) => ms(a.started_at) - ms(b.started_at));
  const best = {};
  const prById = new Map();
  for (const w of chrono) {
    let isPR = false;
    for (const ex of w.exercises || []) {
      const top = prWeight(ex.sets); // heaviest working weight, warm-ups excluded; null if none
      if (top == null) continue;
      const key = liftKey(ex);
      if (best[key] == null || top > best[key]) {
        isPR = true;
        best[key] = top;
      }
    }
    prById.set(w.id, isPR);
  }

  // Newest-first for display.
  return (workouts || [])
    .slice()
    .sort((a, b) => ms(b.started_at) - ms(a.started_at))
    .map((w) => ({
      id: w.id,
      dateYMD: amsYMD(w.started_at),
      title: w.title,
      volume: workoutVolume(w),
      minutes: workoutMinutes(w),
      isPR: prById.get(w.id) || false,
    }));
}
