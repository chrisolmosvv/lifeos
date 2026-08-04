// LifeOS — Food → portions DATA (Piece 9 Fix 3). The density table lives here, apart from the
// portions.js logic, so every gram value can carry its SOURCE and the table can grow without
// bloating the resolver. Accuracy over coverage: a WRONG density silently poisons a recipe's
// total, while a MISSING one now flags honestly (Fix 4). So an entry is added only when its
// weight is sourced, and a food whose density we don't actually know is left OUT (→ null → flag).
//
// VOLUME = grams per (cup, tbsp, tsp) by density CLASS. DENSITY_RULES map a food NAME to a class,
// FIRST MATCH WINS — so specific/heavier rules sit above generic ones. Volumes: 1 cup = 240 mL,
// 1 tbsp = 15 mL, 1 tsp = 5 mL (US measures, the recipe norm).

// grams per cup / tbsp / tsp.
export const VOLUME = {
  // ── pre-existing classes (F7), unchanged ──────────────────────────────────
  flour: { cup: 120, tbsp: 8, tsp: 3 },   // plain/all-purpose wheat flour
  sugar: { cup: 200, tbsp: 12, tsp: 4 },  // granulated white sugar
  fat: { cup: 218, tbsp: 14, tsp: 5 },    // oil / butter / ghee (≈0.91 g/mL)
  rice: { cup: 185, tbsp: 12, tsp: 4 },   // uncooked white rice (also quinoa/couscous, within ~8%)
  liquid: { cup: 240, tbsp: 15, tsp: 5 }, // water-density: milk/stock/juice/wine/vinegar/sauce/cream
  vegetable: { cup: 150, tbsp: 10, tsp: 3 }, // peas, corn, diced veg
  spice: { cup: 110, tbsp: 7, tsp: 2 },   // ground/dense dry spice (pepper, cumin, paprika ≈2 g/tsp)
  breadcrumb: { cup: 60, tbsp: 4, tsp: 1 }, // panko / dried breadcrumbs
  oat: { cup: 85, tbsp: 5, tsp: 2 },      // rolled / porridge oats
  nut: { cup: 120, tbsp: 8, tsp: 3 },     // chopped tree nuts; also sesame/sunflower/pumpkin seeds
  cheese: { cup: 100, tbsp: 6, tsp: 2 },  // grated hard cheese

  // ── new classes (Piece 9 Fix 3), each sourced ─────────────────────────────
  // Fine/table salt. Anchor: 1 tsp = 6 g (USDA FoodData Central, "Salt, table" household measure);
  // tbsp = 3 tsp = 18 g; cup = 48 tsp = 288 g. (Coarse/kosher salt is lighter — not modelled here;
  // a recipe that says "kosher salt" by the tsp is close enough, and salt is usually to taste.)
  salt: { cup: 288, tbsp: 18, tsp: 6 },
  // Distilled spirits ≈40% ABV (vodka, gin, rum, whisky…). Density ≈0.94 g/mL (ethanol–water 40%
  // v/v, standard density tables): cup 240 mL → 226 g, tbsp → 14 g, tsp → 5 g.
  spirit: { cup: 226, tbsp: 14, tsp: 5 },
  // Dried LEAFY herbs (oregano, thyme, basil, parsley…). Much lighter than ground spice:
  // 1 tsp ≈ 1 g, 1 tbsp ≈ 3 g (spice-jar equivalents, e.g. McCormick dried oregano/parsley).
  // A cup of dried herb settles loose (≈30 g, less than 16×tbsp) — but a whole cup is vanishingly
  // rare; the tsp/tbsp values are the ones recipes actually use.
  herb: { cup: 30, tbsp: 3, tsp: 1 },
};

// Food name → density class. FIRST MATCH WINS; order matters. `butter(?!milk)` keeps buttermilk out
// of fat (it is a water-density liquid); spirits sit above liquid so the distilled ones don't fall
// through to water density. Specific spice/herb names are listed explicitly rather than a bare
// "pepper" (which would wrongly catch a bell PEPPER, a whole-item vegetable).
export const DENSITY_RULES = [
  ["flour", /flour/],
  ["sugar", /sugar/],
  ["fat", /oil|ghee|lard|butter(?!milk)/],
  ["rice", /rice|quinoa|couscous/],
  ["spirit", /\b(vodka|gin|rum|tequila|whisky|whiskey|bourbon|brandy|cognac|schnapps|liqueur)\b/],
  ["liquid", /milk|water|stock|broth|juice|cream|wine|vermouth|sherry|marsala|port|yogurt|yoghurt|vinegar|sauce|honey|syrup|beer|cider|paste|puree|purée/],
  ["salt", /\bsalt\b/],
  ["vegetable", /peas|corn|bean|chickpea|lentil/],
  ["spice", /cumin|paprika|cinnamon|turmeric|chilli powder|chili powder|fenugreek|garam|nutmeg|coriander|curry powder|ginger|cardamom|allspice|clove|mustard|\bmace\b|sumac|cayenne|peppercorn|black pepper|white pepper|pepper flakes|chilli flakes|chili flakes|chile flakes|\bspice\b/],
  ["herb", /oregano|thyme|basil|parsley|rosemary|sage|\bdill\b|\bmint\b|marjoram|tarragon|\bbay\b|chives|cilantro|\bherbs?\b/],
  ["breadcrumb", /\b(breadcrumbs?|panko)\b/],
  ["oat", /\b(oats?|oatmeal|porridge)\b/],
  ["nut", /\b(almonds?|walnuts?|pecans?|cashews?|pistachios?|peanuts?|hazelnuts?|macadamias?|nuts?|pine nuts?|sesame|sunflower seeds?|pumpkin seeds?)\b/],
  ["cheese", /\b(parmesan|pecorino|cheddar|mozzarella|gruyere|gruyère|gouda|emmental|manchego)\b/],
];
