// LifeOS — Food → the Converged Finder (V2 P2): context config + result zoning (PURE).
//
// ONE finder component serves two contexts via config-injection (no if(context) tangle): the
// consumer passes a finderConfig object + an onResolve/onLog handler. Everything shared (search,
// zones, rows, amount step, P1 envelope rendering) lives in the shell; only these knobs differ.

import { unitOptionsFor } from "../portions";

// The Basics convention — ONE source of truth on the client, MIRRORS the server-side check in
// supabase/functions/food-search/normalize.ts isBasic(). A curated staple is a food_items row
// with source='manual' and source_ref='basics:<slug>'. If the server rule changes, change both.
export const BASICS_PREFIX = "basics:";
export function isBasicCandidate(c) {
  return c?.source === "manual" && typeof c?.source_ref === "string" && c.source_ref.startsWith(BASICS_PREFIX);
}

// Split the flat results into the three render zones. Basics lead (they're already first in the
// flat array; we filter by the convention). The AI top-3 (P1's `top3` = indices into results) form
// "From the databases"; the rest fall under "more". Pure — never mutates or reshapes a record.
// → { basics, dbTop, dbMore } (arrays of the SAME record objects, by reference).
export function zoneResults(results, top3) {
  const list = results || [];
  const basics = list.filter(isBasicCandidate);
  const rest = list.filter((c) => !isBasicCandidate(c));
  const topIdx = new Set((top3 || []).filter((i) => Number.isInteger(i) && i >= 0 && i < list.length));
  const inTop = (c) => topIdx.has(list.indexOf(c)) && !isBasicCandidate(c);
  return { basics, dbTop: rest.filter(inTop), dbMore: rest.filter((c) => !inTop(c)) };
}

// Units offered for a picked food, per context. Grams always first (the 100g default lives there);
// serving when the food carries a serving weight. Logger stays foods-only (g/ml/serving — all
// resolvable by entryMacros). Recipe adds household portions (cup/tbsp/tsp/item via resolvePortion).
function loggerUnits(food) {
  const u = ["g", "ml"];
  if (Number.isFinite(food?.serving?.grams)) u.push("serving");
  return u;
}
function recipeUnits(food) {
  const u = unitOptionsFor(food?.name); // g/cup/tbsp/tsp (+ item when the name matches a whole item)
  if (Number.isFinite(food?.serving?.grams) && !u.includes("serving")) u.push("serving");
  return u;
}

export const loggerFinderConfig = {
  id: "logger",
  title: "Add food",
  includeMeals: false, // P5: meals source (fetchRecipeList) + the bridge write land later
  unitsFor: loggerUnits,
  showSlot: true,
  allowNoMacros: false,
  allowManual: true, // "add a food" hatch → ManualForm
  allowEstimate: true, // "estimate this meal" hatch → EstimateMealPanel (Feature B, P5)
};

export const recipeFinderConfig = {
  id: "recipe",
  title: "Add ingredient",
  includeMeals: false,
  unitsFor: recipeUnits,
  showSlot: false,
  allowNoMacros: true, // recipe: "keep as text (no macros)" hatch (wired P6)
  allowManual: false,
  allowEstimate: false,
};
