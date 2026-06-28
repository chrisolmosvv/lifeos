// LifeOS — Food → recipe calc (F3): per-serving + total macros from ingredients (PURE).
//
// A recipe's macros are COMPUTED from its structured ingredients (no recipe-level override —
// F0 decision). Each ingredient resolves one of three ways:
//   1) food_item_id → a record in `itemsById` → scale by {amount, unit} via entryMacros.
//   2) manual_macros → hand-entered numbers for an off-DB item, used as-is.
//   3) no_macros / unresolved (no DB match, or a unit the V1 grams path can't resolve) →
//      contributes 0 AND counts toward unestimatedCount.
// NEVER hides: returns the resolved total + per-serving PLUS unestimatedCount, so the UI can
// show the real macros alongside an honest "N ingredients unestimated" flag.

import { entryMacros, NUTRIENTS } from "./foodCalc.js";

// recipeMacros(ingredients, servings, itemsById) →
//   { total, perServing, servings, unestimatedCount, ingredientCount }
// servings ≤ 0 / absent → perServing = total (no divide-by-zero; caller can flag it).
export function recipeMacros(ingredients, servings, itemsById) {
  const list = ingredients || [];
  const total = {};
  for (const k of NUTRIENTS) total[k] = 0;
  let unestimatedCount = 0;

  for (const ing of list) {
    const m = ingredientMacros(ing, itemsById);
    if (m == null) {
      unestimatedCount += 1; // no_macros / no match / unresolved unit → unestimated
      continue;
    }
    for (const k of NUTRIENTS) {
      const v = m[k];
      if (typeof v === "number" && Number.isFinite(v)) total[k] += Math.max(0, v);
    }
  }

  const n = typeof servings === "number" && Number.isFinite(servings) && servings > 0 ? servings : null;
  const perServing = {};
  for (const k of NUTRIENTS) perServing[k] = n ? total[k] / n : total[k];

  return { total, perServing, servings: n, unestimatedCount, ingredientCount: list.length };
}

// One ingredient → its 7 numbers, or null if it can't be estimated. manual_macros wins as a
// hand-entered override; otherwise scale the matched food. An ingredient is "estimated" only
// if it yields a calorie figure (mirrors the food-search hasMacros rule) — anything without a
// kcal (no_macros, no match, unresolvable unit, an empty manual entry) is null → unestimated.
function ingredientMacros(ing, itemsById) {
  if (!ing || ing.no_macros) return null;

  let m = null;
  if (ing.manual_macros && typeof ing.manual_macros === "object") {
    m = {};
    for (const k of NUTRIENTS) {
      const v = ing.manual_macros[k];
      m[k] = typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : null;
    }
  } else if (ing.food_item_id != null && itemsById?.[ing.food_item_id]) {
    m = entryMacros(itemsById[ing.food_item_id], ing.amount, ing.unit || "g");
  }

  return m && Number.isFinite(m.kcal) ? m : null;
}
