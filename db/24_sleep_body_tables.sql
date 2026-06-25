-- LifeOS — Sleep & Body Stats tables (Health → Track S, S2: the three tables).
--
-- WHAT THIS IS (plain English): the storage for Health's second module. Three brand-new
-- tables, each owner-only. An Apple Shortcut (later, S3) PUSHes Apple-Health numbers into
-- them; every app screen only READS them. This is its OWN module's storage — it ADDS tables
-- and never changes the task/event/category spine's meaning.
--   1) sleep_nights  — one row per night (keyed on the wake-up date).
--   2) body_metrics  — one row per scale reading (weight, body-fat %, …); daily average is
--                      derived ON READ, never stored.
--   3) health_goals  — the owner's targets (sleep hours, bedtime, goal weight, …).
--
-- FOR THE CHECKER — this is a schema change; please confirm:
--   1) ADDITIVE — three brand-new tables; NOTHING about tasks/events/categories is altered.
--   2) Owner-only RLS is ON for all three — the four owner policies per table below; the DB
--      only ever touches the owner's rows (auth.uid() = user_id), exactly like the gym_*
--      and marty_* tables.
--   3) NO foreign key into the spine — the only reference on any table is to auth.users
--      (ownership). `metric_type`, `goal_type`, `direction`, `source`, `night_date` are all
--      PLAIN values, never a tasks/events/categories id.
--   4) Dedupe constraints (the re-push safety net):
--        • sleep_nights  UNIQUE (user_id, night_date) — one row per night; a re-push of the
--          same night UPDATES it (latest wins), so the 4×/day runs can't duplicate a night.
--        • body_metrics  UNIQUE (user_id, metric_type, reading_at, source) — so the same
--          reading can't be double-logged across the day's runs.
--
-- Run this in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis) AFTER the
-- earlier db/ files. You should see "Success. No rows returned."

-- 1) sleep_nights — one consolidated row per night -----------------------------------
create table if not exists public.sleep_nights (
  id              uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine). Owner gone → their data too.
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,

  -- The night belongs to its WAKE-UP date (Amsterdam day) — the one stable key per night.
  night_date      date        not null,

  in_bed_at       timestamptz,
  woke_at         timestamptz,

  -- Stages + totals, in whole minutes (store raw; compute h:mm on read).
  asleep_minutes  integer,
  rem_minutes     integer,
  core_minutes    integer,
  deep_minutes    integer,
  awake_minutes   integer,
  awakenings      integer,

  -- RESERVED for the AI/V2 world — the Apple Watch sleep score isn't readable by a Shortcut
  -- in V1, so this stays null for now (costs nothing; saves a later migration).
  score           integer,

  source          text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One row per night, per owner. The S3 upsert keys on this (re-push updates the row).
  unique (user_id, night_date)
);

-- Recent-nights lookups (the real sort key) + the marty_* newest-first convention.
create index if not exists sleep_nights_user_night_idx
  on public.sleep_nights (user_id, night_date desc);

alter table public.sleep_nights enable row level security;

drop policy if exists "Owner can read own sleep_nights"   on public.sleep_nights;
drop policy if exists "Owner can insert own sleep_nights" on public.sleep_nights;
drop policy if exists "Owner can update own sleep_nights" on public.sleep_nights;
drop policy if exists "Owner can delete own sleep_nights" on public.sleep_nights;

create policy "Owner can read own sleep_nights"
  on public.sleep_nights for select
  using (auth.uid() = user_id);
create policy "Owner can insert own sleep_nights"
  on public.sleep_nights for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own sleep_nights"
  on public.sleep_nights for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own sleep_nights"
  on public.sleep_nights for delete
  using (auth.uid() = user_id);

-- 2) body_metrics — one row per scale reading (flexible shape) ------------------------
create table if not exists public.body_metrics (
  id           uuid        primary key default gen_random_uuid(),

  user_id      uuid        not null default auth.uid()
                           references auth.users (id) on delete cascade,

  metric_date  date        not null,                 -- Amsterdam day of the reading

  -- A new stat = a new value here, NEVER a schema change (e.g. weight, body_fat, lean_mass, bmi).
  metric_type  text        not null,
  value        numeric     not null,
  unit         text,

  reading_at   timestamptz not null,                 -- exact timestamp of the reading
  source       text,

  created_at   timestamptz not null default now(),

  -- The four daily runs can't double-log the same reading. Daily average is derived on read.
  unique (user_id, metric_type, reading_at, source)
);

-- Per-metric history / "latest value" lookups.
create index if not exists body_metrics_user_type_reading_idx
  on public.body_metrics (user_id, metric_type, reading_at desc);

alter table public.body_metrics enable row level security;

drop policy if exists "Owner can read own body_metrics"   on public.body_metrics;
drop policy if exists "Owner can insert own body_metrics" on public.body_metrics;
drop policy if exists "Owner can update own body_metrics" on public.body_metrics;
drop policy if exists "Owner can delete own body_metrics" on public.body_metrics;

create policy "Owner can read own body_metrics"
  on public.body_metrics for select
  using (auth.uid() = user_id);
create policy "Owner can insert own body_metrics"
  on public.body_metrics for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own body_metrics"
  on public.body_metrics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own body_metrics"
  on public.body_metrics for delete
  using (auth.uid() = user_id);

-- 3) health_goals — the owner's targets ----------------------------------------------
create table if not exists public.health_goals (
  id            uuid        primary key default gen_random_uuid(),

  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  -- e.g. sleep_duration, bedtime, weight. Plain value, never a spine id.
  goal_type     text        not null,
  target_value  numeric,
  unit          text,

  -- How we measure progress: toward a higher number, a lower one, or hitting a clock time.
  direction     text        check (direction in ('up', 'down', 'by_time')),

  set_at        timestamptz not null default now(),
  -- The newest ACTIVE row per goal_type is the live goal; old ones stay for history.
  active        boolean     not null default true,

  created_at    timestamptz not null default now()
);

-- Find the newest active goal per type quickly.
create index if not exists health_goals_user_type_set_idx
  on public.health_goals (user_id, goal_type, set_at desc);

alter table public.health_goals enable row level security;

drop policy if exists "Owner can read own health_goals"   on public.health_goals;
drop policy if exists "Owner can insert own health_goals" on public.health_goals;
drop policy if exists "Owner can update own health_goals" on public.health_goals;
drop policy if exists "Owner can delete own health_goals" on public.health_goals;

create policy "Owner can read own health_goals"
  on public.health_goals for select
  using (auth.uid() = user_id);
create policy "Owner can insert own health_goals"
  on public.health_goals for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own health_goals"
  on public.health_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own health_goals"
  on public.health_goals for delete
  using (auth.uid() = user_id);
