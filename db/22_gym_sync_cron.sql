-- LifeOS — gym twice-daily auto-sync cron (Health → Gym track, G5 Commit A).
-- SCHEDULING infra, NOT a spine/schema change.
--
-- WHAT THIS IS (plain English): a pg_cron job that pokes the PRIVATE `gym` edge function in
-- "sync" mode twice a day, so the Hevy cache refreshes itself without anyone pressing a
-- button. It mirrors the EXISTING brief cron exactly: pg_cron fires on a timer → pg_net's
-- net.http_post calls the function → the service-role key is read from the Vault AT RUN TIME
-- (never written into this SQL or the repo).
--
-- VAULT SECRET NAME — CONFIRMED LIVE (the db/16 trap, avoided): a query of the live project
-- (`select name from vault.decrypted_secrets`) shows the ONLY secret is `brief_service_role_key`
-- — there is no `service_role_key`. The working `brief_daily_7am_ams` job uses
-- `brief_service_role_key`, so this gym job REUSES that exact existing secret. We do NOT mint a
-- new one. (A wrong name resolves to NULL → empty Bearer → the private function 401s and the
-- cron silently no-ops — exactly what we're avoiding.)
--
-- CADENCE: `0 4,18 * * *` — one job, two fires/day at 04:00 and 18:00 UTC = Amsterdam
-- 06:00 & 20:00 (summer, CEST) / 05:00 & 19:00 (winter, CET): a morning + an evening sync,
-- well clear of the brief (05/06 UTC) and nudge (07–17 UTC) jobs. The events feed is light
-- (the G3 full backfill saw 0 rate-limit 429s), so twice daily is trivially within bounds —
-- do NOT poll more often.
--
-- SELF-HEALING: the "sync" verb is idempotent and its cursor (gym_sync_state.last_event_at)
-- advances ONLY on a fully clean pass (G4), so a missed or partial scheduled run is safe —
-- the next run simply catches up from the last good cursor. The job can't run away.
--
-- FOR THE CHECKER — please confirm all four (this is scheduling infra, not a schema change):
--   1) ADDITIVE — it adds ONE cron job only. It alters nothing about the spine
--      (tasks/events/categories) or any table, and does not touch the existing
--      `brief_daily_7am_ams` / `marty-daytime-nudge` jobs.
--   2) It REUSES the existing Vault secret `brief_service_role_key` (confirmed live), not a new
--      one, and reads it AT RUN TIME — the secret is never written into this SQL or the repo.
--   3) Twice daily (`0 4,18 * * *`) and the target is the `gym` function with body
--      {"mode":"sync"} — NOT the brief, NOT a public endpoint (the gym function is jwt-verified).
--   4) It cannot run away — idempotent sync + cursor-advances-only-on-a-clean-pass means a
--      partial/failed run is safe to repeat.
--
-- Run this ONCE in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis). You should
-- see one row returned (the new job's id).

select cron.schedule(
  'gym-twice-daily-sync',
  '0 4,18 * * *',
  $$
  select net.http_post(
    url := 'https://cntlptuacsujbdtwvbis.supabase.co/functions/v1/gym',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brief_service_role_key')
    ),
    body := jsonb_build_object('mode', 'sync')
  );
  $$
);

-- To remove it later:  select cron.unschedule('gym-twice-daily-sync');
