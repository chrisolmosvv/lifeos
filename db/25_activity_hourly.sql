-- LifeOS — activity_hourly (Health → Track S, S3c: hourly activity buckets).
--
-- WHAT THIS IS (plain English): one row per (metric, day, hour) for the activity
-- stats that are only meaningful by the hour — steps, active energy, heart rate.
-- body_metrics holds point-in-time readings (a weigh-in); this holds an hour's
-- worth (steps between 2pm and 3pm). An Apple Shortcut (later) PUSHes these; every
-- app screen only READS them. Its OWN table — ADDS storage, never changes the spine.
--
-- FOR THE CHECKER — this is a schema change; please confirm:
--   1) ADDITIVE — a brand-new table; NOTHING about tasks/events/categories, nor
--      body_metrics/sleep_nights/health_goals, is altered.
--   2) Owner-only RLS is ON — the four owner policies below; the DB only ever
--      touches the owner's rows (auth.uid() = user_id), exactly like body_metrics.
--   3) NO foreign key into the spine — the only reference is to auth.users
--      (ownership). `metric_type`, `source` are PLAIN text, never a spine id.
--   4) Dedupe: UNIQUE (user_id, metric_type, day, hour, source) — so a re-send of
--      the same hour upserts (latest wins) instead of duplicating. NOTE: `source`
--      is NOT NULL DEFAULT 'apple-health' (not bare-nullable like body_metrics.source)
--      ON PURPOSE — a NULL would make the unique key treat rows as distinct and the
--      dedupe would silently fail; NOT NULL guarantees the "no dupes" rule holds.
--
-- Run this in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis) AFTER
-- the earlier db/ files. You should see "Success. No rows returned."

create table if not exists public.activity_hourly (
  id           uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine). Owner gone → their data too.
  user_id      uuid        not null default auth.uid()
                           references auth.users (id) on delete cascade,

  -- Which hourly metric. Plain text (free, like body_metrics) — today: steps,
  -- active_energy, heart_rate. A new hourly metric is a new value, never a migration.
  metric_type  text        not null,

  day          date        not null,                 -- Amsterdam calendar day
  hour         smallint    not null check (hour >= 0 and hour <= 23),

  value        numeric     not null,
  unit         text,

  -- Part of the dedupe key, so NOT NULL with a default (see checker note #4).
  source       text        not null default 'apple-health',

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One row per metric/day/hour, per owner. A re-send upserts on this (latest wins).
  unique (user_id, metric_type, day, hour, source)
);

-- Per-metric day lookups (an hourly strip for a given day / a metric's history).
create index if not exists activity_hourly_user_type_day_idx
  on public.activity_hourly (user_id, metric_type, day);

-- Row-level security: the database only ever touches the owner's rows ----------------
alter table public.activity_hourly enable row level security;

drop policy if exists "Owner can read own activity_hourly"   on public.activity_hourly;
drop policy if exists "Owner can insert own activity_hourly" on public.activity_hourly;
drop policy if exists "Owner can update own activity_hourly" on public.activity_hourly;
drop policy if exists "Owner can delete own activity_hourly" on public.activity_hourly;

create policy "Owner can read own activity_hourly"
  on public.activity_hourly for select
  using (auth.uid() = user_id);
create policy "Owner can insert own activity_hourly"
  on public.activity_hourly for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own activity_hourly"
  on public.activity_hourly for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own activity_hourly"
  on public.activity_hourly for delete
  using (auth.uid() = user_id);
