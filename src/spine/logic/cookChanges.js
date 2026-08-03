// LifeOS — Food → end-of-cook CHANGES (3e, PURE). Turns the loaded recipe + the replayed cook state
// into the itemised review: what timing and amounts changed, each keyable for Keep/Drop. Then
// applies the KEPT changes onto WHOLE step/ingredient objects (every field carried through) so the
// delete-all-then-reinsert in updateRecipe can't null station/hold_tolerance/is_prep/grams.
//
// replay shape used here: { estimates: {ref→sec}, amounts: {ref→{amount,unit,grams}},
//   omitted: Set<ref>, liveTimers: [{targetRef, elapsed}] }. ACTUAL_THRESHOLD = 45s (spec).

const ACTUAL_THRESHOLD = 45;
const roundMin = (sec) => Math.round(sec / 60) * 60;

// { timing: [{key, step, from, to, source}], amounts: [{key, ing, label, omit?, from?, to?}] }
export function computeChanges(steps, ingredients, replay) {
  const est = replay.estimates || {};
  const amt = replay.amounts || {};
  const omitted = replay.omitted || new Set();
  const elapsedByRef = {};
  for (const t of replay.liveTimers || []) elapsedByRef[t.targetRef] = t.elapsed;

  const timing = [];
  steps.forEach((s, i) => {
    const stored = s.timer_seconds || 0;
    const ref = String(i);
    let to = null, source = null;
    if (est[ref] != null && est[ref] !== stored) { to = est[ref]; source = "estimate"; }        // explicit edit
    else if (elapsedByRef[ref] != null && Math.abs(elapsedByRef[ref] - stored) > ACTUAL_THRESHOLD) { to = roundMin(elapsedByRef[ref]); source = "actual"; } // what really happened
    if (to != null && to !== stored) timing.push({ key: `t${i}`, step: i, from: stored, to, source });
  });

  const amounts = [];
  ingredients.forEach((ing, i) => {
    const ref = String(i);
    const label = ing.raw_text || ing.name || `ingredient ${i + 1}`;
    if (omitted.has(ref)) { amounts.push({ key: `o${i}`, ing: i, label, omit: true }); return; }
    const c = amt[ref];
    if (c && (c.amount !== ing.amount || c.unit !== ing.unit)) {
      const fmt = (a, u) => (a != null ? `${a}${u ? ` ${u}` : ""}` : "—");
      amounts.push({ key: `a${i}`, ing: i, label, from: fmt(ing.amount, ing.unit), to: fmt(c.amount, c.unit), amount: c.amount, unit: c.unit, grams: c.grams });
    }
  });

  return { timing, amounts };
}

// Apply the KEPT changes onto WHOLE objects (clones of the loaded steps/ingredients — all fields).
// Kept omits REMOVE the ingredient. Returns { steps, ingredients } ready for updateRecipe.
export function applyKept(steps, ingredients, changes, keptKeys) {
  const kept = keptKeys instanceof Set ? keptKeys : new Set(keptKeys);
  const outSteps = steps.map((s) => ({ ...s })); // whole — every column carried through
  for (const c of changes.timing) if (kept.has(c.key)) outSteps[c.step].timer_seconds = c.to;

  const drop = new Set();
  const outIngs = ingredients.map((i) => ({ ...i })); // whole
  for (const c of changes.amounts) {
    if (!kept.has(c.key)) continue;
    if (c.omit) drop.add(c.ing);
    else { outIngs[c.ing].amount = c.amount ?? null; outIngs[c.ing].unit = c.unit ?? null; if (c.grams != null) outIngs[c.ing].grams = c.grams; }
  }
  return { steps: outSteps, ingredients: outIngs.filter((_, i) => !drop.has(i)) };
}
