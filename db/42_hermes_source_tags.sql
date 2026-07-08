-- LifeOS — Hermes source tags (hermes-write): expand two CHECK constraints to accept
-- 'hermes' as a valid source value, so Hermes-logged rows are distinctly tagged.
--
-- WHAT THIS IS (plain English): TWO additive CHECK constraint expansions. No new tables,
-- no new columns, no data migration, no FK, no spine change. Existing rows are unaffected
-- (they already satisfy the old CHECK values which are still valid). The only effect is
-- that INSERT with the new value 'hermes' is now accepted.
--
-- FOR THE CHECKER — please confirm at a glance:
--   1) ADDITIVE — two DROP+ADD CONSTRAINT pairs on existing module tables. The constraint
--      names match the Postgres auto-generated names from the original CREATE TABLE. No
--      ALTER/DROP/RENAME on the task/event/category spine anywhere.
--   2) NO data change — every existing row's value is still in the expanded set. No
--      backfill, no UPDATE, no rewrite.
--   3) NO new column, no new table, no FK change. Just two CHECK expansions.
--   4) RLS UNCHANGED — CHECK constraints are column-level validation, not row-level
--      security. All four owner-only policies on both tables remain exactly as they are.
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland)
-- AFTER db/41_cook_event_ingredient_used.sql. Expect "Success. No rows returned." THEN:
--   notify pgrst, 'reload schema';

-- 1) food_log_entries.entry_source — add 'hermes' to the allowed values.
ALTER TABLE public.food_log_entries
  DROP CONSTRAINT IF EXISTS food_log_entries_entry_source_check;
ALTER TABLE public.food_log_entries
  ADD CONSTRAINT food_log_entries_entry_source_check
  CHECK (entry_source IN ('manual', 'search', 'recipe_cook', 'hermes'));

-- 2) focus_sessions.source — add 'hermes' to the allowed values.
ALTER TABLE public.focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_source_check;
ALTER TABLE public.focus_sessions
  ADD CONSTRAINT focus_sessions_source_check
  CHECK (source IN ('timer', 'manual', 'hermes'));

-- ── ROLLBACK (reviewed, DO NOT RUN unless reverting) ─────────────────────────────────
--   ALTER TABLE public.food_log_entries
--     DROP CONSTRAINT IF EXISTS food_log_entries_entry_source_check;
--   ALTER TABLE public.food_log_entries
--     ADD CONSTRAINT food_log_entries_entry_source_check
--     CHECK (entry_source IN ('manual', 'search', 'recipe_cook'));
--
--   ALTER TABLE public.focus_sessions
--     DROP CONSTRAINT IF EXISTS focus_sessions_source_check;
--   ALTER TABLE public.focus_sessions
--     ADD CONSTRAINT focus_sessions_source_check
--     CHECK (source IN ('timer', 'manual'));
--
--   notify pgrst, 'reload schema';
