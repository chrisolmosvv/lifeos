// LifeOS — Food → recipe-import (Cookbook rebuild, Piece 2a): the TWO prompts + their two
// responseSchemas. Split out of index.ts so each file stays under the ~250-line ceiling.
//
// TWO PASSES, ruled by the Planner (do not collapse into one call):
//   PASS 1 — THE BODY. Faithful extraction: title/servings/times/cuisine, a multi_recipe flag,
//            ingredients (with the step that uses each), and steps as a TERSE rewrite PLUS the
//            verbatim original. Merge-don't-split lives here (it reads the prose). Owns the base
//            step list and its dependencies.
//   PASS 2 — ENRICHMENT. Sees the whole recipe at once. For EACH base step (same count + order):
//            a duration, an activity tag, a station, a hold-tolerance, and a per-field confidence.
//            PLUS any GENERATED PREP STEPS (physical prep the source hid in its ingredient list).
//            It never renumbers the base steps — prep is returned separately and spliced in code.
//
// Only recipe text leaves the app (free-Gemini boundary intact — no intake/health/goals here).

// ── PASS 1: the body ──────────────────────────────────────────────────────────
export const PASS1_SYSTEM = `You convert a recipe (pasted text or a web page's text) into STRICT JSON for a cookbook app. Output ONLY the JSON object — no prose, no markdown fences.
Schema:
{ "title": string, "servings": number|null, "prep_minutes": number|null, "cook_minutes": number|null,
  "cuisine": string|null, "cuisine_confidence": "low"|"medium"|"high"|null, "multi_recipe": boolean,
  "ingredients": [ { "raw_text": string, "name": string, "amount": number|null, "unit": string|null, "step_number": number|null } ],
  "steps": [ { "text": string, "original": string, "depends_on": number[]|null } ] }
Rules:
- "cuisine" = a SHORT free-text label for the dish's cuisine (e.g. "Thai", "North African", "Italian", "Eastern European"). ALWAYS set it — infer it from the dish name and ingredients; almost every recipe has an identifiable cuisine, so give your best guess. Use null ONLY if it is genuinely impossible to tell. "cuisine_confidence" = your confidence in that label.
- "multi_recipe" = true ONLY if the text contains MORE THAN ONE distinct, separately-titled recipe (e.g. a page with "Main" and also "Dessert" as full recipes). A single recipe with sub-components (a sauce, a garnish) is NOT multi_recipe — that is one recipe. When multi_recipe is true, still fill title/ingredients/steps with your best single guess, but set the flag.
- "raw_text" = the original ingredient line (e.g. "2 tbsp melted butter").
- "name" = the core food for database matching: lowercase, no quantity or prep words (e.g. "butter").
- "amount"/"unit" = the numeric quantity + its unit when clearly present, else null.
- STEPS — "text" is a TERSE rewrite; "original" is the source wording VERBATIM.
  • Terse rewrite: cut waffle and blog padding, but KEEP EVERY instruction and every temperature, time and quantity. Never drop information to make it shorter. If the source is already terse, "text" may equal "original".
  • "original" must be the untouched source sentence(s) for that step — the review screen offers "show the original", so it must be faithful.
- MERGE, DO NOT SPLIT. Produce AS FEW STEPS AS POSSIBLE while keeping the plan honest:
  • Split a source step ONLY when the split changes the plan — the work moves to a different place (bench/hob/oven/rest), OR the split creates five or more minutes of genuinely free time you could spend on something else.
  • ABSORB any action under two minutes into the step next to it. Never leave a 1-minute "return the pan to the heat" step sitting alone above a 10-minute simmer — that is ONE step of 11 minutes.
  • A six-step source recipe should typically come out at seven to nine steps, not fifteen.
- Steps are 0-INDEXED (the first step is 0).
- "depends_on" = array of 0-based step numbers that must FINISH before this step can start. Fill it for every step:
  • null = starts immediately with no prerequisite (only the very first steps).
  • [N] = waits for step N. [N, M] = waits for BOTH.
  EXAMPLE: step 0 "boil water", 1 "meanwhile sauté onion", 2 "add garlic" (after onion), 3 "cook pasta" (needs boiling water), 4 "combine" (needs pasta and sauce) → depends_on: null, null, [1], [0], [2, 3].
  Be AGGRESSIVE about parallelism: "meanwhile", "while the X…", and independent components run in PARALLEL (null or their true predecessor only). A step that just continues the previous one gets [previous]. The final step usually depends on several threads converging.
- "step_number" on an ingredient = the 0-based step that PRIMARILY uses it. Null only if genuinely unclear or used throughout (e.g. "salt").
- If the text is NOT a recipe, return {"title":"","servings":null,"prep_minutes":null,"cook_minutes":null,"cuisine":null,"cuisine_confidence":null,"multi_recipe":false,"ingredients":[],"steps":[]}.`;

const CONF = { type: "STRING", enum: ["low", "medium", "high"], nullable: true };

export const PASS1_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    servings: { type: "NUMBER", nullable: true },
    prep_minutes: { type: "NUMBER", nullable: true },
    cook_minutes: { type: "NUMBER", nullable: true },
    cuisine: { type: "STRING", nullable: true },
    cuisine_confidence: CONF,
    multi_recipe: { type: "BOOLEAN" },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          raw_text: { type: "STRING" },
          name: { type: "STRING" },
          amount: { type: "NUMBER", nullable: true },
          unit: { type: "STRING", nullable: true },
          step_number: { type: "NUMBER", nullable: true },
        },
        required: ["raw_text", "name"],
      },
    },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          original: { type: "STRING" },
          depends_on: { type: "ARRAY", items: { type: "NUMBER" }, nullable: true },
        },
        required: ["text"],
      },
    },
  },
  // cuisine is REQUIRED so Gemini must emit it (2c fix: it was optional and the model nulled it).
  // Still nullable, so a genuinely-unknowable cuisine can be null rather than fabricated.
  required: ["title", "cuisine", "multi_recipe", "ingredients", "steps"],
};

// ── PASS 2: enrichment ────────────────────────────────────────────────────────
export const PASS2_SYSTEM = `You are the scheduling brain for a cookbook app. You are given a recipe's INGREDIENTS and its numbered STEPS (0-indexed). Return STRICT JSON only — no prose, no fences.
Schema:
{ "steps": [ { "duration_seconds": number, "tag": "hands_on"|"hands_free"|"active_heat", "station": "bench"|"hob"|"oven"|"rest", "hold_tolerance": "immediate"|"short"|"indefinite", "independent": boolean, "confidence": { "duration": "low"|"medium"|"high", "tag": "...", "station": "...", "hold_tolerance": "..." } } ],
  "prep_steps": [ { "text": string, "feeds_step": number, "duration_seconds": number, "tag": "hands_on"|"hands_free"|"active_heat", "station": "bench"|"hob"|"oven"|"rest", "hold_tolerance": "immediate"|"short"|"indefinite", "confidence": { ... } } ] }
CRITICAL: "steps" MUST have EXACTLY ONE entry per input step, in the SAME ORDER. Do not add, drop, reorder, or renumber the input steps — prep goes in "prep_steps" only.
For every input step:
- "duration_seconds" = how long it takes, in seconds. REQUIRED on EVERY step, even ones with no timer ("chop the onion" still takes time). For a range like "8–10 minutes" use the LOWER bound (480). Make a sensible estimate; never leave it out.
- "tag" = exactly one of:
  • "hands_free" — you can WALK AWAY and do something else entirely; the pan needs NOTHING from you for the duration. ONLY: simmering COVERED, braising, baking unattended, resting, dough proving, rice steaming off the heat.
  • "active_heat" — it is on heat and needs watching, stirring, turning, or adding to.
  • "hands_on" — you are working with your hands (chopping, assembling, mixing).
  ★ If a step contains MULTIPLE actions in sequence (fry, then stir in, then pour in, then add), it is NOT hands_free — no matter its total duration. Continuous involvement is the test, not length. When in doubt, choose the tag that OCCUPIES THE HANDS: a wrong "hands_free" corrupts the plan (other work gets scheduled on top of it); a wrong "hands_on" is merely slightly conservative.
  This is load-bearing — the cook page uses it to decide what can overlap. Never omit it.
- "independent" = boolean. Set TRUE only if this step uses NO output of the PREVIOUS step and could honestly be done at any time (a side salad, a garnish, rice cooked alongside the main). Otherwise leave it false — steps normally follow the one before them, and the app chains them in order.
- "station" = exactly one of "bench" (prep surface/counter), "hob" (stovetop), "oven", "rest" (cooling/resting/plating). Best guess; colour-coding only. Never omit it.
- "hold_tolerance" = how long this step's OUTPUT can sit before it degrades:
  • "immediate" — must be used/eaten straight away (plating, a finished risotto, anything fried crisp).
  • "short" — the DEFAULT for anything unclear; keeps a little while.
  • "indefinite" — genuinely keeps (a salsa verde, a cold salad, a spice mix, a dressing).
- "confidence" = your confidence per inferred field (low/medium/high).
GENERATED PREP STEPS (return in "prep_steps") — the most valuable behaviour, and the easiest to overdo:
- Create a prep step where an ingredient needs PHYSICAL WORK before it can be used: dicing, slicing, chopping, trimming, zesting, juicing, soaking, grinding, shredding, crushing.
- NEVER create one for measuring, weighing, opening a tin, or fetching something.
- MERGE prep of the same kind into ONE step: "Dice the onion, carrot and celery" is one step, not three.
- "feeds_step" = the 0-based index of the input step that first USES that prepped ingredient.
- Give each a "duration_seconds", a "tag" (almost always "hands_on"), a "station" (almost always "bench"), and a "hold_tolerance".
- UNDER-GENERATE RATHER THAN OVER-GENERATE. A missing prep step costs a few minutes of drift; an invented one costs a correction and the owner's trust. When unsure, leave it out. If nothing needs prep, return "prep_steps": [].`;

const ENUM_TAG = { type: "STRING", enum: ["hands_on", "hands_free", "active_heat"] };
const ENUM_STATION = { type: "STRING", enum: ["bench", "hob", "oven", "rest"] };
const ENUM_HOLD = { type: "STRING", enum: ["immediate", "short", "indefinite"] };
const CONF_OBJ = {
  type: "OBJECT",
  nullable: true,
  properties: { duration: CONF, tag: CONF, station: CONF, hold_tolerance: CONF },
};

export const PASS2_SCHEMA = {
  type: "OBJECT",
  properties: {
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          duration_seconds: { type: "NUMBER" },
          tag: ENUM_TAG,
          station: ENUM_STATION,
          hold_tolerance: ENUM_HOLD,
          independent: { type: "BOOLEAN", nullable: true },
          confidence: CONF_OBJ,
        },
        required: ["duration_seconds", "tag", "station", "hold_tolerance"],
      },
    },
    prep_steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          feeds_step: { type: "NUMBER" },
          duration_seconds: { type: "NUMBER" },
          tag: ENUM_TAG,
          station: ENUM_STATION,
          hold_tolerance: ENUM_HOLD,
          confidence: CONF_OBJ,
        },
        required: ["text", "feeds_step", "duration_seconds", "tag", "station", "hold_tolerance"],
      },
    },
  },
  required: ["steps"],
};
