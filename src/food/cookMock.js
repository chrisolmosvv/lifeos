// Cook Companion — hard-coded mock data for Step 1 (static render).
// Two scenarios: a RICH salmon recipe (tags + durations, the 3-at-once peak)
// and a BARE scrambled eggs recipe (no tags, no durations — the fallback).
// Removed in step 2 when real data replaces these.

const SALMON_STEPS = [
  { position: 0, text: "Season the salmon fillets with salt, pepper, and a squeeze of lemon", tag: "hands_on", timer_seconds: 60 },
  { position: 1, text: "Tip the couscous into a heatproof bowl, pour over the boiling stock, cover tightly and leave to absorb for 5 minutes", tag: "hands_free", timer_seconds: 300 },
  { position: 2, text: "Heat a non-stick pan over medium-high heat, lay the salmon skin-side down", tag: "active_heat", timer_seconds: 60 },
  { position: 3, text: "Leave the salmon to cook undisturbed until the skin is golden and crisp", tag: "hands_free", timer_seconds: 240 },
  { position: 4, text: "Wilt the greens \u2014 heat a splash of oil in a separate pan, add the greens and a pinch of salt, toss for 2\u20133 minutes until just wilted", tag: "hands_on", timer_seconds: 180 },
  { position: 5, text: "Whisk the lemon juice, olive oil, and a pinch of salt into a quick dressing", tag: "hands_on", timer_seconds: 60 },
  { position: 6, text: "Fluff the couscous with a fork, plate with the salmon and greens, drizzle the dressing", tag: "hands_on", timer_seconds: 120 },
];

const SALMON_INGS = [
  { raw_text: "2 salmon fillets", position: 0 },
  { raw_text: "100g couscous", position: 1 },
  { raw_text: "150ml boiling chicken stock", position: 2 },
  { raw_text: "200g mixed greens (spinach, kale)", position: 3 },
  { raw_text: "1 lemon, juiced", position: 4 },
  { raw_text: "2 tbsp olive oil", position: 5 },
  { raw_text: "Salt and pepper", position: 6 },
];

// The 3-at-once peak: greens on your hands, couscous + salmon parked, dressing + plate not-yet
export const RICH_MOCK = {
  recipe: { title: "Salmon, Couscous & Greens", servings: 2, prep_minutes: 5, cook_minutes: 15 },
  steps: SALMON_STEPS,
  ingredients: SALMON_INGS,
  // Pre-derived buckets for the static render (step 4 is the hero)
  hero: { index: 4, step: SALMON_STEPS[4] },
  parked: [
    { index: 3, step: SALMON_STEPS[3], remaining: 145 },  // salmon 2:25 — within threshold
    { index: 1, step: SALMON_STEPS[1], remaining: 252 },  // couscous 4:12
  ],
  notYet: [
    { index: 5, step: SALMON_STEPS[5] },
    { index: 6, step: SALMON_STEPS[6] },
  ],
  done: [
    { index: 0, step: SALMON_STEPS[0] },
    { index: 2, step: SALMON_STEPS[2] },
  ],
  tickedIngredients: new Set(["0", "1", "2", "3"]),
};

// ── Bare fallback: no tags, no durations ─────────────────────────────────────
const EGGS_STEPS = [
  { position: 0, text: "Crack 3 eggs into a bowl and beat with a fork until smooth", tag: null, timer_seconds: null },
  { position: 1, text: "Add a pinch of salt and a grind of black pepper", tag: null, timer_seconds: null },
  { position: 2, text: "Melt a knob of butter in a non-stick pan over medium-low heat", tag: null, timer_seconds: null },
  { position: 3, text: "Pour in the eggs and stir gently with a spatula, folding the curds as they form", tag: null, timer_seconds: null },
  { position: 4, text: "Remove from the heat while the eggs are still slightly wet \u2014 they carry on cooking", tag: null, timer_seconds: null },
  { position: 5, text: "Serve immediately on warm toast", tag: null, timer_seconds: null },
];

export const BARE_MOCK = {
  recipe: { title: "Scrambled Eggs on Toast", servings: 1, prep_minutes: 2, cook_minutes: 5 },
  steps: EGGS_STEPS,
  ingredients: [
    { raw_text: "3 eggs", position: 0 },
    { raw_text: "Knob of butter", position: 1 },
    { raw_text: "Salt and pepper", position: 2 },
    { raw_text: "2 slices bread, toasted", position: 3 },
  ],
  // Bare = linear, step 2 is the hero (midway through the cook)
  hero: { index: 2, step: EGGS_STEPS[2] },
  parked: [],
  notYet: [
    { index: 3, step: EGGS_STEPS[3] },
    { index: 4, step: EGGS_STEPS[4] },
    { index: 5, step: EGGS_STEPS[5] },
  ],
  done: [
    { index: 0, step: EGGS_STEPS[0] },
    { index: 1, step: EGGS_STEPS[1] },
  ],
  tickedIngredients: new Set(["0", "2"]),
};
