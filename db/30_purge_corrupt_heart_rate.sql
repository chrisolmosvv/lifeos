-- LifeOS — purge corrupt activity_hourly.heart_rate rows (Track S, Health V2 P0b).
--
-- WHAT THIS IS (plain English): a one-time tidy-up, not a schema change. The activity
-- heart_rate rows are corrupt — the Shortcut sent pre-summed hourly values, so the
-- stored "averages" are impossible (avg ~2,277 bpm, max 53,392). They're shown nowhere
-- in the app today (the Vitals tiles use body_metrics.resting_heart_rate, a different
-- metric), but they'd be a landmine before any HR surfaces in V2. This deletes exactly
-- those rows.
--
-- DATA-ONLY: no table/column/index/RLS/policy/spine change. Owner-RLS still scopes
-- every row. SAFE TO RE-RUN: scoped to metric_type='heart_rate'; a second run hits 0 rows.

-- ⚠️ INSPECT FIRST (read-only — run this BEFORE the delete):
--   select count(*) n, min(value) mn, max(value) mx, round(avg(value),1) av
--     from public.activity_hourly where metric_type = 'heart_rate';
--   -- expect ~143 rows, max ~53392 — the impossible-bpm corruption signature.

begin;

-- EXACT equality, never LIKE — so the SEPARATE, sane metric 'walking_heart_rate_avg'
-- is NOT matched. steps / active_energy / the new P0a metrics are all left intact.
delete from public.activity_hourly
 where metric_type = 'heart_rate';

commit;

-- VERIFY (read-only, AFTER):
--   select metric_type, count(*) from public.activity_hourly group by 1 order by 1;
--   -- expect: heart_rate GONE; every other metric_type still present (counts only
--   --   grow as new pushes arrive, never drop) — active_energy, steps, flights_climbed,
--   --   stand_minutes, walking_speed, walking_heart_rate_avg, walking_step_length.
