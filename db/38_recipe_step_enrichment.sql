-- LifeOS — Cookbook V2 Piece 1: three additive columns for step enrichment.
--
-- These columns let the AI parser (a later piece) store per-step metadata so the
-- new cook surface can render real parallel timing lanes, an ingredients-by-step
-- toggle, and per-step activity tags. Until the parser and UI pieces land, every
-- column is NULL on every row — existing screens work exactly as today.
--
-- All three are ADDITIVE + NULLABLE. No new table, no new FK, no new RLS policy
-- (columns inherit the tables' existing owner-only policies), no new index (queries
-- filter by recipe_id + order by position, both already indexed).
--
-- ROLLBACK: ALTER TABLE … DROP COLUMN for each, no cascade (no FK points here).

-- 1) recipe_ingredients.step_position — links an ingredient to the step that uses it.
--    A plain smallint referencing a step's POSITION value (0-based), NOT a step id.
--    (Steps are delete/reinsert on edit, so a UUID FK would break.) NULL = ungrouped
--    (shown in an "Other ingredients" bucket in the by-step view).
alter table public.recipe_ingredients
  add column if not exists step_position smallint;

-- 2) recipe_steps.tag — an activity classification inferred by the AI parser.
--    Drives lane colour/weight on the timing column. NULL = untagged (treated as
--    hands-on by default on the cook surface).
alter table public.recipe_steps
  add column if not exists tag text
    check (tag in ('hands_on', 'hands_free', 'active_heat'));

-- 3) recipe_steps.depends_on — predecessor step positions (0-based ints in a jsonb
--    array). Feeds the existing dep-ready cookSchedule to compute real parallel lanes
--    instead of a sequential timeline. NULL or [] = sequential (depends on the
--    previous step). No FK — plain position values, same as step_position above.
alter table public.recipe_steps
  add column if not exists depends_on jsonb;
