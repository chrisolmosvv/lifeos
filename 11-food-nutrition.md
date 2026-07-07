# LifeOS — Food: Cookbook & Nutrition (build plan)

> The plan for the **next** module (the first outside the Health pillar). Plain
> English only — the owner does not read code.
> Numbered **F0–F…** (its own track, like Gym's `G`, Sleep/Body's `S`, Marty's
> `M`) so it never collides with the other tracks. This doc is the source of truth
> for every `F` piece; the locked reasons live in `03-decisions.md`, the screen
> feelings in `06-design.md`, the screen layouts in `07-ux-flows.md` (both filled
> later, at the layout layer — not yet).
> **Updated 2026-06-28** after F1 recon: the three schema questions are settled, the
> ±10% on-target band is locked, and a portion/weight table is recorded as an
> amendment (see "Settled at recon" + decisions).
> **Progress (2026-06-29): F0–F9 DONE** — logger (read+write), Cookbook, recipe import,
> and the cook→log bridge are all built + verified.
> **Full rebuild (2026-07-05): COMPLETE.** The entire Food section was rebuilt as
> vertical slices. Five core tables kept unchanged; cook layer re-architected
> event-sourced (db/39); three recipe surfaces unified into one; cookbook library
> rebuilt as a full-width register; day/week/month views rebuilt as broadsheet;
> recipe import matching fixed (stage-handoff + naming, not engine); display_name
> added (db/40). See "Food Rebuild" sections below and `03-decisions.md`.
> **NEXT: F10 (alcohol-lite).** Live per-piece status in `02-roadmap.md`.

## What this is (one paragraph)
A NEW **top-level pillar** called **Food**, with **two faces joined by a bridge** —
a **Nutrition logger** (a meal-by-meal ledger of calories + macros against
owner-set goals) and a **Cookbook** (a typographic recipe library with a cooking
mode and timers). The bridge is the soul of it: **cook a recipe and it lands in the
log**. Food data comes from **two open food databases** (Open Food Facts for
branded/EU products, USDA FoodData Central for whole foods), searched by **text**
(barcode is deferred to the mobile layer). The **one AI touch in V1** is
**recipe import** — paste a recipe's text or a URL and Gemini converts it into the
house format; because recipe text is not sensitive health data, this rides the
**free** Gemini key. Everything that would reason over the owner's actual
**intake/goals** (the agentic meal-planner, alcohol *impact* analysis) is
**deferred** to a later piece on a **paid no-training key**, so the
**"health data → paid AI"** boundary never trips in V1.

## Naming & place — Food graduates to its own pillar
- Food is a **new top-level pillar**, not a Health sub-section. Nav grows from
  **Today · Calendar · Health · Settings** to **five pillars** (exact order is a
  layout call at F4).
- **AMENDMENT to Gym G0.** G0 parked "nutrition" as a *future sub-section under the
  Health banner, no new top-level nav.* That assumption is **superseded**: a
  Cookbook is reference/library content, not health tracking, and the logger is
  rich enough to stand alone. Recorded openly here and in `03-decisions.md`; G0's
  other decisions are untouched.

## Ground rules (every `F` piece obeys these)
- **Additive only.** Food adds its **own** tables. **No** change to the
  `tasks`/`events`/`categories` spine; **no foreign key** into it (spine ids, if
  ever stored, are plain values — same rule as `marty_*`, `gym_*`, the health
  tables). **Intra-module** FKs (recipe → its ingredients/steps) are fine, same as
  `gym_*`.
- **AI boundary held.** The only V1 model call is **recipe-import parsing** —
  non-sensitive recipe text/URLs on the **free** Gemini key (reuses the existing
  `callGemini` seam untouched). **Nothing reasons over the owner's intake or goals in
  V1.** When the agentic layer lands later, it runs on a **paid no-training key**,
  and any AI line is appended **after** the model call as a fixed boundary.
- **Single user, RLS on, free tiers** — as everywhere in LifeOS.
- **Secrets stay secret.** The USDA API key (`USDA_FDC_API_KEY`) and any
  food-search/import secret live in the Supabase secret store, **never** in `src/`,
  **never** in the repo (OFF needs no key). A later Settings line shows **status
  only**.
- **Two-track boundary.** `src/` and `supabase|db/` never share a commit; each
  schema piece is its own commit, **checker-gated**.
- **Bones before skin.** Tables built to full intended shape before any UI polish.
- **Store raw, compute on read.** No derived numbers in the DB (no drift). **The one
  deliberate exception:** a logged item (incl. a cooked-recipe entry) stores a
  **macro snapshot** of what was actually eaten — because the recipe or a food's DB
  numbers can change later, and history must not be rewritten.
- **Units.** Energy in **kcal**; macros + fibre/sugar in **g**; sodium in **mg**;
  recipe times in **minutes**. Per-100g (or per-unit) is the storage basis for food
  items; serving/amount scaling is computed on read.
- **One definition of "a day."** All day-bucketing uses the shared
  Amsterdam-timezone helper (`gymDates.js` / `localYMD`) so Food agrees with Sleep,
  Body and Gym on a day.

## Locked decisions (full reasons mirrored in `03-decisions.md`)

### Scope
- **V1 = Cookbook + Nutrition logger + the cook→log bridge.** Plus a **lite alcohol
  log** (drinks count + their calories; no impact analysis).
- **Deferred:** barcode scanning (→ mobile layer); the **agentic meal-planner**
  (Thursday meal-prep flow, recipe picks, ingredient list, calendar + to-do
  injection); alcohol **impact** analysis; intake-reasoning coach hooks.

### The logger
- **Lead = a calorie figure + macros together.** Rendered as a **calorie arc with a
  macro stacked bar** beneath. Art-direction guardrail: render the arc as a **thin
  editorial hairline arc with a Fraunces numeral at its centre**, not a chunky
  app-style progress ring (stays inside *hairline rules, never boxes*). No arc/ring
  component exists in the kit (only line charts) — it's a new primitive.
- **Goals = calories + full P/C/F gram targets.** Fibre, sugar and sodium are
  **captured and shown** but **not** targeted.
- **A logged item captures seven numbers:** kcal, protein, carbs, fat, fibre,
  sugar, sodium.
- **The day reads as a meal-by-meal ledger** — **fixed 4 slots: Breakfast / Lunch /
  Dinner / Snacks**, each with a subtotal under a day total. (Snacks is one bucket
  that holds many items.)
- **Add a food three ways:** **DB search (OFF + USDA) primary**, **my saved picks**,
  and **manual** entry. **Quick-add via recents + favourites** to cut repetition.
- **History = day + week + month** — the same range-switcher pattern as the Body
  page, reused. **No streak, no adherence % in V1.** The on-target rule —
  ***all four (cal + P/C/F) within a ±10% band*** — is **locked** for when adherence
  lands later, so nothing is re-argued then.

### The cookbook
- **A recipe holds:** ingredients, steps, prep + cook times, servings. **No photos**
  in V1 — the overview is **typographic** (on-brand for the broadsheet look).
  (Import may still *stash* a source URL even though it isn't a displayed field.)
  **(Corrected 2026-07-07: steps now carry three enrichment columns from db/38 —
  `tag` (hands_on / hands_free / active_heat), `depends_on` (jsonb dependency
  array), and `step_position` on ingredients (links an ingredient to the step that
  uses it). All three are populated by the import and used by the cook companion.)**
- **Recipe macros are computed from ingredients via the food DB**, **no
  recipe-level override.** An ingredient is therefore a **structured** thing —
  `{DB match, amount, unit}` — not free text, and recipe entry reuses the same
  search as logging.
- **Overview = cards** (title, time, servings, macros/serving). The per-serving
  macros come from the calc layer.
- **Cooking mode = the full recipe on one page, timers inline.** A recipe is
  long-form, so the *desktop zero-scroll* law does **not** bind here (it governs
  the front/overview pages). **Timers: step timers + a free manual timer, allowed
  to run concurrently** (pasta + sauce at once) — a new primitive.

### The cook→log bridge
- **"Cook this" lives on the recipe page** (single entry point — no quick-log-recipe
  shortcut in V1).
- It **stages a draft you confirm**: **pick servings + meal slot** (e.g. "2 of 4 →
  Dinner"). Recipe per-serving macros × servings eaten = what lands.
- ~~At the confirm step you may text-search and swap an ingredient for the real
  product used — this cook only.~~ **(Corrected 2026-07-07: cook-only ingredient
  swap was DROPPED — see 03-decisions.md. The log entry stores the resolved
  snapshot; editing individual ingredient amounts is deferred to D2.)**

### Recipe import (the one AI touch)
- **Paste text OR a URL → AI converts to the house format.**
- The AI **auto-matches the ingredients it's confident about to the food DB and
  flags the rest**; macros are computed from those matches.
- The parsed recipe **stages on a review screen to edit before saving** (never
  saves blind).
- **If a URL won't fetch/parse, fall back to pasting the text.**

### Empty / sparse / missing states (all warm)
- **Before goals are set:** a **muted "set your targets" prompt** (the Sleep/Body
  pattern), no shouting.
- **Empty cookbook / empty day:** a warm one-line invite + the primary action.
- **An ingredient with no DB match** ("salt to taste", "1 onion"): a **curated
  portion/weight table** (common items + unit conversions cup/tbsp/tsp→g, kept
  inside the Food module) resolves it to grams where it can; off-list items fall
  back to **mark *no-macros*** (excluded from the total, shown plainly) **or**
  **enter macros by hand** — owner's choice per ingredient. *(Amendment to F0: the
  portion table is a small scope add beyond the original skip-or-manual minimum; it
  mainly serves recipe ingredients, so it lands with the Cookbook at F7.)*
- **A recipe whose macros are partly incomplete:** show the **resolved** per-serving
  macros **plus a flag** ("N ingredients unestimated") — honest, never hidden.

### Coach hooks
- **None in V1.** In-app log only. (Any intake-reasoning nudge would need the paid
  key and belongs with the deferred agentic layer.)

## Data shapes (Layer 2 — CHECKER-GATED at F1)
Additive, owner-RLS, no-spine-FK tables. **CONFIRMED at recon: exactly these five
tables** (in `db/28_food_tables.sql`) — **no goals table, no drinks table, no
recents table** (all three reuse existing shapes; see decisions). Shapes:

1. **`food_items`** — the food library / resolved-DB cache: `name` · `brand` ·
   `source` (`off` / `usda` / `manual`) · `source_ref` · per-100g (or per-unit)
   `kcal` · `protein` · `carbs` · `fat` · `fibre` · `sugar` · `sodium` ·
   serving info · `is_favourite` · timestamps. **Unique on `(source, source_ref)`**
   so a cached API item is one stable row.
2. **`food_log_entries`** — one row per logged item: `entry_date` (Amsterdam day) ·
   `meal_slot` (`breakfast`/`lunch`/`dinner`/`snacks`) · `food_item_id` *(nullable;
   intra-module)* · `recipe_id` *(nullable; intra-module)* · `amount` · `unit` ·
   the **macro snapshot** (the seven numbers actually eaten) · `entry_source`
   (`manual`/`search`/`recipe_cook`) · `is_alcohol` + `alcohol_units` *(the lite
   drink log lives here — a drink is an intake entry like any other)* · timestamps.
3. **`recipes`** — `title` · `servings` · `prep_minutes` · `cook_minutes` ·
   `source_url` *(stashed, not displayed)* · timestamps.
4. **`recipe_ingredients`** — `recipe_id` *(intra-module FK)* · `food_item_id`
   *(nullable)* · `raw_text` · `amount` · `unit` · `manual_macros` *(jsonb,
   nullable)* · `no_macros` *(bool)* · `position`.
5. **`recipe_steps`** — `recipe_id` *(intra-module FK)* · `position` · `text` ·
   `timer_seconds` *(nullable)*.
6. **Nutrition goals — REUSED, no new table (confirmed at recon).** The existing
   append-only `health_goals` log takes free-text `goal_type` and its reader
   (`resolveGoals`) is generic — newest active row per type wins — so `calories`,
   `protein`, `carbs`, `fat` each become a goal row (unit `kcal` or `g`). No clash
   with the existing weight/body_fat/lean_mass/sleep_duration/bedtime names. The
   S9 write path (`useGoalWrites` / `setGoal` / `clearGoal`) and editor/popover/toast
   are reused **verbatim**. Fibre/sugar/sodium are never targeted (no goal rows).
   "On target" is a **calc** judgment (a ±10% band), never stored.
7. **Favourites / recents — REUSED, no new table (confirmed at recon).**
   `is_favourite` is a flag on `food_items`; **recents** are derived ("most-recent
   distinct logged foods") straight off `food_log_entries`.

## The calc / derive layer (Layer 3 — a `src/` util, compute-on-read)
Derives everything shown, from raw rows, via the shared day buckets. Approved getters:
`entryMacros` · `dailyTotals` · `dayLedger` · `macroSplit` · `calorieArc` ·
`recipeMacros` · `rangeTotals`.
- **Day:** per-nutrient day totals via a **new `dailyTotals` sum-per-day primitive**
  — Body *averages* readings within a day; nutrition must *sum* them (calories add
  up), so the Body collapse can't be reused (the "looks like presentation, is
  actually calc" trap, caught at recon). Plus per-meal subtotals; **remaining vs
  goal** per macro (cal, P, C, F); over/under/within status per macro at the **±10%
  band**; alcohol `{units, kcal}`.
- **Range:** week/month averages per nutrient + the window delta/trend — **reuses**
  the Body windowing (`presetRange` / `statsForRange`) and the range-switcher UI.
- **Recipe:** `recipeMacros` → per-serving + total + an **`unestimatedCount`** for
  the "N unestimated" flag (never hide; show resolved + flag); feeds the recipe page
  and the cookbook card.
- **Helpers:** recents (distinct recently-logged foods); favourites; drinks count +
  alcohol kcal for the day/week.
Verified against **real** data **before** any screen reads it (a prep commit, F3) —
recipe macros verify against a real entered recipe; day/range totals verify fully
once writes exist at F6 (stated honestly, not fake-greened on synthetic data).

## Screens (Layers 4–6 — NOT designed yet)
Recorded here only as structure; the zone inventory and layouts come later:
- **Food pillar — lands on the Log; a `Log | Cookbook` tab toggle** within the
  pillar (Log default).
- **Log front:** calorie arc + macro stacked bar; the meal ledger (B/L/D/Snacks)
  with subtotals + day total; date nav; the day/week/month range switcher;
  set-targets prompt when no goals.
- **Add-food flow:** search (OFF+USDA) + saved picks + manual; recents + favourites.
- **Goals editor:** a Popover (reuse the S9 pattern), cal + P/C/F.
- **Cookbook:** cards (title, time, servings, macros/serving).
- **Recipe page:** full recipe, ingredients (resolved/flagged macros), steps with
  inline timers, **"Cook this"**.
- **Cooking:** full recipe one page; inline step timers + a free manual timer
  (concurrent).
- **Cook→log draft:** servings + slot + optional per-ingredient swap.
- **Recipe create/edit** and **Recipe import → review screen**.

## Food-search Edge Function (F2 — the dependency both halves rest on)
- **One internal record:** `{ source, source_ref, name, brand, serving:{grams,label},
  per100g:{kcal,protein,carbs,fat,fibre,sugar,sodium} }`. OFF + USDA results
  normalise into this single shape.
- **Keys:** OFF needs none; USDA uses `USDA_FDC_API_KEY` (owner-supplied, secret
  store).
- **`verify_jwt = true`** here — the **app calls it as the logged-in owner** (the
  first-ever app→Edge-Function call; the opposite of `health-ingest`). Pinned
  explicitly in `config.toml`.
- **Caching:** search `food_items` first; after a live API hit, save the chosen item
  into `food_items` (unique on `source, source_ref`) so logging links to a stable
  row and repeats skip the API.

## File layout (mirrors `src/health/` house style; every file < ~250 lines)
```
src/food/
  foodLoad.js     — FETCH ONLY (the 5 tables; reuses fetchGoals)
  foodCalc.js     — pure logger/day calc (entryMacros, dailyTotals, dayLedger, macroSplit, calorieArc, rangeTotals)
  recipeCalc.js   — pure recipe macros + completeness (recipeMacros)
  portions.js     — curated "1 onion → g" + unit conversions          [F7]
  foodWrite.js    — WRITE path (add/edit/remove/recipe)               [F6+]
  foodFormat.js   — number/label formatting
  FoodPage.jsx    — pillar shell + Log | Cookbook tabs                [F4]
  LogPage.jsx     — arc + macro bar + ledger + range switch           [F5]
  CalorieArc.jsx  — the new editorial hairline arc                    [F5]
  MealLedger / AddFood / FoodSearch / ManualEntry                     [F5–F6]
  Cookbook / RecipePage / CookingMode / Timer / RecipeEditor          [F7]
supabase/functions/food-search/  — OFF + USDA → one shape             [F2]
db/28_food_tables.sql            — the 5 tables                       [F1]
```

## Build order (`F`-track, risk-ordered — safest first)
- **F0 — Paperwork.** This doc + `02`/`03` updates. No code.
- **F1 — The tables.** The 5 tables above, **CHECKER-GATED, own `db/` commit**
  (`db/28_food_tables.sql`): "checker approved" → owner runs the SQL on Frankfurt →
  owner confirms it live, BEFORE any `src/`.
- **F2 — Food-search Edge Function.** OFF + USDA → one normalised shape; `verify_jwt`
  pinned in `config.toml`; key in the secret store; caching via `food_items`. Owner
  verifies a real search returns sane macros on the phone.
- **F3 — The calc layer** (compute-on-read). Recipe macros verified vs a **real**
  entered recipe; day/range totals fully verify once writes exist at F6 (said so,
  not fake-greened).
- **F4 — Pillar scaffold** (read-only, lowest risk): the 5th nav pillar + `Log |
  Cookbook` tabs + frame + spinner + back + empty placeholders. Ship + verify alone.
- **F5 — Logger front page** (read): the editorial calorie arc + macro bar + meal
  ledger + day/week/month range switcher + the muted set-targets prompt.
- **F6 — Logging WRITES** (the first write): add-food (search/saved/manual) + the
  goals editor (reuse S9) + recents/favourites. **Wire ONE food end-to-end first.**
- **F7 — Cookbook**: cards + recipe page + cooking mode (concurrent timers) + recipe
  create/edit + the curated portion/weight table (`portions.js`).
- **F8 — Recipe import** (the AI piece): paste/URL → server-side fetch → Gemini →
  auto-match + flag → review → save; URL-fail falls back to paste.
- **F9 — Cook→log bridge**: "Log this meal" → inline staging (servings/slot + live
  preview) → log a frozen macro snapshot + `recipes.last_cooked_at`. *(Cook-only swap
  DROPPED at build — log then edit; see decisions.)*
- **F10 — Alcohol-lite**: drinks (units + kcal), daily/weekly count.
- **F11 — Polish + audit** to the three design laws; dead-code sweep.

## Settled at recon (were open at F0)
- **Schema = exactly 5 tables; goals/drinks/recents all REUSE existing shapes.** The
  three F1-recon questions are closed (see Data shapes + decisions).
- **Ingredient→weight = a curated portion table** (F7); skip-or-manual is the
  fallback for off-list items. *(Amendment to F0.)*
- **On-target band = ±10%** (for the deferred adherence piece).
- **USDA key = owner-supplied**, stored as `USDA_FDC_API_KEY`.

## Still open (to settle at the right layer)
- **Nav order of the five pillars.** — **F4 layout.**

---

## Food Rebuild — current truth (2026-07-05)

### Schema changes (three; five core tables kept unchanged)
- **db/39 — event-sourced cook schema** (checker-approved). `cook_session` (thin header:
  recipe_id, status active/done/abandoned, timestamps) + `cook_event` (append-only log:
  event_type, target_ref, payload, created_at — no updated_at, events are immutable). State
  derived by replay; timers survive reload (wall-clock computation). **Replaced db/34.**
- **db/40 — `food_items.display_name`** (checker-approved). Nullable text; when set, the UI
  shows it instead of the raw API `name`. Auto-cleaned on first cache (timid: casing/whitespace
  only); owner can override via ✎ in the recipe editor.
- **db/41 — `cook_event.event_type` CHECK widened** (checker-approved, corrected 2026-07-07).
  Added `ingredient_used` to the allowed values (strict superset — no existing data invalidated).
  Splits cooking mark-used from shopping-tick (`ingredient_ticked`). Module table only.

### Surfaces (current — corrected 2026-07-07)
- **Cook companion "Hero + Rail"** (CookCompanion.jsx + CookHero + CookRail + CookTimer +
  AlarmOverlay + RecipeOverview + cook.css + cookOverview.css). One big Fraunces directive (the
  Hero = the active step) + a rail (Parked = passive steps with live countdowns; Not yet =
  upcoming). Cooking ↔ Recipe mode toggle. The old linear CookMode.jsx is deleted (prove-dead).
  Active/passive split from `recipe_steps.tag`; timers with ±1 min + dismiss-required alarm
  (Web Audio two-tone beep); servings stepper + "Log this cook" via logSnapshot.
- **Cookbook library = full-width register** (CookbookRegister.jsx). Ruled index, sortable
  columns, hover-unfurl detail, filters (Recipes/Meals/Favourites).
- **Day view** — full broadsheet rebuild. Two-column full-width: calorie ring + meal-segmented
  macro rings (ink shades, not hues) + sticky column; meal ledger on right.
- **Week + Month views** — consistency-focused. Full-width, one horizontal top band (avg kcal
  lead + P/C/F averages + per-goal on-target counts + mini week-bar/sparkline). Four macro
  charts in 2×2 grid. **Honesty rule:** all averages/ratios count logged days only; unlogged
  days are gaps, not zeros. Sparse state (< 2 logged days) shows a calm "not enough yet"
  message, no fake stats.

### Recipe import & matching (fixed — the engine was sound)
The matching logic is correct; failures were stage-handoff bugs:
- **Suppressed-staple bug:** import now uses results[0] when the finder suppresses alternatives.
- **Null-unit → items:** null unit + known item weight → items; unknown → honest flag.
- **Count-word units:** clove/s, large/medium/small, piece/s, etc. → item resolution.
- **Density classes:** vegetable (~150g/cup), spice (~2g/tsp) added.
- **Rate-limit batching:** 6-at-a-time with 1.2s gaps (Gemini free-tier 15 req/min).
- **Reranker:** soft-prefers English-language entries; deterministic fallback intact.
- **Label cleanup:** `cleanLabel()` strips malformed punctuation from raw_text only.

### Key files (corrected 2026-07-07)
- Cook companion: `CookCompanion.jsx`, `CookHero.jsx`, `CookRail.jsx`, `CookTimer.jsx`,
  `AlarmOverlay.jsx`, `RecipeOverview.jsx`, `cook.css`, `cookOverview.css`, `cookAlarm.js`.
- Cook engine: `cookReplay.js`, `cookEventStore.js`, `useCookEvents.js`.
- Dormant scheduler (for future parallel lanes): `cookLanes.js`, `cookSchedule.js`.
- Cookbook: `CookbookRegister.jsx`, `register.css`.
- Day view: `CalorieArc.jsx`, `MacroRings.jsx`, `DayView.jsx`, `LoggerMasthead.jsx`.
- Week/Month: `WeekMonthView.jsx`, `foodCalc.js` (`perGoalHits`).
- Import/match: `importClient.js`, `portions.js`, `cleanName.js`; Edge:
  `food-search/rerank.ts`, `recipe-import/index.ts`, `food-search/saved.ts`.

---

## → Paste block for `02-roadmap.md`

```
## 🍎 Track F — Food: Cookbook & Nutrition   ← NEW (full plan: 11-food-nutrition.md)

The first pillar outside Health. A Nutrition logger (meal-by-meal cal+macro ledger
vs owner-set goals) + a typographic Cookbook (recipe library, cooking mode, timers),
joined by a cook→log bridge. Food data from Open Food Facts + USDA by text search
(barcode deferred to mobile). One AI touch — recipe import — on the FREE Gemini key
(recipe text isn't sensitive). Intake-reasoning (agentic meal-planner, alcohol
impact) deferred to a paid no-training key. Additive tables, RLS, free-tier,
two-track. AMENDS Gym G0: Food is its own top-level pillar, not a Health sub-section.

- 🔨 F0 — Paperwork (this plan + 02/03). No code.  ← IN PROGRESS
- ⬜ F1 — Tables: 5 ONLY (food_items, food_log_entries, recipes, recipe_ingredients,
       recipe_steps) in db/28_food_tables.sql. Goals reuse health_goals; drinks =
       is_alcohol+alcohol_units flag; favourites = is_favourite flag; recents derived.
       No new goals/drinks/recents tables. CHECKER-GATED, own commit.
- ⬜ F2 — food-search Edge Function (OFF + USDA → one shape; verify_jwt=true; cache via food_items).
- ⬜ F3 — Calc layer (compute-on-read; recipe verified now, day/range at F6).
- ⬜ F4 — Pillar scaffold: 5th nav pillar + Log|Cookbook tabs + frame + empty states (read-only).
- ⬜ F5 — Logger front page (read): editorial calorie arc + macro bar + meal ledger + day/week/month.
- ⬜ F6 — Logging WRITES: add-food (search/saved/manual) + goals editor (reuse S9) + recents/favourites.
- ⬜ F7 — Cookbook: cards + recipe page + cooking mode (timers) + editor + portion/weight table.
- ⬜ F8 — Recipe import (AI): paste/URL → fetch → Gemini → auto-match + flag → review → save.
- ⬜ F9 — Cook→log bridge: "Cook this" → staged draft (servings/slot/swap) → log snapshot.
- ⬜ F10 — Alcohol-lite: drinks (units + kcal), daily/weekly count.
- ⬜ F11 — Polish + audit to the design laws.

OPEN: F2 — OFF/USDA rate limits + caching in practice.   F4 — nav order of the five pillars.
SETTLED AT RECON: 5 tables only; goals/drinks/recents reuse; ±10% on-target band;
      portion table for ingredient→weight (F7, an F0 amendment); USDA_FDC_API_KEY owner-supplied.
```

## → Paste block for `03-decisions.md`

```
## Food — Cookbook & Nutrition — F0: the locked plan (2026-06-28)

- **Food is its own TOP-LEVEL PILLAR (AMENDS Gym G0).** G0 parked nutrition as a
  future Health sub-section; that is superseded. **Why:** a Cookbook is library
  content, not health tracking, and the logger stands alone. **Trade-off:** a fifth
  nav pillar (order set at F4); G0's other decisions are untouched.
- **V1 scope = Cookbook + Nutrition logger + cook→log bridge + lite alcohol log.**
  **Why:** the integration (cook a meal → it logs) is the module's soul. **Trade-off:**
  barcode (→ mobile), the agentic meal-planner, and alcohol impact analysis are deferred.
- **AI boundary = recipe import only, on the FREE key.** Recipe text/URLs aren't
  sensitive health data. **Why:** keeps import useful without tripping the
  "health data → paid AI" rule. **Trade-off:** nothing reasons over intake in V1; the
  agentic layer waits for a paid no-training key.
- **Logger lead = calorie arc + macro stacked bar; goals = cal + P/C/F grams.**
  Fibre/sugar/sodium captured + shown, not targeted. **Why:** one calm glance at the
  four things that matter. **Trade-off:** the arc renders as a hairline editorial arc,
  not a chunky ring (stays on-brand; a new kit primitive).
- **Day = fixed meal ledger (B/L/D/Snacks); history = day/week/month.** Reuses the
  Body range-switcher UI + windowing, but the day collapse is a NEW sum-per-day
  primitive (dailyTotals) — nutrition sums where Body averages. **No streak/adherence
  in V1**, but "all four within a ±10% band" is the locked on-target rule for later.
  **Why:** familiar, calm, no new pattern; the band is decided once. **Trade-off:** none.
- **Add food = DB search (OFF + USDA) + saved picks + manual; quick-add recents +
  favourites.** **Why:** best coverage for NL groceries (OFF branded) + whole foods
  (USDA) with low repetition. **Trade-off:** the food-search function must normalise
  two schemas into one shape — the build's centre of gravity. It's the first-ever
  app→Edge-Function call (verify_jwt=true, called as the owner).
- **Recipe = ingredients + steps + times + servings; macros computed from ingredients
  via the food DB, no recipe-level override.** No tags/photos (typographic). **Why:**
  one source of truth for a recipe's numbers; on-brand overview. **Trade-off:**
  ingredients are structured {match, amount, unit}; unmatchable ones need a path.
- **Ingredient→weight = a curated portion table (AMENDMENT to F0).** Common items +
  unit conversions (cup/tbsp/tsp→g) inside the Food module resolve "1 onion" to grams;
  off-list items fall back to skip-or-manual. Lands at F7 with the Cookbook. **Why:**
  most recipes use household measures; pure skip-or-manual would leave too many recipes
  unestimated. **Trade-off:** a little more work than the F0 minimum — accepted, scoped
  small + curated.
- **Cooking mode = full recipe on one page, inline step timers + a free manual timer
  (concurrent).** Zero-scroll doesn't bind a long-form recipe. **Why:** calm wins;
  cooking needs >1 timer. **Trade-off:** none.
- **Cook→log = "Cook this" → staged draft (servings + slot), optional cook-only
  ingredient swap; logs a macro SNAPSHOT.** **Why:** nothing writes blind; history
  isn't rewritten by later recipe edits. **Trade-off:** a per-ingredient swap UI in
  the confirm step.
- **Recipe import = paste text/URL → Gemini extracts → auto-match confident
  ingredients, flag the rest → review screen → save; URL fail falls back to paste.**
  **Why:** accuracy is protected by a confirm step; graceful degradation. **Trade-off:**
  URL import needs a server-side fetch before Gemini.
- **Warm sparse states.** No goals → muted "set targets" prompt (S9 pattern);
  unmatchable ingredient → portion table, then skip-with-note or manual; incomplete
  recipe → show resolved macros + "N unestimated" flag. **Why:** the warm-edge-state
  law (Gym G16). **Trade-off:** none.
- **No coach hooks in V1.** **Why:** intake-reasoning needs the paid key. **Trade-off:**
  the proactive layer waits for the agentic piece.
- **Schema = 5 tables only; goals + drinks + favourites/recents REUSE, no new tables
  (CONFIRMED at recon).** Goals → health_goals (free-text goal_type + generic
  resolveGoals + the S9 write path, verbatim); drinks → is_alcohol + alcohol_units on
  food_log_entries (one ledger, one day-total); favourites → is_favourite on
  food_items; recents → derived from the log. **Why:** a drink is an intake entry like
  any other; duplicating truth into side tables invites drift; the goals shape already
  fits. **Trade-off:** none.
```
