# Food Module — Phase 0 Recon Inventory

> Written 2026-07-05. This is a read-only characterisation of what exists today.
> Nothing was changed. Carry this to the Planner session before any build begins.

---

## A. Live Schema

Six food-related tables exist, plus three additive columns on `recipe_steps` /
`recipe_ingredients`. All are owner-only RLS (four policies per table: select /
insert / update / delete, `auth.uid() = user_id`). None have foreign keys INTO
the spine (tasks / events / categories). All user_id columns reference
`auth.users(id) ON DELETE CASCADE`.

### 1. `food_items` — the food library / cache

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid PK | not null | gen_random_uuid() |
| user_id | uuid FK→auth.users | not null | default auth.uid() |
| name | text | not null | |
| brand | text | YES | |
| source | text | not null | CHECK in ('off','usda','manual') |
| source_ref | text | YES | |
| kcal, protein, carbs, fat, fibre, sugar, sodium | numeric | YES each | per-100g |
| serving_grams | numeric | YES | |
| serving_label | text | YES | |
| is_favourite | boolean | not null | default false |
| created_at | timestamptz | not null | default now() |
| updated_at | timestamptz | not null | default now() |

- **UNIQUE constraint**: `(user_id, source, source_ref)` — one cached row per food per owner.
- **Indexes**: `(user_id, name)`, `(user_id, is_favourite)`.
- **Triggers**: none.
- **updated_at**: YES, exists.

### 2. `food_log_entries` — the day ledger

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid PK | not null | gen_random_uuid() |
| user_id | uuid FK→auth.users | not null | default auth.uid() |
| entry_date | date | not null | Amsterdam day, set by client |
| meal_slot | text | not null | CHECK in ('breakfast','lunch','dinner','snacks') |
| food_item_id | uuid FK→food_items | YES | SET NULL on delete |
| recipe_id | uuid FK→recipes | YES | SET NULL on delete |
| amount | numeric | YES | |
| unit | text | YES | |
| kcal, protein, carbs, fat, fibre, sugar, sodium | numeric | YES each | SNAPSHOT (frozen at write) |
| entry_source | text | not null | CHECK in ('manual','search','recipe_cook') |
| is_alcohol | boolean | not null | default false |
| alcohol_units | numeric | YES | |
| is_estimated | boolean | — | Pre-existing (found live before V2 P0); marks AI-estimated meals |
| entry_label | text | YES | db/33 — display name for FK-less estimate entries |
| created_at | timestamptz | not null | default now() |
| updated_at | timestamptz | not null | default now() |

- **Indexes**: `(user_id, entry_date DESC)`, `(user_id, created_at DESC)`, `(recipe_id)`.
- **updated_at**: YES.

### 3. `recipes`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid PK | not null | |
| user_id | uuid FK→auth.users | not null | |
| title | text | not null | |
| servings | integer | YES | |
| prep_minutes | integer | YES | |
| cook_minutes | integer | YES | |
| source_url | text | YES | stashed by import, not displayed |
| is_favourite | boolean | not null | default false (db/31) |
| created_at | timestamptz | not null | |
| updated_at | timestamptz | not null | |

- `last_cooked_at` was **DROPPED** (db/35) — now computed on read.
- **Indexes**: `(user_id, created_at DESC)`.
- **updated_at**: YES.

### 4. `recipe_ingredients`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid PK | not null | |
| user_id | uuid FK→auth.users | not null | |
| recipe_id | uuid FK→recipes | not null | CASCADE on delete |
| food_item_id | uuid FK→food_items | YES | SET NULL on delete |
| raw_text | text | YES | |
| amount | numeric | YES | |
| unit | text | YES | |
| manual_macros | jsonb | YES | hand-entered 7-number object |
| no_macros | boolean | not null | default false |
| position | integer | YES | |
| step_position | smallint | YES | (db/38) links ingredient to step by position |
| created_at | timestamptz | not null | |

- **Indexes**: `(recipe_id, position)`.
- **updated_at**: NO — this table has NO updated_at column.

### 5. `recipe_steps`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid PK | not null | |
| user_id | uuid FK→auth.users | not null | |
| recipe_id | uuid FK→recipes | not null | CASCADE on delete |
| position | integer | YES | |
| text | text | not null | |
| timer_seconds | integer | YES | |
| tag | text | YES | CHECK in ('hands_on','hands_free','active_heat') — db/38 |
| depends_on | jsonb | YES | array of predecessor position ints — db/38 |
| created_at | timestamptz | not null | |

- **Indexes**: `(recipe_id, position)`.
- **updated_at**: NO.

### 6. `cook_session` (db/34) — resume-a-cook persistence

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid PK | not null | |
| user_id | uuid FK→auth.users | not null | |
| recipe_id | uuid FK→recipes | YES | CASCADE on delete |
| struck_steps | jsonb | not null | default '[]' |
| ticked_ingredients | jsonb | not null | default '[]' |
| timer_ends | jsonb | not null | default '{}' — absolute ISO end timestamps |
| board_states | jsonb | not null | default '{}' — `{"stepIdx": "waiting"|"active"|"done"}` |
| status | text | not null | default 'active', CHECK in ('active','done') |
| dismissed | boolean | not null | default false |
| created_at | timestamptz | not null | |
| updated_at | timestamptz | not null | |

- **Indexes**: `(user_id, recipe_id, status)`.
- **updated_at**: YES (stamped explicitly by the JS write path, no trigger).

### Nutrition goals — no food-specific table

Goals reuse `health_goals` (the existing append-only log with free-text `goal_type`).
Types used: `calories`, `protein`, `carbs`, `fat`. Read via `resolveGoals` (newest
active row per type wins); written via `useGoalWrites`. No food-specific schema.

### Spine leakage check

**None.** No FK points into `categories`, `tasks`, or `events`. No food table stores
a category_id or task_id. The cook-session and recipe-import flows write only to food
tables. This is clean.

---

## B. Every UI Surface

### The Logger

| File | What it does | Status |
|------|-------------|--------|
| `FoodPage.jsx` | The pillar shell — Log / Cookbook tab toggle + ResumeCookBanner above. Lands on Log. | Finished |
| `LogPage.jsx` | The log orchestrator — loads entries + goals + myFoods + cookbook; hosts day/week/month switching, the Finder, EditEntryPanel, EstimateMealPanel, LogMealSheet, NutritionGoalsEditor | Finished |
| `LoggerMasthead.jsx` | Day/Week/Month range tabs + date nav arrows + "Today" jump | Finished |
| `DayView.jsx` | Day detail: calorie arc + macro bar + meal ledger + quick-add strip | Finished |
| `CalorieArc.jsx` | The editorial hairline SVG arc (consumed/goal fraction) | Finished |
| `MacroBar.jsx` | Stacked P/C/F bar beneath the arc | Finished |
| `MealLedger.jsx` | The B/L/D/Snacks meal-by-meal ledger rows + per-slot subtotals | Finished |
| `QuickAddStrip.jsx` | Horizontal chips: recent meals + fav meals + fav foods — one-tap re-log | Finished |
| `WeekMonthView.jsx` | 7-day or 30-day bar chart (FoodBarChart) + per-day drill-down | Finished |
| `FoodBarChart.jsx` | Vertical bar chart for week/month ranges | Finished |
| `SummaryStrip.jsx` | Inline average-per-day figures on the range view | Finished |
| `EditEntryPanel.jsx` | Edit/delete/swap a logged entry | Finished |
| `EstimateMealPanel.jsx` | Feature-B: type a meal description → AI estimate → confirm/adjust → log | Finished |
| `ManualForm.jsx` | Create a reusable manual food_items row (7-number entry) | Finished |
| `ManualMacrosPanel.jsx` | Quick macro-per-ingredient panel for recipe editor rescue | Finished |
| `NutritionGoalsEditor.jsx` | Set cal/P/C/F targets (reuses the S9 goal pattern) | Finished |
| `SaveAsMealPanel.jsx` | Feature-A: tick food entries → save as a stepless "meal" recipe | Finished |
| `LogMealSheet.jsx` | "How many servings?" + slot picker bottom-sheet (cook→log + meal re-log) | Finished |

### The Finder (Food Search)

| File | What it does | Status |
|------|-------------|--------|
| `finder/Finder.jsx` | The converged search/pick/amount modal — context-switched by config | Finished |
| `finder/FinderResults.jsx` | Renders zoned results: Basics → DB top-3 → more | Finished |
| `finder/FinderRow.jsx` | One search result row (name, brand, kcal) | Finished |
| `finder/FinderAmount.jsx` | Amount + unit picker step after picking a food | Finished |
| `finder/finderConfig.js` | Logger vs recipe context configs (units, hatches) | Finished |

### The Cookbook

| File | What it does | Status |
|------|-------------|--------|
| `Cookbook.jsx` | Library orchestrator — grid/list, search, filter (All/Recipes/Meals), sort (Added/Cooked/A–Z/Fav), ★ | Finished |
| `CookbookToolbar.jsx` | Sort/filter/view-mode/search/import/new controls | Finished |
| `RecipeCard.jsx` | Grid card (title, time, servings, macros/serving, ★, kind badge) | Finished |
| `RecipeListRow.jsx` | List row variant | Finished |
| `RecipePage.jsx` | Recipe page — the orchestrator: decides broadsheet (default) vs classic, hosts CookPage + LogMealSheet + DoneCookCard | Finished |
| `RecipeEditor.jsx` | Create/edit recipe (title, servings, times, ingredients, steps) | Finished |
| `RecipeActionBar.jsx` | Type-aware bottom bar: Cook / Log / Edit (per recipeKind) | Finished |
| `ImportScreen.jsx` | Paste text or URL → Import → review in editor | Finished |

### The Broadsheet (the new recipe surface — DEFAULT for kind="recipe")

| File | What it does | Status |
|------|-------------|--------|
| `BroadsheetRecipe.jsx` | The three-column cockpit: masthead + (ingredients | method | timing); fixed-frame, each column scrolls independently with a fade-cue; calls `useBroadsheetCook` for the interactive layer | Finished |
| `BroadsheetMasthead.jsx` | Fraunces title + dateline + back + Edit/Log/Cook/★/Delete actions | Finished |
| `BroadsheetIngredients.jsx` | Left column: flat ⇄ grouped-by-step toggle; ingredient lines are tickable (click toggles strikethrough) | Finished |
| `BroadsheetSteps.jsx` | Centre column: Fraunces numerals + step text (Inter body) + per-step activity tag labels + inline duration + "▸ MEANWHILE" marker for concurrent steps; each step is tappable to cycle state (waiting→active→done) | Finished |
| `BroadsheetTiming.jsx` | Right column: calm text — "Ready in ~X min" + "mostly a Y min [verb]" + parallel headline when applicable. No chart/lanes/ruler. | Finished |
| `broadsheet.css` | The full broadsheet styling — hairline rules, Fraunces serif, Inter body, paper-fade scroll cues, collapsible side panels, responsive phone stacking | Finished |
| `useBroadsheetCook.js` | The hook composing useCookSession + cook actions for the broadsheet; lazy-start (session created on first action, not on browse) | Finished |

### The Cook Page (the kanban-based cook surface)

| File | What it does | Status |
|------|-------------|--------|
| `CookPage.jsx` | The full cook page: kanban board + tickable ingredients + step list + manual timer + running timers with TimerRing; persists via useCookSession; wake-lock; "Done cooking" exits to staging | Finished |
| `KanbanBoard.jsx` | Three columns (Waiting / Active / Done) — cards cycle on tap, with schedule "start now" cues | Finished |
| `TimerRing.jsx` | SVG ring countdown (remaining/total fraction) | Finished |
| `cookmode.css` | Cook page styling | Finished |

### Session-Surfacing UI

| File | What it does | Status |
|------|-------------|--------|
| `ResumeCookBanner.jsx` | A calm one-line bar above the Food tabs when any active cook_session exists; tap resumes | Finished |
| `DoneCookCard.jsx` | Card on the recipe page after a cook is done: "Log it" / "Dismiss" | Finished |
| `cookSessionContext.jsx` | Global React context: "is there an active cook?" — fetches + listens for 'lifeos:cook-session-change' events | Finished |
| `EditionHeader.jsx` (in `src/`) | The nav header shows a **cook-session live marker** (terracotta dot + elapsed clock) when an active session exists; popover offers Open + Finish; Finish deep-links to Food with staging sheet open | Finished |

---

## C. Every Calc/Getter

### `foodCalc.js` — logger/day calc (pure)

| Function | Computes | Edge-case guards |
|----------|----------|-----------------|
| `slotForHour(h)` | Amsterdam clock hour → meal slot | Hard ranges, no gaps |
| `entryMacros(item, amount, unit)` | per-100g × grams → 7 numbers (the snapshot at write time) | **Negative clamp** (max 0); null per-100g → null out; unresolved unit → all null |
| `dailyTotals(entries)` | Sum per entry_date → one row per day | null macro → treated as 0 in sum; missing entry_date → skipped |
| `dayLedger(entries, goalMap, {day})` | Slot subtotals + total + alcohol + vs-goal for one day | No goal / zero target → null (no divide-by-zero); missing goalMap → hasGoals false |
| `vsGoal(actual, target, band)` | ±10% on-target check | Null or zero target → null (never NaN) |
| `macroSplit(macros)` | P/C/F Atwater-factor calorie fractions (0–1) | All-zero → {0,0,0} (never NaN) |
| `calorieArc(kcal, goalKcal)` | Consumed vs goal → fraction (0–1) + over/remaining | No/zero goal → fraction null; fraction clamped [0,1] |
| `recentMealsFrom(entries, limit)` | Distinct recipe_cook recipe_ids, newest first | Only recipe_cook entries; deduped by recipe_id |
| `rangeTotals(daily, days, {end})` | Week/month average per nutrient (logged days only) | Reuses Body's statsForRange; gap days excluded from average |
| `rangeAdherence(daily, goalMap, {start, end, today})` | Days on-target / total calendar days in window | No future days; no pre-data days; unlogged days count against |

### `recipeCalc.js` — recipe macros (pure)

| Function | Computes | Edge-case guards |
|----------|----------|-----------------|
| `recipeKind(recipe)` | "draft" / "meal" / "recipe" from ingredient + step counts | Missing arrays → draft |
| `lastCookedFor(recipe, entries)` | MAX(entry_date) of recipe_cook entries for a recipe | Gated on kind=recipe; lexical string max (no Date parsing) |
| `recipeMacros(ingredients, servings, itemsById)` | total + perServing + unestimatedCount | servings ≤ 0 → perServing = total; negative clamp per ingredient; null kcal → unestimated |

### `cookSchedule.js` — step timing (pure)

| Function | Computes | Edge-case guards |
|----------|----------|-----------------|
| `cookSchedule(steps)` | Per-step { startOffset, endOffset, duration } + total finish | No deps → sequential (no fabricated overlaps); with deps → critical-path back-calc with cycle guard |

### `cookLanes.js` — parallel lane assignment (pure)

| Function | Computes | Edge-case guards |
|----------|----------|-----------------|
| `assignLanes(steps)` | Lane number per step + laneCount + mergeSteps set | No deps → each step gets own lane; cycle → falls through |

### `cookTimers.js` — duration parser (pure)

| Function | Computes | Edge-case guards |
|----------|----------|-----------------|
| `parseDuration(text)` | Extract seconds from step text ("10 min", ranges) | Range → lower bound; no match → null; ≤0 → null |
| `fmtClock(total)` | Seconds → "M:SS" or "H:MM:SS" | Clamps to ≥0 |

### `portions.js` — household unit → grams (pure)

| Function | Computes | Edge-case guards |
|----------|----------|-----------------|
| `unitOptionsFor(name)` | Which units to offer for a food | Always includes g; adds "item" when name matches a whole item |
| `resolvePortion(name, amount, unit)` | Grams from household amounts | Unknown unit/food → null (falls to "unestimated") |

### `foodFormat.js` — display formatting (pure)

Formats numbers for display (rounding, units). No edge-case logic beyond null → "—".

### `foodShape.js` — data shape helpers

Candidate normalisation for the finder (per100g / serving / food_item_id plumbing).

---

## D. The Finder + External APIs

### Edge Function: `food-search`

- **Location**: `supabase/functions/food-search/` (6 files: index.ts, normalize.ts, off.ts, usda.ts, saved.ts, rerank.ts)
- **verify_jwt**: TRUE (pinned in config.toml)
- **What it does**: Takes `{ query }` → searches three sources in parallel (owner's saved food_items, Open Food Facts, USDA) → merges/dedupes into one ordered list → optionally asks Gemini for a top-3 rerank → returns `{ results, top3, dbSuppressed, note, sources, debug }`.
- **Secrets used**: `USDA_FDC_API_KEY` (owner-supplied; absent → USDA simply unavailable), `OFF_CONTACT_EMAIL` (for OFF User-Agent; optional), `GEMINI_API_KEY` (for the reranker).
- **External APIs**:
  - **Open Food Facts** — `https://search.openfoodfacts.org/search?q=…` (the modern search-a-licious endpoint; no key needed; 5s timeout)
  - **USDA FoodData Central** — `https://api.nal.usda.gov/fdc/v1/foods/search` (POST; whole-food types only: Foundation, SR Legacy, Survey; 8s timeout)
- **Quirks already worked around**:
  - OFF's legacy endpoint (cgi/search.pl) returns 503 chronically → uses the newer search-a-licious.
  - OFF's `brands` field is an array in the new endpoint (was a comma string).
  - OFF sodium is in grams → converted ×1000 to mg; salt → sodium via ÷2.5.
  - OFF spells fibre as "fiber_100g" and it's frequently absent → null.
  - USDA uses `nutrientId` (ints), NOT `nutrientNumber` (strings) — matching the wrong field was the F2 bug that nulled all macros.
  - USDA encodes parens in URL params wrong → uses POST body instead.
  - USDA timeout bumped to 8s (Frankfurt→US is slow; 5s intermittently aborted).
  - A "confident staple" (a Basics seed food whose name starts with the query) **suppresses** the Gemini rerank entirely (saves quota).
  - Any single source failing → graceful degradation (the others still return).

### Reachability

I did NOT fire an OPTIONS request to verify the functions are currently deployed (the task says read-only, no writes/calls to the live system). Based on the code and config, all three functions (`food-search`, `recipe-import`, `meal-estimate`) are configured correctly with verify_jwt=true and CORS headers.

---

## E. Every AI Path

### 1. Gemini Reranker (in `food-search/rerank.ts`)

- **What**: Given merged search results, asks Gemini for the 3 most-relevant indices (everyday product over obscure/branded noise).
- **Edge Function**: `food-search` (called within the same invocation).
- **Kill-switch**: `FOOD_RERANK_OFF=1` → returns null → deterministic order stands.
- **Fallback**: ANY failure (rate limit, parse error, out-of-range indices) → returns null → the Basics → saved → OFF → USDA order is used unchanged.
- **Reasons over intake/goals**: NO. Only sees `{name, brand, kcal}` per candidate.

### 2. Recipe Import Parser (in `recipe-import/index.ts`)

- **What**: Text/URL → Gemini extracts structured recipe JSON (title, servings, times, ingredients with amounts + step linkage, steps with duration + tag + dependencies).
- **Edge Function**: `recipe-import`.
- **Kill-switch**: None explicit — but the parse is human-confirmed (the editor is the review screen).
- **Fallback**: Gemini failure → `{ ok:false, error:"parse_fail" }` → the import screen keeps the typed text and tells the owner "couldn't read a recipe."
- **Reasons over intake/goals**: NO. Only sees recipe text/URL content.

### 3. Meal Macro Estimator (in `meal-estimate/index.ts`)

- **What**: A typed meal description ("chicken burrito") → Gemini → `{kcal, protein, carbs, fat}` ballpark.
- **Edge Function**: `meal-estimate`.
- **Kill-switch**: `MEAL_ESTIMATE_OFF` → `{ ok:false }` → the panel opens as a manual 4-number form.
- **Fallback**: ANY failure (quota, transport, kill-switch) → the panel stays manual entry. An estimate never hard-stops.
- **Reasons over intake/goals**: NO. Only sees the typed description. Never receives logged data, health targets, or history.

### 4. Import Auto-Match (client-side, in `importClient.js`)

- **What**: After the recipe-import Edge Function returns, each parsed ingredient is searched via `food-search` (which itself may call the reranker). The reranker's top pick is used as the auto-match.
- **Edge Function**: reuses `food-search` per ingredient (parallel).
- **Fallback**: Search failure or no top3 → ingredient is flagged (no food_item_id) → fixable in the editor. Import always completes.
- **Reasons over intake/goals**: NO.

### Shared Gemini infrastructure (`_shared/gemini.ts`)

- Model: `gemini-3.1-flash-lite` (free tier: 500 req/day, 15/min).
- Secret: `GEMINI_API_KEY` (Supabase secret store).
- Retry: up to 3 attempts on 5xx/408; 429 → immediate "rate_limit" fail.
- Never throws — always returns `{ ok, text }` or `{ ok:false, reason }`.

---

## F. The Broadsheet Cookbook Redesign

### What exists in code right now

**All of it is built and wired.** The broadsheet is the DEFAULT recipe surface for
`kind === "recipe"` (RecipePage line 74: `if (kind === "recipe" && !classic)`). A
"← classic view" toggle escapes to the old recipe page as a safety valve.

#### Components — all wired and rendering:

1. **BroadsheetRecipe** — the three-column cockpit. Measures remaining viewport height
   and sets the body to a fixed frame. Each side column is collapsible (22% width ↔ 28px
   collapsed). Ingredients and method scroll independently with a paper-fade "more ↓" cue
   (disappears at scroll bottom).

2. **BroadsheetMasthead** — Fraunces headline, Inter small-caps dateline ("Serves N ·
   M min to table"), provenance link ("imported from hostname"), back/Edit/Log/Cook/★/
   Delete actions.

3. **BroadsheetIngredients** — flat ⇄ grouped-by-step toggle (uses `step_position` from
   db/38). Each ingredient is **tickable** (click → strikethrough; persisted to
   cook_session via `useBroadsheetCook.toggleTick`).

4. **BroadsheetSteps** — Fraunces numerals on every step + step text + per-step activity
   tag label (Hands-on / Hands-free / Active heat, from the `tag` column) + inline
   duration + inline "▸ MEANWHILE" markers for concurrent steps. Each step is **tappable
   to cycle state** (waiting → active → done; persisted via `useBroadsheetCook.markStep`).

5. **BroadsheetTiming** — **calm text only**, no chart/lanes/ruler. Shows: "Ready in
   ~X min" (total from cookSchedule), "mostly a Y min [short verb phrase]" (the longest
   step), and a parallel headline ("2 threads run in parallel" or a "While X, do Y"
   attempt) when concurrent steps exist.

#### The recipe parser/import path currently emits for steps and ingredients:

- **Steps** come back from Gemini as objects `{ text, duration_seconds, tag, depends_on }`.
  The normaliser in `recipe-import/index.ts` has a backwards-compat guard: if a plain
  string arrives, it wraps it as `{ text: s }`. The client (`importClient.js`) maps each
  to `{ text, timer_seconds, tag, depends_on }` (the editor's shape). **BroadsheetSteps
  guards against non-string text**: line 52 does `typeof s.text === "string" ? s.text : ""`
  — so an `[object Object]` render would only happen if `.text` itself were an object, which
  the normaliser prevents. **This appears fixed / not reproducible in the current code.**

- **Ingredients** come with `step_number` from the AI (0-based step position), stored as
  `step_position` on `recipe_ingredients`. The grouped-by-step view works today for
  AI-imported recipes; manually-created recipes have `step_position = null` (all land in
  the flat list or "Other ingredients" bucket).

#### How timing actually renders today:

**Calm text only.** The timing column shows:
- "Ready in ~X min" computed from `cookSchedule` (total finish time).
- "mostly a Y min [verb phrase]" — the single longest step.
- A parallel headline when `findOverlaps` detects concurrent time ranges.

There are **NO lanes, NO ruler, NO graphical blocks**. The `cookLanes.js` file exists
(assigns lanes from dependency data) but is NOT imported by any rendering component — it's
dead code left from an earlier plan. The timing column is purely textual.

#### The two known live-cook bugs:

##### Bug 1: RESUMING a session (state loss on reload/navigate)

**What goes wrong**: `useCookSession` writes are **debounced at 500ms**. Every tick,
step-mark, or timer-start is applied optimistically to local state, then a 500ms
setTimeout fires the actual `saveSession()` write to the DB. If the page reloads,
the user navigates away, or the tab is closed within that 500ms window, the pending
write is LOST — the DB never receives the last batch of changes.

**Concrete scenario**: User marks 3 steps "done" in quick succession (each resets
the debounce timer). Within 500ms of the last mark, they hit browser refresh. On
reload, `fetchActiveSession` returns the DB state which is missing those 3 marks.
The user sees their progress rolled back.

**The critical case**: "Done cooking" sets `status: "done"` via `update()`, which is
also debounced. If the user clicks "Done cooking" then immediately navigates (the
`onExit` callback fires navigation), the status='done' write can be lost. The session
stays 'active' in the DB, the DoneCookCard never appears, and the ResumeCookBanner
shows a stale "Cook in progress" prompt for a cook that's already finished.

**What DOES work**: Struck steps, ticked ingredients, board states, and timers all
restore correctly on a normal reload (when the last debounced write completed). Timer
END-timestamps are absolute (stored in ms), so countdown recalculation after reload
is accurate — a timer that was at 3:42 remaining before reload shows the correct
remaining time after reload.

The **broadsheet** cook layer (`useBroadsheetCook`) has the same debounce-loss
vulnerability — it delegates to the same `useCookSession` hook.

##### Bug 2: ISOLATION (one recipe's state leaking into another's)

**What goes wrong**: `useCookSession(recipeId)` is keyed on `recipeId` in its `useEffect`
dependency array. When `recipeId` changes (e.g. opening a different recipe), the hook
re-fetches for the new recipe. However:

- `fetchActiveSession` finds the active session for the SPECIFIC recipe. So recipe A's
  session can never be RETURNED when looking up recipe B.
- **BUT**: the `update()` function closes over the current `idRef.current` (the session row
  id). There's a timing window: if you navigate rapidly from recipe A (which has an active
  session) to recipe B (no session), the debounced write (500ms) from A's last action could
  fire AFTER `idRef.current` has been cleared/changed by the B mount. In practice this means:
  - If recipe B has NO active session, the save creates a NEW session with `recipe_id: B`
    carrying the state meant for A (leaked state).
  - If recipe B already has a session, `idRef.current` is set to B's session id, and A's
    debounced write overwrites B's session with A's state.

  This is a **race condition in rapid navigation**, not a constant leak. In normal use
  (one recipe at a time, no rapid switching) it doesn't manifest. But it's structurally
  present.

#### cook_session schema/logic — what's actually live:

The `cook_session` table (db/34) is live with the schema described in Section A. The logic:
- **Create**: lazy — the broadsheet creates on first tick/mark via `saveSession(null, {...})`;
  the CookPage creates immediately via `useCookSession`'s first `update()` call.
- **Persist**: debounced (500ms) writes of the full state blob.
- **Resume**: `fetchActiveSession(recipeId)` → hydrate the hook state.
- **Finish**: `update({ status: "done" })` → fires `lifeos:cook-session-change` event → the
  global context (`cookSessionContext`) re-fetches → header marker disappears.
- **Done card**: `fetchDoneSession(recipeId)` finds a done + non-dismissed session → shows
  "Log it" / "Dismiss".
- **Global indicator**: `fetchAnyActiveSession()` (across all recipes) powers the
  ResumeCookBanner and the EditionHeader's live cook marker.

#### Does the older kanban cook page still exist alongside the broadsheet?

**YES — both exist.** The flow is:
- Opening a recipe → `RecipePage` → shows `BroadsheetRecipe` by default (for kind="recipe").
- Clicking "Cook" in either the broadsheet masthead or the classic recipe page → sets
  `cooking=true` → renders `CookPage` (the kanban board with timers).
- The broadsheet's interactive layer (tick ingredients, mark steps) is a **SEPARATE**
  live-cook experience from the CookPage kanban. They share the SAME `cook_session` row
  (both use `useCookSession(recipeId)` / `useBroadsheetCook(recipeId)`) — but they render
  differently:
  - **Broadsheet**: inline tick/mark on the recipe page itself (lazy-start, no full-page
    takeover).
  - **CookPage**: full-page kanban takeover with timers + wake-lock.
- "Done cooking" on CookPage exits to the staging sheet (LogMealSheet).
- The broadsheet has no "Done cooking" button — you mark steps done individually, and
  the DoneCookCard appears if a session reaches status='done'.

#### The scheduler

`cookSchedule.js` is live and used by both BroadsheetSteps (for MEANWHILE markers) and
BroadsheetTiming (for the "Ready in ~X" total), and by CookPage/KanbanBoard (for "start
now" / "start at +M:SS" cues). It does NOT auto-advance anything.

---

## G. Three Buckets

### Bucket 1: Broadsheet look/code genuinely proven — carry forward as the visual template

- **`broadsheet.css`** — the full styling language (hairline rules, Fraunces serif numerals,
  Inter body, paper-fade scroll cues, collapsible proportional side panels, responsive phone
  stacking). This IS the design system for the new cookbook.
- **`BroadsheetMasthead.jsx`** — the Fraunces headline + dateline + action bar pattern.
- **`BroadsheetIngredients.jsx`** — the flat ⇄ grouped-by-step toggle + tickable lines.
- **`BroadsheetSteps.jsx`** — Fraunces numerals + step text + tag labels + duration +
  "▸ MEANWHILE" markers + tappable state cycle.
- **`BroadsheetTiming.jsx`** — calm-text timing (proven design: no chart).
- **`cookSchedule.js`** — the critical-path scheduler (dep-ready; honest sequential
  fallback). Proven algorithm.
- **`cookLanes.js`** — lane assignment algorithm (proven logic, currently unused by UI but
  ready).
- **`cookTimers.js`** — duration parser (robust regex, proven in use).
- **The `useBroadsheetCook` lazy-start pattern** — session created on first real action.
- **The session-surfacing pattern**: resume banner + done-card + global header marker +
  context provider. Well-designed, carries forward conceptually.
- **The three enrichment columns** (db/38: `step_position`, `tag`, `depends_on`) — the data
  model for parallel timing + grouped ingredients + activity tags. Small, clean, proven.

### Bucket 2: Old surfaces the new slice will REPLACE then REMOVE

- **`RecipePage.jsx`** (the "classic" recipe view) — the old non-broadsheet recipe page with
  collapse-by-default steps. Currently the fallback via the "← classic view" toggle. Will be
  fully replaced.
- **`CookPage.jsx`** + **`KanbanBoard.jsx`** + **`cookmode.css`** — the kanban-based cook
  page (full-page takeover). The broadsheet inline cook is the intended replacement. The
  kanban surface has the timer-resume bug.
- **`RecipeActionBar.jsx`** — the bottom action bar on the classic page. Replaced by the
  broadsheet masthead actions.
- **`TimerRing.jsx`** — the SVG countdown ring (CookPage-specific). If timers come back in
  the new design, they'd be rebuilt differently.
- **The classic toggle itself** (`bs-preview-toggle` / `bs-preview-btn` CSS + the toggle
  buttons in RecipePage) — temporary scaffolding, intended to be removed.

### Bucket 3: Old data model + calc engine being redesigned fresh

- **`food_items`** table — the per-100g food library/cache shape.
- **`food_log_entries`** table — the snapshot-based ledger.
- **`recipes` / `recipe_ingredients` / `recipe_steps`** tables.
- **`cook_session`** table — the JSONB-blob session state.
- **`foodCalc.js`** — the full logger calc layer (dailyTotals, entryMacros, dayLedger,
  macroSplit, calorieArc, rangeTotals, rangeAdherence, vsGoal).
- **`recipeCalc.js`** — recipeMacros + recipeKind + lastCookedFor.
- **`foodLoad.js` / `foodWrite.js` / `recipeLoad.js` / `recipeWrite.js`** — all fetch/write
  paths.
- **`useFoodWrites.js` / `useRecipeWrites.js` / `useCookLog.js` / `useCookSession.js`** —
  all state-management hooks.
- **`portions.js`** — the curated portion/weight table.
- **`foodFormat.js` / `foodShape.js`** — formatting + shape helpers.
- **All Edge Functions** (`food-search`, `recipe-import`, `meal-estimate`) — being
  redesigned or replaced.
- **The entire logger surface** (LogPage, DayView, WeekMonthView, CalorieArc, MacroBar,
  MealLedger, QuickAddStrip, etc.) — being redesigned fresh.
- **The Finder** — converged search/pick/amount modal.

### Items that don't sort cleanly (flagged):

1. **`cookSession.js`** (the fetch/write module) — its API surface (fetchActiveSession,
   fetchAnyActiveSession, fetchDoneSession, saveSession) is well-designed and the new slice
   likely wants the same pattern, but the underlying JSONB-blob shape and the timer_ends
   format have the resume bug, so it probably gets rewritten alongside the table.

2. **The global cook-indicator pattern** (cookSessionContext + EditionHeader marker) — the
   *concept* carries forward but it's tightly coupled to the current cook_session table
   shape, so it'll need to be rebuilt to match whatever the new session model is.

3. **`db/32_food_basics_seed.sql`** — the curated staple foods (20 rows). The DATA is
   useful regardless of schema redesign, but it's tied to the current food_items shape.
   Carry forward the nutritional data; the seeding mechanism adapts to whatever the new
   schema is.

---

*End of inventory. Nothing was changed. Carry to the Planner.*
