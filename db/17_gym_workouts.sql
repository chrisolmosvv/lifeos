-- LifeOS — gym_workouts (Health → Gym track, G2: the workout cache — table 1 of 5).
--
-- WHAT THIS IS (plain English): one row per Hevy WORKOUT, cached read-only from the Hevy
-- API. The G3 backfill / G4 incremental sync WRITE these rows; every app screen only READS
-- them. This is a CACHE of an external source (Hevy), NOT part of the task/event/category
-- spine — it adds its own tables and never changes the spine's meaning.
--
-- FOR THE CHECKER — this is a schema change; please confirm:
--   1) ADDITIVE — a brand-new table; nothing about tasks/events/categories is altered.
--   2) Owner-only RLS is ON — the four owner policies below; the DB only ever touches the
--      owner's rows (auth.uid() = user_id), exactly like the marty_* tables.
--   3) NO foreign key into the spine — the only reference is to auth.users (ownership).
--      `hevy_id` is a PLAIN text value from Hevy, never a tasks/events/categories id.
--   4) UNIQUE (user_id, hevy_id) — so the G3/G4 upsert can never duplicate a workout on a
--      re-run (re-running the backfill is the recovery net; this makes that safe).
--
-- Run this in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis) AFTER the
-- earlier db/ files and BEFORE db/18–21 (they reference this table). You should see
-- "Success. No rows returned."

-- 1) The workout cache --------------------------------------------------------------
create table if not exists public.gym_workouts (
  id          uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine). Owner gone → their cache too.
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,

  -- Hevy's own workout id (EXTERNAL, plain text — NOT a spine id, NOT a foreign key). The
  -- unique(user_id, hevy_id) below makes the sync upsert idempotent.
  hevy_id     text        not null,

  title       text,
  started_at  timestamptz,
  ended_at    timestamptz,

  created_at  timestamptz not null default now(),

  -- One cached row per Hevy workout, per owner. The upsert (G3/G4) keys on this.
  unique (user_id, hevy_id)
);

-- The marty_* convention: newest-first owner lookups.
create index if not exists gym_workouts_user_created_idx
  on public.gym_workouts (user_id, created_at desc);
-- The real sort key the Form Guide uses (recent sessions, trend): by workout date.
create index if not exists gym_workouts_user_started_idx
  on public.gym_workouts (user_id, started_at desc);

-- 2) Row-level security: the database only ever touches the owner's rows -------------
alter table public.gym_workouts enable row level security;

drop policy if exists "Owner can read own gym_workouts"   on public.gym_workouts;
drop policy if exists "Owner can insert own gym_workouts" on public.gym_workouts;
drop policy if exists "Owner can update own gym_workouts" on public.gym_workouts;
drop policy if exists "Owner can delete own gym_workouts" on public.gym_workouts;

create policy "Owner can read own gym_workouts"
  on public.gym_workouts for select
  using (auth.uid() = user_id);
create policy "Owner can insert own gym_workouts"
  on public.gym_workouts for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own gym_workouts"
  on public.gym_workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own gym_workouts"
  on public.gym_workouts for delete
  using (auth.uid() = user_id);
