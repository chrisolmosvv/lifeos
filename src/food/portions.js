// LifeOS — Food → portions (F7, the F0 amendment). A CURATED table that turns household amounts
// ("1 onion", "1 cup flour", "1 tbsp oil") into grams, so recipe ingredients aren't grams-only.
// Pure util (no DB), like the F3 calc. NOT exhaustive — an off-list amount falls back to a grams
// prompt, and an unresolvable ingredient is marked no-macros ("unestimated"). The resolved grams
// are stored as the ingredient's amount; raw_text keeps the human label.

// Whole items: one piece → grams. Keyed by a word that appears in the food's name.
const ITEM_GRAMS = {
  onion: 110, garlic: 5, clove: 5, egg: 50, carrot: 60, potato: 150,
  tomato: 120, banana: 120, apple: 180, lemon: 60, pepper: 120,
};

// Volume → grams per (cup, tbsp, tsp), by density CLASS. The food name picks the class.
const VOLUME = {
  flour: { cup: 120, tbsp: 8, tsp: 3 },
  sugar: { cup: 200, tbsp: 12, tsp: 4 },
  fat: { cup: 218, tbsp: 14, tsp: 5 }, //   oil / butter
  rice: { cup: 185, tbsp: 12, tsp: 4 }, //  uncooked
  liquid: { cup: 240, tbsp: 15, tsp: 5 }, // water / milk / stock / broth
  generic: { cup: 240, tbsp: 15, tsp: 5 }, // unknown food → water-like
};

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : null;
};

function itemWord(name) {
  const n = (name || "").toLowerCase();
  return Object.keys(ITEM_GRAMS).find((w) => n.includes(w)) || null;
}

// A food name → its density class for volume conversions.
function densityClass(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("flour")) return "flour";
  if (n.includes("sugar")) return "sugar";
  if (n.includes("oil") || n.includes("butter")) return "fat";
  if (n.includes("rice")) return "rice";
  if (/(milk|water|stock|broth|juice|cream|wine)/.test(n)) return "liquid";
  return "generic";
}

// The portion units the amount step offers for a food: grams + the volumes, plus "item" when the
// food matches a whole-item word.
export function unitOptionsFor(name) {
  const opts = ["g", "cup", "tbsp", "tsp"];
  if (itemWord(name)) opts.push("item");
  return opts;
}

// Normalise a few spellings to the table's keys.
function unitKey(u) {
  const s = String(u || "g").toLowerCase();
  if (s === "g" || s === "gram" || s === "grams" || s === "ml") return "g";
  if (s === "cup" || s === "cups") return "cup";
  if (s === "tbsp" || s === "tablespoon" || s === "tablespoons") return "tbsp";
  if (s === "tsp" || s === "teaspoon" || s === "teaspoons") return "tsp";
  if (s === "item" || s === "items" || s === "whole") return "item";
  return s;
}

// resolvePortion(foodName, amount, unit) → grams, or null when unresolvable (→ grams prompt, then
// no-macros if still none).
export function resolvePortion(foodName, amount, unit) {
  const a = num(amount);
  if (a == null) return null;
  const u = unitKey(unit);
  if (u === "g") return a;
  if (u === "item") {
    const w = itemWord(foodName);
    return w ? a * ITEM_GRAMS[w] : null;
  }
  const vol = VOLUME[densityClass(foodName)];
  return vol[u] != null ? a * vol[u] : null;
}

// A human label for an ingredient amount, stored as raw_text alongside the resolved grams.
export function portionLabel(amount, unit) {
  const a = num(amount);
  if (a == null) return "";
  const u = unitKey(unit);
  if (u === "item") return `${a}`;
  return `${a} ${u === "g" ? "g" : u}`;
}
