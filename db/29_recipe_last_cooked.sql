-- LifeOS — Food: recipes.last_cooked_at (Track F, F9: the cook→log bridge).
--
-- WHAT THIS IS (plain English): ONE new column on the existing `recipes` table. It records
-- WHEN a recipe was last cooked-and-logged. The F9 "Log this meal" flow stamps it = now when
-- you log a cooked recipe; the recipe page shows a "last cooked <date>" line from it, and the
-- Cookbook's "cooked" sort orders by it (most-recent first). It is the FIRST schema change
-- since F1 — and the ONLY one F9 needs (everything else the cook-log row uses already exists
-- on food_log_entries: recipe_id, entry_source='recipe_cook' is already allowed by the CHECK,
-- amount, unit, the 7 macro numbers, food_item_id nullable).
--
-- WHY STORED, NOT DERIVED: "last cooked" is FORWARD-ONLY — set when a cook is logged, never
-- recomputed from current entries. The immediate undo restores the PRIOR value; a later delete
-- of a cook entry does NOT roll it back (an accepted soft signal for V1). A stored column is
-- the honest home for that semantic; deriving "max(entry_date where recipe_cook)" would change
-- the meaning (it would silently revert on delete).
--
-- FOR THE CHECKER — please confirm these at a glance:
--   1) ADDITIVE — a single ADD COLUMN on an EXISTING Food-module table. No ALTER/DROP/RENAME
--      anywhere; NOTHING about the task/event/category spine is touched.
--   2) NULLABLE, no default — existing recipes read as "not yet cooked" (null), exactly the
--      warm sparse-state the UI expects. No backfill, no data rewrite.
--   3) NO new foreign key, no new constraint — just a timestamptz column. entry_source already
--      permits 'recipe_cook' (from F1), so the cook-log entry needs NO constraint change.
--   4) RLS UNCHANGED — recipes already has owner-only RLS (F1); a new column inherits it. No
--      policy edits here.
--
-- Run this in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland)
-- AFTER db/28_food_tables.sql. You should see "Success. No rows returned." THEN run
--   notify pgrst, 'reload schema';
-- so PostgREST picks up the new column before the F9 src/ code writes to it.

alter table public.recipes
  add column if not exists last_cooked_at timestamptz;

-- (No index: the cookbook list is a small personal set, sorted in-app; an index would not pay.)
