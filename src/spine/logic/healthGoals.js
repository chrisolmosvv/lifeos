// LifeOS — Health → Sleep & Body (S5): GOALS (PURE, generic).
//
// Goals are GENERIC: for ANY metric_type that has an active goal row we compute a
// direction-aware "vs goal" result. There is NO hardcoded list of metrics — a new
// goal added later (e.g. a body_fat target) lights up automatically. No active
// goal for a metric → no vs-goal result (callers omit the field, never fake it).
//
// direction meaning:
//   'down'    — lower is better (weight, body_fat): met when value <= target.
//   'up'      — higher is better (lean_mass, sleep_duration): met when value >= target.
//   'by_time' — a target CLOCK time (bedtime). target_value + value are both
//               MINUTES AFTER MIDNIGHT, Amsterdam local (locked standard:
//               23:30 = 1410). Met when at/before target. We anchor both to
//               minutes-after-noon so an evening target (23:30) and an after-
//               midnight bedtime (00:30) order correctly instead of wrapping.

function finite(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Minutes-after-midnight → minutes-after-noon (noon = 0). Makes the evening and
// the small hours contiguous and correctly ordered for bedtime comparisons.
function anchorNoon(min) {
  return ((min + 720) % 1440 + 1440) % 1440;
}

// Append-only goal log: the SINGLE NEWEST row per goal_type decides (S9). Setting
// or changing a goal appends a new row; CLEARING appends a "cleared marker" row with
// active=false. So the newest row per type is the verdict:
//   • newest row active=true  → that's the live goal.
//   • newest row active=false → the goal was cleared → NO active goal (we do NOT fall
//     back to an older row; a cleared goal stays cleared until re-set).
// fetchGoals() returns rows newest-first (set_at desc), so the FIRST row we see per
// type is the newest — we decide on it and ignore the rest of that type's history.
//
// NOTE: for all-active data (every goal only ever set, never cleared) this is
// IDENTICAL to the old "first active row wins" reader — the newest row IS active, so
// the same goal resolves. The cleared-marker path is new behaviour only S9 creates.
// → Map<goal_type, { target_value, unit, direction }>.
export function resolveGoals(goalRows) {
  const live = new Map();
  const decided = new Set(); // goal_types whose newest row we've already judged
  for (const g of goalRows || []) {
    if (!g?.goal_type || decided.has(g.goal_type)) continue;
    decided.add(g.goal_type); // this is the newest row for the type — it's the verdict
    if (g.active === false) continue; // cleared marker → no active goal (no fallback)
    live.set(g.goal_type, {
      target_value: finite(g.target_value),
      unit: g.unit ?? null,
      direction: g.direction ?? null,
    });
  }
  return live;
}

// Compare a value to a resolved goal. Returns null if there's no goal or the
// inputs are unusable (caller then omits the vs-goal field entirely).
// → { target, unit, direction, value, delta, met }
//   delta is signed in the metric's units: for 'down'/'up' it's value - target;
//   for 'by_time' it's minutes later(+)/earlier(-) than the target clock time.
//   met = whether the goal is satisfied.
export function vsGoal(value, goal) {
  const v = finite(value);
  if (!goal || v == null || goal.target_value == null || !goal.direction) return null;
  const t = goal.target_value;
  const base = { target: t, unit: goal.unit, direction: goal.direction, value: v };

  if (goal.direction === "down") {
    return { ...base, delta: v - t, met: v <= t };
  }
  if (goal.direction === "up") {
    return { ...base, delta: v - t, met: v >= t };
  }
  if (goal.direction === "by_time") {
    const delta = anchorNoon(v) - anchorNoon(t); // + = later than target = miss
    return { ...base, delta, met: delta <= 0 };
  }
  return null; // unknown direction → treat as no goal
}

// Whether a RAW week-over-week arrow direction is GOOD given the goal direction.
// 'up'+goal 'up' (lean_mass climbing) = good; 'up'+goal 'down' (weight climbing)
// = bad. No goal/flat/unknown → null so the UI just shows the neutral arrow.
// → 'good' | 'bad' | null
export function arrowVerdict(dir, goalDirection) {
  if (dir !== "up" && dir !== "down") return null;
  if (goalDirection === "up") return dir === "up" ? "good" : "bad";
  if (goalDirection === "down") return dir === "down" ? "good" : "bad";
  return null;
}
