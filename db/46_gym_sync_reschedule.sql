-- LifeOS — reschedule the Hevy/gym auto-sync from twice-daily to FOUR times a day.
-- SCHEDULING infra, NOT a spine/schema change. Supersedes the CADENCE section of db/22_gym_sync_cron.sql.
--
-- WHAT THIS IS (plain English): the existing pg_cron job `gym-twice-daily-sync` already pokes the
-- private `gym` edge function in "sync" mode so the Hevy cache refreshes itself. This file does NOT
-- create a new job, does NOT touch the spine, and does NOT touch any other cron job. It only
-- re-points the SAME job (jobid 4, confirmed live) at a new timetable:
--
--     09:00, 10:00, 00:00 and 18:00 — AMSTERDAM local time, all year round.
--
-- The Vault secret (`brief_service_role_key`), the URL, and the body ({"mode":"sync"}) are kept
-- byte-for-byte identical. The ONLY additions are the new schedule and a one-line local-time guard.
--
-- THE DST PROBLEM (and the owner's call): pg_cron reads every schedule as UTC — the server's
-- `cron.timezone` is GMT and Supabase does not let us change it. Amsterdam is UTC+2 in summer (CEST)
-- and UTC+1 in winter (CET), so ANY fixed UTC schedule silently slides by an hour every autumn.
-- The owner chose the self-correcting fix over a twice-yearly manual nudge:
--
--   * The job WAKES on all seven UTC hours that could ever be one of the four local times:
--         summer (UTC+2): 07, 08, 16, 22 UTC   -> 09:00, 10:00, 18:00, 00:00 Amsterdam
--         winter (UTC+1): 08, 09, 17, 23 UTC   -> 09:00, 10:00, 18:00, 00:00 Amsterdam
--         union:          07, 08, 09, 16, 17, 22, 23 UTC
--   * The job only ACTS when the Amsterdam wall clock actually reads 00, 09, 10 or 18. The WHERE
--     runs before the target list, so on a non-matching hour net.http_post is never evaluated:
--     zero HTTP calls, zero Hevy API hits, zero cost. Three cheap no-op ticks a day buy us a
--     schedule that is correct in both halves of the year with nothing to remember.
--
-- SAFETY: the "sync" verb is idempotent and its cursor advances only on a fully clean pass (G4), so
-- even if a DST-transition day were to fire a target hour twice, the extra run is a harmless no-op
-- catch-up. Four runs/day remains trivially inside Hevy's rate limits (the G3 full backfill saw 0 429s).
--
-- Minute 0 of UTC hours 07-09 and 16-17 coincides with the hourly `marty-daytime-nudge` job. That is
-- fine: they are different functions and pg_net dispatches asynchronously — they do not block each other.
--
-- pg_cron here is 1.6.4 (confirmed live), so `cron.alter_job` exists: we edit the job in place rather
-- than unschedule/re-schedule, which keeps the same jobid and name and leaves no window with no job.
--
-- Run this ONCE against Frankfurt (cntlptuacsujbdtwvbis).

select cron.alter_job(
  job_id  := (select jobid from cron.job where jobname = 'gym-twice-daily-sync'),
  schedule := '0 7,8,9,16,17,22,23 * * *',
  command  := $$
  select net.http_post(
    url := 'https://cntlptuacsujbdtwvbis.supabase.co/functions/v1/gym',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brief_service_role_key')
    ),
    body := jsonb_build_object('mode', 'sync')
  )
  where extract(hour from (now() at time zone 'Europe/Amsterdam')) in (0, 9, 10, 18);
  $$
);

-- Read it back (should show the new schedule + the guarded command):
--   select jobid, jobname, schedule, active from cron.job where jobname = 'gym-twice-daily-sync';
--
-- The job name still says "twice-daily" — renaming it would change the handle every other doc and
-- the db/22 unschedule note refer to, for zero behavioural gain. The schedule is the truth.
