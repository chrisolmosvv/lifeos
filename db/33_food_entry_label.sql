-- LifeOS — Food V2 P5: food_log_entries.entry_label (the estimate's display name).
--
-- WHAT THIS IS (plain English): ONE new free-text column on the existing food_log_entries table. It
-- holds a DISPLAY LABEL for an entry that has no food/recipe to borrow a name from — namely a
-- Feature-B "estimate this meal" entry (recipe_id null + food_item_id null). Today such an entry
-- renders "Food" in the ledger; with this column it renders the typed description
-- ("Chicken burrito · ~ est"), so estimated restaurant/friend meals are recognisable later.
--
-- WHY A NEW COLUMN (reuse checked first): the ledger resolves a name via food_items.name (through
-- food_item_id) or recipes.title (through recipe_id); an estimate has NEITHER FK, and
-- food_log_entries has NO existing free-text name/label/note column (meal_slot / unit / entry_source
-- are all closed/semantic). So there is nothing to reuse — this is the minimal additive home.
--
-- FOR THE CHECKER — please confirm at a glance:
--   1) ADDITIVE — a single ADD COLUMN on an EXISTING Food-module table. No ALTER/DROP/RENAME; the
--      task/event/category spine is untouched.
--   2) NULLABLE, no default — existing entries stay null (they resolve by FK or fall to "Food", as
--      today). No backfill, no data rewrite.
--   3) NO new foreign key, no new constraint — just a nullable text column.
--   4) RLS UNCHANGED — food_log_entries already has owner-only RLS (F1); a new column inherits it.
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland) AFTER
-- db/32_food_basics_seed.sql. Expect "Success. No rows returned." THEN run
--   notify pgrst, 'reload schema';
-- so PostgREST picks up the new column before the P5 code writes/reads it.

alter table public.food_log_entries
  add column if not exists entry_label text;

-- ── ROLLBACK (reviewed, DO NOT RUN unless reverting) ────────────────────────────────────────
--   alter table public.food_log_entries drop column if exists entry_label;
--   notify pgrst, 'reload schema';
