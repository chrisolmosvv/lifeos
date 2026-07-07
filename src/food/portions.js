// LifeOS — Food → portions (F7, the F0 amendment). A CURATED table that turns household amounts
// ("1 onion", "1 cup flour", "1 tbsp oil") into grams, so recipe ingredients aren't grams-only.
// Pure util (no DB), like the F3 calc. NOT exhaustive — an off-list amount falls back to a grams
// prompt, and an unresolvable ingredient is marked no-macros ("unestimated"). The resolved grams
// are stored as the ingredient's amount; raw_text keeps the human label.

// Whole items: one piece → grams. Keyed by a word that appears in the food's name.
// Compound keys (e.g. "green onion") checked first via ITEM_COMPOUNDS to avoid a substring
// false-positive ("green onions" matching plain "onion" at 110g instead of 15g).
const ITEM_COMPOUNDS = [
  ["green onion", 15], ["spring onion", 15], ["scallion", 15],
  ["cherry tomato", 10], ["baby potato", 50], ["sweet potato", 150],
];
const ITEM_GRAMS = {
  onion: 110, garlic: 5, clove: 5, egg: 50, carrot: 60, potato: 150,
  tomato: 120, banana: 120, apple: 180, lemon: 60, pepper: 120,
  chilli: 30, celery: 40, zucchini: 200, avocado: 150, lime: 45,
  shallot: 30, beetroot: 80,
};

// Volume → grams per (cup, tbsp, tsp), by density CLASS. The food name picks the class.
const VOLUME = {
  flour: { cup: 120, tbsp: 8, tsp: 3 },
  sugar: { cup: 200, tbsp: 12, tsp: 4 },
  fat: { cup: 218, tbsp: 14, tsp: 5 }, //   oil / butter
  rice: { cup: 185, tbsp: 12, tsp: 4 }, //  uncooked
  liquid: { cup: 240, tbsp: 15, tsp: 5 }, // water / milk / stock / sauce / vinegar / etc.
  vegetable: { cup: 150, tbsp: 10, tsp: 3 }, // peas, corn, diced veg
  spice: { cup: 110, tbsp: 7, tsp: 2 }, // dry powder / ground spice
  breadcrumb: { cup: 60, tbsp: 4, tsp: 1 }, // panko, breadcrumbs
  oat: { cup: 85, tbsp: 5, tsp: 2 }, //  rolled / porridge oats
  nut: { cup: 120, tbsp: 8, tsp: 3 }, //  chopped tree nuts
  cheese: { cup: 100, tbsp: 6, tsp: 2 }, // grated hard cheese
};

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : null;
};

function itemWeight(name) {
  const n = (name || "").toLowerCase();
  const compound = ITEM_COMPOUNDS.find(([k]) => n.includes(k));
  if (compound) return compound[1];
  const simple = Object.keys(ITEM_GRAMS).find((w) => n.includes(w));
  return simple ? ITEM_GRAMS[simple] : null;
}
// Legacy helper — returns the matched key (for unitOptionsFor)
function itemWord(name) {
  const n = (name || "").toLowerCase();
  if (ITEM_COMPOUNDS.some(([k]) => n.includes(k))) return "compound";
  return Object.keys(ITEM_GRAMS).find((w) => n.includes(w)) || null;
}

// A food name → its density class for volume conversions.
function densityClass(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("flour")) return "flour";
  if (n.includes("sugar")) return "sugar";
  if (n.includes("oil") || n.includes("butter")) return "fat";
  if (n.includes("rice")) return "rice";
  if (/(milk|water|stock|broth|juice|cream|wine|yogurt|yoghurt|vinegar|sauce|honey|syrup|beer|cider|paste|puree|purée)/.test(n)) return "liquid";
  if (/(peas|corn|bean|chickpea|lentil)/.test(n)) return "vegetable";
  if (/(cumin|paprika|cinnamon|turmeric|chilli powder|chili powder|fenugreek|garam|nutmeg|oregano|thyme|basil|coriander ground|curry powder|spice)/.test(n)) return "spice";
  if (/\b(breadcrumbs?|panko)\b/.test(n)) return "breadcrumb";
  if (/\b(oats?|oatmeal|porridge)\b/.test(n)) return "oat";
  if (/\b(almonds?|walnuts?|pecans?|cashews?|pistachios?|peanuts?|hazelnuts?|macadamias?|nuts?|pine nuts?)\b/.test(n)) return "nut";
  if (/\b(parmesan|pecorino|cheddar|mozzarella|gruyere|gruyère|gouda|emmental|manchego)\b/.test(n)) return "cheese";
  return null; // unknown → flagged (honest omission, not a water-density guess)
}

// The portion units the amount step offers for a food: grams + the volumes, plus "item" when the
// food matches a whole-item word.
export function unitOptionsFor(name) {
  const opts = ["g", "cup", "tbsp", "tsp"];
  if (itemWord(name)) opts.push("item");
  return opts;
}

// Normalise unit strings to table keys. Standard closed-class cooking count-words map to "item".
function unitKey(u) {
  if (u == null) return null; // null unit → handled specially in resolvePortion
  const s = String(u).toLowerCase();
  if (s === "g" || s === "gram" || s === "grams" || s === "ml") return "g";
  if (s === "cup" || s === "cups") return "cup";
  if (s === "tbsp" || s === "tablespoon" || s === "tablespoons") return "tbsp";
  if (s === "tsp" || s === "teaspoon" || s === "teaspoons") return "tsp";
  // Closed-class cooking count-words → "item" (resolved via ITEM_GRAMS if the food is known)
  if (s === "item" || s === "items" || s === "whole") return "item";
  if (s === "clove" || s === "cloves") return "item";
  if (s === "large" || s === "medium" || s === "small") return "item";
  if (s === "piece" || s === "pieces") return "item";
  if (s === "slice" || s === "slices") return "item";
  if (s === "stalk" || s === "stalks") return "item";
  if (s === "sprig" || s === "sprigs") return "item";
  if (s === "head" || s === "heads") return "item";
  if (s === "bunch" || s === "bunches") return "item";
  if (s === "rasher" || s === "rashers") return "item";
  return s;
}

// resolvePortion(foodName, amount, unit) → grams, or null when unresolvable (→ grams prompt, then
// no-macros if still none). FLAGGING RULE: when the food has no known item weight and the unit
// can't be resolved, return null (honest "set amount") rather than guessing.
export function resolvePortion(foodName, amount, unit) {
  const a = num(amount);
  if (a == null) return null;
  const u = unitKey(unit);
  if (u === "g") return a;
  // Null unit with a plausible count (0 < amount ≤ 24): treat as items IF the food has a known weight.
  // "2 eggs" → 2 × 50g, "½ onion" → 0.5 × 110g = 55g. Unknown food → null (flagged).
  if (u == null) {
    const wt = itemWeight(foodName);
    if (wt && a > 0 && a <= 24) return a * wt;
    return null;
  }
  if (u === "item") {
    const wt = itemWeight(foodName);
    return wt ? a * wt : null; // unknown item weight → flagged
  }
  // Unrecognised unit (not a volume measure) — try item weight as a fallback.
  // Gemini sometimes puts the food name in the unit slot ("½ lemon" → unit="lemon").
  const isVolume = u === "cup" || u === "tbsp" || u === "tsp";
  if (!isVolume) {
    const wt = itemWeight(foodName);
    if (wt && a > 0 && a <= 24) return a * wt;
    return null;
  }
  // Volume unit → density-class lookup. Unknown density → flagged (honest omission, not a guess).
  const cls = densityClass(foodName);
  if (!cls) return null;
  const vol = VOLUME[cls];
  return vol[u] != null ? a * vol[u] : null;
}

// A human label for an ingredient amount, stored as raw_text alongside the resolved grams.
export function portionLabel(amount, unit) {
  const a = num(amount);
  if (a == null) return "";
  const u = unitKey(unit);
  if (u === "item" || u == null) return `${a}`;
  return `${a} ${u === "g" ? "g" : u}`;
}
