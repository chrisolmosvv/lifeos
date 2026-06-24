-- LifeOS — gym_exercises (Health → Gym track, G2: the workout cache — table 2 of 5).
--
-- WHAT THIS IS (plain English): one row per EXERCISE within a cached Hevy workout (e.g.
-- "Bench Press" inside Monday's session). Read-only cache, written by G3/G4, read by the app.
--
-- HOW IT LINKS TO ITS WORKOUT (a design choice, stated for the checker + owner): by the
-- parent's INTERNAL row id (`workout_id` → gym_workouts.id), ON DELETE CASCADE — NOT by
-- Hevy's hevy_id. Why: a row-id link is the stable Postgres-native parent/child link and
-- cascades cleanup (re-syncing or removing a workout drops its exercises automatically).
-- This is an INTRA-MODULE foreign key (gym → gym); it does NOT point into the spine.
--
-- `exercise_template_id` (Hevy's template id) is captured FROM THE START so the G6
-- muscle-group lookup can be added later WITHOUT re-pulling history.
--
-- FOR THE CHECKER — this is a schema change; please confirm:
--   1) ADDITIVE — brand-new table; nothing about tasks/events/categories is altered.
--   2) Owner-only RLS is ON — the four owner policies below (auth.uid() = user_id).
--   3) NO foreign key into the spine — references are ONLY to auth.users (ownership) and
--      gym_workouts (intra-module). `exercise_template_id` is a PLAIN text value from Hevy.
--
-- Run in the Supabase SQL editor (Frankfurt cntlptuacsujbdtwvbis) AFTER db/17 and BEFORE
-- db/19. You should see "Success. No rows returned."

-- 1) The exercises cache ------------------------------------------------------------
create table if not exists public.gym_exercises (
  id                    uuid        primary key default gen_random_uuid(),

  -- Owner reference (carried on every row so RLS is a simple owner check, no join).
  user_id               uuid        not null default auth.uid()
                                    references auth.users (id) on delete cascade,

  -- Parent workout, by internal row id (INTRA-MODULE FK — never a spine reference).
  workout_id            uuid        not null
                                    references public.gym_workouts (id) on delete cascade,

  title                 text,
  position              integer,    -- order of this exercise within the workout
  exercise_template_id  text,       -- Hevy template id (plain text; G6 muscle-group key)

  created_at            timestamptz not null default now()
);

-- The marty_* convention: newest-first owner lookups.
create index if not exists gym_exercises_user_created_idx
  on public.gym_exercises (user_id, created_at desc);
-- The real read path: fetch a workout's exercises (FKs are not auto-indexed in Postgres).
create index if not exists gym_exercises_workout_idx
  on public.gym_exercises (workout_id);

-- 2) Row-level security: the database only ever touches the owner's rows -------------
alter table public.gym_exercises enable row level security;

drop policy if exists "Owner can read own gym_exercises"   on public.gym_exercises;
drop policy if exists "Owner can insert own gym_exercises" on public.gym_exercises;
drop policy if exists "Owner can update own gym_exercises" on public.gym_exercises;
drop policy if exists "Owner can delete own gym_exercises" on public.gym_exercises;

create policy "Owner can read own gym_exercises"
  on public.gym_exercises for select
  using (auth.uid() = user_id);
create policy "Owner can insert own gym_exercises"
  on public.gym_exercises for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own gym_exercises"
  on public.gym_exercises for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own gym_exercises"
  on public.gym_exercises for delete
  using (auth.uid() = user_id);
