// LifeOS — Food → import review SAVE GATE (4c, PURE). Three checks that all must pass before Save is
// enabled; low-confidence flags WARN but never block (the owner may ship a guess, it just says so).
//   • every ingredient RESOLVED — a food_item_id, manual_macros, or explicitly no_macros
//   • every step has a DURATION (timer_seconds > 0)
//   • the plan is VALID — no circular dependency

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
  const ingUnresolved = ings.filter((i) => !(i.food_item_id != null || i.manual_macros || i.no_macros)).length;
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
