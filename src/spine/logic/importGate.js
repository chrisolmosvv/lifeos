// LifeOS — Food → import review SAVE GATE (4c, PURE). Three checks that all must pass before Save is
// enabled; low-confidence flags WARN but never block (the owner may ship a guess, it just says so).
//   • every ingredient RESOLVED — a food match WITH a resolved weight, manual_macros, or no_macros
//   • every step has a DURATION (timer_seconds > 0)
//   • the plan is VALID — no circular dependency
//
// Piece 9 Fix 4: "resolved" used to mean "has a food_item_id" ALONE — so a WRONG match with no
// weight (red pepper flakes → a snap-peas product, 0 g, 0 macros) counted as done and the recipe
// read "ready to save" while every row under it was flagged. A match without a weight produces NO
// macros, which is the whole point of resolving. So a food match now ALSO needs grams > 0. The three
// genuinely-distinct exits: matched food + weight · manual macros · the owner said it has none.

import { resolvePortion } from "./portions.js";

// Does this ingredient actually produce macros (or is it an explicit owner choice)? Mirrors
// buildReview's resolveGrams so the gate and the visible row agree: a stored weight, else the same
// portions re-resolve. A food_item_id with no resolvable weight is a FAILURE wearing a success.
function ingredientResolved(i) {
  if (i.no_macros || i.manual_macros) return true;
  if (i.food_item_id == null) return false;
  const direct = Number(i.grams);
  if (Number.isFinite(direct) && direct > 0) return true;
  const g = resolvePortion(i.parsedName || i.name, i.amount, i.unit);
  return Number.isFinite(g) && g > 0;
}

// Cycle detection over depends_on (0-based step positions). DFS with a recursion stack.
function hasCycle(steps) {
  const n = (steps || []).length;
  const deps = (i) => (Array.isArray(steps[i]?.depends_on) ? steps[i].depends_on.filter((d) => Number.isInteger(d) && d >= 0 && d < n) : []);
  const state = new Array(n).fill(0); // 0 unseen · 1 in-stack · 2 done
  const visit = (i) => {
    if (state[i] === 1) return true;   // back-edge → cycle
    if (state[i] === 2) return false;
    state[i] = 1;
    for (const d of deps(i)) if (visit(d)) return true;
    state[i] = 2;
    return false;
  };
  for (let i = 0; i < n; i++) if (state[i] === 0 && visit(i)) return true;
  return false;
}

// importGate(ingredients, steps) → the gate state + counts + the warn count (flags not yet confirmed).
export function importGate(ingredients, steps, unconfirmedFlags = 0) {
  const ings = ingredients || [], sts = steps || [];
  const ingUnresolved = ings.filter((i) => !ingredientResolved(i)).length;
  const stepsUntimed = sts.filter((s) => !(Number(s.timer_seconds) > 0)).length;
  const planValid = !hasCycle(sts);
  return {
    ingredientsResolved: ingUnresolved === 0, ingUnresolved,
    stepsTimed: stepsUntimed === 0, stepsUntimed,
    planValid,
    warnFlags: unconfirmedFlags,
    canSave: ingUnresolved === 0 && stepsUntimed === 0 && planValid,
  };
}
