-- LifeOS — Cook Companion 6b: widen cook_event.event_type to allow 'ingredient_used'.
--
-- WHAT THIS IS (plain English): the cook companion now tracks TWO ingredient states —
-- "ticked to buy" (shopping list, the existing 'ingredient_ticked') and "used in the pan"
-- (while cooking, the new 'ingredient_used'). This migration adds 'ingredient_used' to
-- the allowed values on the cook_event.event_type CHECK constraint. Nothing else changes.
--
-- FOR THE CHECKER — please confirm these at a glance:
--   1) STRICT SUPERSET — the new CHECK contains all five original values plus ONE new one
--      ('ingredient_used'). Every existing row still satisfies the constraint because we
--      only ADDED a value; no existing data is invalidated.
--   2) MODULE TABLE ONLY — cook_event is a Food-module table (db/39), NOT the spine
--      (categories/tasks/events are untouched).
--   3) NO new column, NO new table, NO new FK, NO RLS change — this is purely a constraint
--      widening.
--   4) The dropped constraint name (cook_event_event_type_check) matches the real name on
--      the live Frankfurt DB (confirmed by pg_constraint query).
--
-- ROLLBACK: re-run the original CHECK from db/39 (the five-value version). Only safe if
-- no 'ingredient_used' rows exist yet; delete them first if they do.
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland).
-- A PostgREST cache reload is NOT required (this is a constraint change, not a column),
-- but `notify pgrst, 'reload schema';` is harmless if you want belt-and-braces.

-- Step 1: drop the existing 5-value CHECK
alter table public.cook_event
  drop constraint cook_event_event_type_check;

-- Step 2: re-add as a strict superset (6 values)
alter table public.cook_event
  add constraint cook_event_event_type_check
  check (event_type in (
    'step_marked',
    'ingredient_ticked',
    'timer_started',
    'timer_stopped',
    'finished',
    'ingredient_used'
  ));
