-- LifeOS — Food V2 P9: DROP recipes.last_cooked_at (the dead column). CHECKER-GATED.
--
-- WHAT THIS IS (plain English): removes the now-DEAD last_cooked_at column from recipes. At P3 "last
-- cooked" became COMPUTE-ON-READ (lastCookedFor = MAX(entry_date) over a recipe's recipe_cook entries,
-- gated on recipeKind='recipe'); the stamp writer (stampLastCooked) was deleted then, and at P9(b)(i)
-- the two recipeLoad SELECTs stopped fetching the column. So NOTHING reads or writes it — pure dead
-- weight. The P3 ENTRY-GATE is CLEARED: verified on real cook history that computed lastCookedFor
-- faithfully reproduces the stored stamp on every has-steps recipe.
--
-- FOR THE CHECKER — please confirm at a glance:
--   1) THE PRECEDING SRC COMMIT (6accd8f, build-verified) already removed last_cooked_at from BOTH
--      recipeLoad SELECTs — so no live query errors on the dropped column. (src FIRST, then this DROP.)
--   2) ONLY recipes.last_cooked_at is dropped. The task/event/category spine is untouched; no other
--      column/table/constraint/RLS is altered.
--   3) No new FK, no data migration.
--
-- ROLLBACK — HONEST, STRUCTURAL-ONLY: unlike an ADD (trivially reversible), a DROP cannot restore data.
-- Re-adding the column re-creates its SHAPE but NOT its values (the stamps are unrecoverable — the
-- writer was removed at P3). This is ACCEPTABLE: nothing reads the column, and lastCookedFor computes
-- "last cooked" from recipe_cook entries, so the lost stamps are redundant. Rollback is shape-only:
--   ROLLBACK:  alter table public.recipes add column if not exists last_cooked_at timestamptz;
--              notify pgrst, 'reload schema';
--
-- Run in the Supabase SQL editor (Frankfurt cntlptuacsujbdtwvbis — NOT Ireland) AFTER db/34. Expect
-- "Success. No rows returned." THEN run  notify pgrst, 'reload schema';

alter table public.recipes
  drop column if exists last_cooked_at;
