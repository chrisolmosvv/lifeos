// LifeOS — Food → import review, pass ② method LOGIC (4b, PURE). The three totals (source claim ·
// our work · the real scheduled span) and a step delete that keeps the dependency graph valid.

import { cookSchedule } from "./cookSchedule.js";

// Delete the step at `index` and REPAIR every other step's depends_on: drop references to the removed
// step, and shift any reference above it down by one (deps are 0-based positions). Without this the
// plan pass (4c) would point at a step that no longer exists.
export function deleteStep(steps, index) {
  return (steps || [])
    .filter((_, i) => i !== index)
    .map((s) => ({
      ...s,
      depends_on: Array.isArray(s.depends_on)
        ? s.depends_on.filter((d) => d !== index).map((d) => (d > index ? d - 1 : d))
        : s.depends_on,
    }));
}

// The three totals, all in SECONDS:
//   • source = what the site claimed (prep_minutes + cook_minutes)
//   • work   = what our steps sum to (Σ timer_seconds)
//   • span   = how long the cook actually runs — the REAL one-pair-of-hands scheduled span.
export function methodTotals(steps, prepMinutes, cookMinutes) {
  const list = steps || [];
  const source = ((Number(prepMinutes) || 0) + (Number(cookMinutes) || 0)) * 60;
  const work = list.reduce((a, s) => a + (Number(s.timer_seconds) || 0), 0);
  const span = cookSchedule(list.map((s) => ({ durationSeconds: s.timer_seconds || 0, deps: s.depends_on, hold: s.hold_tolerance, tag: s.tag }))).finish;
  return { source, work, span };
}
