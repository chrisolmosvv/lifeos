-- LifeOS — one-time normalization of health-pipeline data (Track S, S4 cleanup).
--
-- WHAT THIS IS (plain English): a tidy-up, not a new table. Two fixes:
--   1) SOURCE label: the sleep handler used to tag rows "apple_health" (underscore);
--      every other metric uses "apple-health" (hyphen). The function code is now
--      fixed to write the hyphen too; this rewrites any existing sleep rows to match,
--      so every health row carries one consistent source label.
--   2) METRIC NAMES: any early test rows with Title-Case names ("Body Fat") are
--      folded to the canonical lowercase_underscore form ("body_fat").
--
-- SAFE TO RE-RUN: every statement is guarded by a WHERE clause, so running this a
-- second time changes nothing (a no-op). It alters DATA only — no table, column,
-- policy, RLS, or spine change. Owner-RLS still scopes every row to the owner.
--
-- ⚠️ BEFORE RUNNING — collision check (do this first, read-only):
--   Lowercasing a Title-Case metric_type could, in theory, collide with an existing
--   canonical row on the unique key (body_metrics: metric_type+reading_at+source;
--   activity_hourly: metric_type+day+hour+source). Run the SELECTs at the bottom of
--   this file first. If they return ANY rows, STOP — resolve the duplicates by hand
--   before running the UPDATEs (otherwise the UPDATE hits a unique violation).

begin;

-- 1) Source label: sleep rows → the canonical hyphen form.
update public.sleep_nights
   set source = 'apple-health'
 where source = 'apple_health';

-- 2) Metric names → canonical lowercase_underscore (Title-Case / spaced → snake).
update public.body_metrics
   set metric_type = lower(replace(metric_type, ' ', '_'))
 where metric_type <> lower(replace(metric_type, ' ', '_'));

update public.activity_hourly
   set metric_type = lower(replace(metric_type, ' ', '_'))
 where metric_type <> lower(replace(metric_type, ' ', '_'));

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- INSPECT / COLLISION-CHECK QUERIES (run these read-only FIRST; not part of the fix)
--
-- See what's actually stored:
--   select distinct metric_type, source from public.body_metrics    order by 1,2;
--   select distinct metric_type, source from public.activity_hourly order by 1,2;
--   select distinct source from public.sleep_nights;
--
-- Collisions that would break the UPDATE (must return ZERO rows before you run it):
--   select lower(replace(metric_type,' ','_')) as canon, reading_at, source, count(*)
--     from public.body_metrics
--    group by 1, reading_at, source having count(*) > 1;
--
--   select lower(replace(metric_type,' ','_')) as canon, day, hour, source, count(*)
--     from public.activity_hourly
--    group by 1, day, hour, source having count(*) > 1;
