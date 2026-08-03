-- LifeOS — Cookbook rebuild, Piece 1: THE SCHEMA (groundwork only, nothing visible yet).
--
-- WHAT THIS IS (plain English): the Cookbook is being rebuilt across ~14 sessions. The new
-- cook page will show the whole plan at once, schedule steps around each other, and re-time
-- itself silently as the owner cooks; the new import page will let the owner review what the
-- AI extracted before it's saved. Those features need a handful of facts the database cannot
-- currently hold. This migration adds EXACTLY those facts and nothing else — eight new columns
-- across four existing Food-module tables, one CHECK constraint widened, and one index. No new
-- tables, no new foreign keys, no new RLS policies. Until later pieces read/write these,
-- every column is NULL (or its default) on every existing row, so every screen behaves today
-- exactly as it does now.
--
-- FOR THE CHECKER — please confirm these at a glance:
--   1) ADDITIVE — every change is an ADD COLUMN (nullable or defaulted) or a CHECK WIDENING
--      that is a STRICT SUPERSET. No DROP, no RENAME, no type change, no NOT-NULL added to an
--      existing column. Every existing row stays valid and unchanged.
--   2) MODULE TABLES ONLY — recipes, recipe_ingredients, recipe_steps, cook_session and
--      cook_event are all Food-module tables (db/28, db/39). The spine
--      (categories / tasks / events) is NOT touched anywhere in this file.
--   3) NO new foreign key of any kind. No spine FK, no new intra-module FK. The new columns
--      are plain values (text / numeric / boolean / timestamptz).
--   4) NO new RLS policy — every new column inherits its table's existing owner-only policies
--      (auth.uid() = user_id), unchanged since db/28 / db/39.
--   5) The CHECK widening on cook_event.event_type is a strict superset: it KEEPS all six
--      current values (including 'step_marked', which the new code will simply stop writing —
--      removing it would be non-additive and would invalidate existing rows) and ADDS five.
--      The dropped constraint name (cook_event_event_type_check) is the name db/41 re-added it
--      under — the most recent definition of this constraint — so it matches the live DB.
--
--   ★ TWO THINGS THAT LOOK LIKE RULE VIOLATIONS BUT ARE NOT — walk-through in plain English:
--
--   (a) recipe_ingredients.grams looks like it breaks "compute-on-read" (derived numbers are
--       never stored). It does NOT, because grams is not a derived number — it is an OWNER
--       INPUT. amount/unit keep the BUY-form of an ingredient ("2 x 400g tins"); grams holds
--       the EAT-form the owner CONFIRMS at import ("480 g of drained beans") or corrects by
--       hand ("that aubergine is 550 g"). That figure cannot be computed from anything — it is
--       a decision the owner made. When grams is NULL, the existing runtime conversion
--       (portions.js) still runs exactly as today, so existing rows are unaffected.
--
--   (b) recipe_steps.hold_tolerance is a three-word TEXT enum, not a number of seconds. This
--       is deliberate: the owner reviews this field BY EYE during import, and three words
--       ('immediate' / 'short' / 'indefinite') can be judged at a glance where "1800 seconds"
--       cannot. The scheduler only needs coarse buckets to decide whether a step should be
--       placed early or just-in-time — it never needs a precise duration here.
--
-- INDEX: exactly one, on the single new filter column (recipes.cuisine) — see foot of file.
--
-- ROLLBACK (reviewed, DO NOT RUN unless reverting):
--   ALTER TABLE … DROP COLUMN for each of the eight columns (no cascade — no FK points here);
--   re-run the six-value CHECK from db/41 on cook_event (only safe if none of the five new
--   event_type values have been written yet; delete any such rows first);
--   DROP INDEX recipes_user_cuisine_idx.
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland).
-- You should see "Success. No rows returned." THEN run:
--   notify pgrst, 'reload schema';
-- so PostgREST picks up the new columns before any write (adding a column without this makes
-- the app silently drop the column on writes).

-- ── recipe_steps — three additive columns ────────────────────────────────────
-- How long this step's output can sit before it degrades. NULL = unknown. Coarse buckets
-- (see checker note (b)) — the scheduler reads them to place a step early vs just-in-time.
alter table public.recipe_steps
  add column if not exists hold_tolerance text
    check (hold_tolerance in ('immediate', 'short', 'indefinite'));

-- The station this step happens at. COLOUR-CODING ONLY — it does NOT constrain scheduling.
-- NULL = unassigned.
alter table public.recipe_steps
  add column if not exists station text
    check (station in ('bench', 'hob', 'oven', 'rest'));

-- Marks a step the importer GENERATED because the source hid the work in its ingredient list
-- (e.g. "dice the aubergines"). Defaulted so every existing step reads as a normal (non-prep)
-- step with no backfill.
alter table public.recipe_steps
  add column if not exists is_prep boolean not null default false;

-- ── recipe_ingredients — one additive column ─────────────────────────────────
-- The confirmed EDIBLE weight (an owner input — see checker note (a)). amount/unit keep the
-- BUY-form; grams holds the EAT-form. NULL = derive at runtime from portions.js exactly as
-- today, so existing rows are unaffected.
alter table public.recipe_ingredients
  add column if not exists grams numeric;

-- ── recipes — three additive columns ─────────────────────────────────────────
-- Free-text cuisine label (the one new filter column; indexed at the foot of this file).
alter table public.recipes
  add column if not exists cuisine text;

-- When the owner reviewed this import. NULL = an UNREVIEWED import, i.e. a draft.
alter table public.recipes
  add column if not exists reviewed_at timestamptz;

-- What the owner USUALLY cooks. The existing `servings` column keeps its meaning: what the
-- SOURCE recipe makes. NULL = no owner preference set (fall back to servings).
alter table public.recipes
  add column if not exists default_servings integer;

-- ── cook_session — one additive column ───────────────────────────────────────
-- The per-cook serve-time anchor: when this particular cook is aiming to plate up. NULL = no
-- target set for this session.
alter table public.cook_session
  add column if not exists target_serve_at timestamptz;

-- ── cook_event.event_type — ADDITIVE CHECK WIDENING (strict superset) ─────────
-- Mirrors the exact drop/re-add pattern of db/41. Keeps all SIX current values and adds FIVE
-- new ones (11 total). 'step_marked' is kept though the new code will stop writing it —
-- removing it would invalidate existing rows and would not be additive.

-- Step 1: drop the existing 6-value CHECK (name pinned by db/41).
alter table public.cook_event
  drop constraint cook_event_event_type_check;

-- Step 2: re-add as a strict superset (11 values).
alter table public.cook_event
  add constraint cook_event_event_type_check
  check (event_type in (
    'step_marked',
    'ingredient_ticked',
    'timer_started',
    'timer_stopped',
    'finished',
    'ingredient_used',
    'timer_adjusted',
    'estimate_adjusted',
    'amount_changed',
    'ingredient_omitted',
    'timer_resumed'
  ));

-- ── INDEX — exactly one, on the only new filter column ───────────────────────
create index if not exists recipes_user_cuisine_idx
  on public.recipes (user_id, cuisine);
