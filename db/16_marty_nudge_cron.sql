-- LifeOS — daytime nudge cron (Marty track M9). SCHEDULING infra, NOT a schema change.
--
-- This mirrors the 7am brief's pg_cron + pg_net + Vault pattern. It pokes the brief
-- function in DAYTIME-NUDGE mode across the working window; the function itself enforces
-- the 9am–6pm Amsterdam gate (DST-safe via localHour()) and the caps (max 2/day, never
-- back-to-back), so it only ever offers at the right time. Most fires do nothing — that's
-- expected; the guardrails live in the function.
--
-- YOU DON'T NEED THIS TO VERIFY — text Marty "nudge test" to trigger a scan on demand.
-- Run this only when you want the real daily nudges.
--
-- BEFORE RUNNING, match these to your existing 7am-brief cron job:
--   • the Vault secret name for the service-role key (placeholder below: 'service_role_key');
--   • the function URL (the project ref below is your Frankfurt project).
-- It fires hourly 07:00–17:00 UTC, which covers 9–18 Amsterdam in BOTH winter (UTC+1) and
-- summer (UTC+2); the function's local-hour gate keeps it to 9–6 Amsterdam exactly.

select cron.schedule(
  'marty-daytime-nudge',
  '0 7-17 * * *',
  $$
  select net.http_post(
    url := 'https://cntlptuacsujbdtwvbis.supabase.co/functions/v1/brief',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{"nudge": true, "scheduled": true}'::jsonb
  );
  $$
);

-- To remove it later:  select cron.unschedule('marty-daytime-nudge');
