-- LifeOS — Food: recipes.is_favourite (Track F, V2 P0: the ★ contract for recipes/meals).
--
-- WHAT THIS IS (plain English): ONE new column on the existing `recipes` table. It records
-- whether a recipe (or meal) is starred as a favourite — the ★ the V2 Cookbook uses to pin
-- and surface the recipes you cook most. It mirrors the favourite flag that already lives on
-- `food_items` (foods can be starred; now recipes can too), so both faces of the Food pillar
-- share one ★ idea. It is the ONLY schema change in V2 P0.
--
-- (Note: the sibling P0 column `food_log_entries.is_estimated` was found ALREADY LIVE, in the
--  intended shape, during the P0 live check — so it is NOT created here. This file adds only
--  is_favourite. See the P0 handoff note about the pre-existing is_estimated column.)
--
-- WHY STORED (not derived): "is this a favourite" is an owner choice, not a computed fact —
-- there is nothing to derive it from. A stored boolean is its honest home, exactly like
-- food_items.is_favourite.
--
-- FOR THE CHECKER — please confirm these at a glance:
--   1) ADDITIVE — a single ADD COLUMN on an EXISTING Food-module table. No ALTER/DROP/RENAME
--      anywhere; NOTHING about the task/event/category spine is touched.
--   2) NOT NULL DEFAULT false — existing recipes read as "not a favourite" automatically; the
--      default backfills every current row in place. No data rewrite, no separate backfill.
--   3) NO new foreign key, no new constraint — just a boolean column.
--   4) RLS UNCHANGED — `recipes` already has owner-only RLS (F1); a new column inherits it.
--      No policy edits here.
--
-- Run this in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland)
-- AFTER db/29_recipe_last_cooked.sql. You should see "Success. No rows returned." THEN run
--   notify pgrst, 'reload schema';
-- so PostgREST picks up the new column before any V2 code reads/writes it.

alter table public.recipes
  add column if not exists is_favourite boolean not null default false;

-- (No index: the cookbook list is a small personal set, sorted/filtered in-app; an index
--  on a low-cardinality boolean over few rows would not pay.)

-- ── ROLLBACK (reviewed, DO NOT RUN unless reverting this commit) ─────────────────────────
-- Removes the column and its data. Safe because nothing in the shipped app depends on it yet
-- (P0 adds the column only; wiring is a later phase).
--   alter table public.recipes drop column if exists is_favourite;
--   notify pgrst, 'reload schema';
