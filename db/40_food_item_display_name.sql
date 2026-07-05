-- Migration 40: add display_name to food_items
--
-- One nullable text column. When set, the UI shows this instead of the raw
-- API name in `name`. When null, the app falls back to `name` (no change to
-- existing behaviour). No constraint, no index, no policy change — the
-- existing owner-only RLS on food_items covers all columns automatically.

alter table food_items add column display_name text;

-- Rollback: alter table food_items drop column display_name;
