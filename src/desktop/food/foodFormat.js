// LifeOS — Food → display formatting (F3, PURE, presentation-only).
//
// Per-nutrient labels / units / decimals + the formatters the Food screens use. No data
// logic, no Amsterdam-day bucketing, no derived numbers (those are foodCalc/recipeCalc).
// Mirrors bodyFormat.js / healthFormat.js in spirit. null/NaN → "—" (an em dash), never 0.

// One row per nutrient: how it's labelled and rounded for display. kcal + sodium are whole
// numbers; the macros carry one decimal. Units: kcal, g, mg.
export const NUTRIENT_META = {
  kcal: { label: "Calories", unit: "kcal", decimals: 0 },
  protein: { label: "Protein", unit: "g", decimals: 1 },
  carbs: { label: "Carbs", unit: "g", decimals: 1 },
  fat: { label: "Fat", unit: "g", decimals: 1 },
  fibre: { label: "Fibre", unit: "g", decimals: 1 },
  sugar: { label: "Sugar", unit: "g", decimals: 1 },
  sodium: { label: "Sodium", unit: "mg", decimals: 0 },
};

export function metaFor(nutrient) {
  return NUTRIENT_META[nutrient] || { label: nutrient, unit: "", decimals: 1 };
}

// A nutrient value → its rounded number string ("330", "33.8"). null/NaN → "—".
export function fmtNum(nutrient, v) {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(metaFor(nutrient).decimals);
}

// A nutrient value → "330 kcal" / "33.8 g" / "112 mg". null/NaN → "—" (no unit).
export function fmtFull(nutrient, v) {
  if (!Number.isFinite(v)) return "—";
  const m = metaFor(nutrient);
  return `${v.toFixed(m.decimals)} ${m.unit}`;
}

// A 0–1 fraction → a whole-percent string ("46%"). null/NaN → "—". For the macro split bar
// labels and any "% of goal" readout.
export function fmtPct(frac) {
  if (!Number.isFinite(frac)) return "—";
  return `${Math.round(frac * 100)}%`;
}
