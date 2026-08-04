// LifeOS — Food → import review, pass ① LOGIC (4a, PURE). Turns the import draft + itemsById into
// the ingredient diff: source line → what we'll store (buy-form) → grams (eat-form) → macros, with
// FLAG-BY-IMPACT. A weight is "guessed" when it can't be pinned confidently — a whole-item count
// ("2 pieces", "2 onions") or a vague measure ("a good handful"); a standard measure (g/ml/tbsp/
// tsp/cup) is confident. A guess is FLAGGED only where being wrong would visibly move the total —
// kcal share ≥ 5% or any macro (P/C/F) share ≥ 10%. On a 16-ingredient recipe that's ~2, not 10.

import { recipeMacros } from "./recipeCalc.js";
import { resolvePortion } from "./portions.js";

const KCAL_SHARE = 0.05, MACRO_SHARE = 0.10;
const VAGUE = /\b(handful|good|generous|pinch|splash|knob|few|some|dash|glug|drizzle|to taste)\b/i;
const round = (v) => (v >= 100 ? Math.round(v) : Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : Math.round(v * 10) / 10);

// Is the unit a whole-item COUNT (variable weight) rather than a confident measure? portions maps
// clove/piece/large/etc. → "item"; g/ml/tbsp/tsp/cup are confident.
// The confident set lists the SINGULAR, PLURAL and long forms — the extractor stores "cups",
// "teaspoons", "grams" etc., and matching only the singular used to mark those resolved measures
// as guesses (Piece 9 Fix 1: a whole cup of cream flagged while the measure was exact).
const CONFIDENT_UNITS = new Set([
  "g", "gram", "grams", "ml", "milliliter", "milliliters", "millilitre", "millilitres",
  "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
  "cup", "cups", "l", "litre", "litres", "liter", "liters", "kg", "kilogram", "kilograms",
]);
function isCountUnit(unit) {
  const u = String(unit || "").toLowerCase().trim();
  if (!u) return true; // no unit + a count = an item guess
  return !CONFIDENT_UNITS.has(u);
}

// { grams, guessed } — the edible weight and whether it's an uncertain guess.
function resolveGrams(ing) {
  const direct = Number(ing.grams);
  if (Number.isFinite(direct) && direct > 0) return { grams: direct, guessed: isCountUnit(ing.unit) || VAGUE.test(ing.raw_text || "") };
  const g = resolvePortion(ing.parsedName || ing.name, ing.amount, ing.unit);
  if (Number.isFinite(g) && g > 0) return { grams: g, guessed: true }; // resolved from a count = a guess
  return { grams: null, guessed: true };                              // unresolved — needs the Finder
}

// One ingredient's macros at its stored (source-servings) amount, computed from grams.
function macroAt(ing, grams, itemsById) {
  return recipeMacros([{ ...ing, grams }], 1, itemsById).total;
}

// buildReview(ingredients, itemsById, srcServings, serv) → { rows, perServing, flaggedCount, count }.
// Rows are scaled to `serv` (the whole recipe at the chosen servings); perServing is constant.
export function buildReview(ingredients, itemsById, srcServings, serv) {
  const list = ingredients || [];
  const src = srcServings > 0 ? srcServings : 1;
  const scale = (serv > 0 ? serv : src) / src;

  const base = list.map((ing) => {
    const { grams, guessed } = resolveGrams(ing);
    const m = macroAt(ing, grams, itemsById);
    return { ing, grams, guessed, m };
  });
  const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const b of base) for (const k of Object.keys(tot)) tot[k] += Number(b.m?.[k]) || 0;

  const impactful = (b) => {
    const kc = tot.kcal ? (b.m.kcal || 0) / tot.kcal : 0;
    const mx = Math.max(...["protein", "carbs", "fat"].map((k) => (tot[k] ? (b.m[k] || 0) / tot[k] : 0)));
    return kc >= KCAL_SHARE || mx >= MACRO_SHARE;
  };

  let flaggedCount = 0;
  const rows = base.map((b, i) => {
    // An EXPLICITLY-resolved ingredient — the owner typed its macros (manual_macros) or said it has
    // none (no_macros) — is never flagged for a missing weight or a guessed amount. It's a settled
    // owner choice, not an uncertainty (Piece 10).
    const explicit = !!(b.ing.no_macros || b.ing.manual_macros);
    const flagged = !explicit && ((b.guessed && impactful(b)) || b.grams == null);
    if (flagged) flaggedCount++;
    const it = b.ing.food_item_id != null ? itemsById?.[b.ing.food_item_id] : null;
    const manual = !!b.ing.manual_macros;
    return {
      i, orig: b.ing.raw_text || "", name: (b.ing.parsedName || it?.name || "").toLowerCase(),
      amount: b.ing.amount != null ? round(Number(b.ing.amount) * scale) : null, unit: b.ing.unit || null,
      match: b.ing.no_macros ? "no macros" : manual ? "your numbers" : (it?.name || "no match"),
      grams: b.grams != null ? Math.round(b.grams * scale) : null,
      kcal: Math.round((b.m?.kcal || 0) * scale), protein: Math.round((b.m?.protein || 0) * scale),
      carbs: Math.round((b.m?.carbs || 0) * scale), fat: Math.round((b.m?.fat || 0) * scale),
      guessed: b.guessed, flagged, manual,
      why: flagged ? whyText(b) : null,
    };
  });

  const perServing = { kcal: tot.kcal / src, protein: tot.protein / src, carbs: tot.carbs / src, fat: tot.fat / src };
  return { rows, perServing, flaggedCount, count: list.length };
}

function whyText(b) {
  if (b.grams == null) return "no weight found — set one to get macros";
  if (VAGUE.test(b.ing.raw_text || "")) return "a vague amount — the weight is a guess that moves the total";
  return `“${b.ing.amount ?? ""} ${b.ing.unit ?? ""}”`.trim() + " has no fixed weight — guessed, and it moves the total";
}
