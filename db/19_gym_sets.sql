-- LifeOS — gym_sets (Health → Gym track, G2: the workout cache — table 3 of 5).
--
-- WHAT THIS IS (plain English): one row per SET within a cached exercise (e.g. 80kg × 5).
-- Read-only cache, written by G3/G4, read by the app. We store ONLY raw Hevy values — every
-- derived number (PR, estimated 1RM, top-set, volume) is computed ON READ in the src/ calc
-- util, never stored here (no drift; backfill stays the single source of truth).
--
-- HOW IT LINKS (stated for the checker + owner): to its EXERCISE by internal row id
-- (`exercise_id` → gym_exercises.id), ON DELETE CASCADE — an INTRA-MODULE FK, not a spine ref.
--
-- TWO RAW-CACHE CHOICES, stated:
--   • set_type is PLAIN text with NO check constraint. Hevy tags each set
--     normal/warmup/dropset/failure, but it is an EXTERNAL value — a strict CHECK would make
--     the sync FAIL if Hevy ever sends a tag we didn't list. For a read-only cache that is the
--     wrong trade; the known tags + the warm-up exclusion live in the read-time calc util.
--   • Cardio columns (distance_m, duration_seconds) are INCLUDED NOW, nullable. Hevy returns
--     them per set; capturing them now means we never have to re-pull history to add them.
--
-- FOR THE CHECKER — this is a schema change; please confirm:
--   1) ADDITIVE — brand-new table; nothing about tasks/events/categories is altered.
--   2) Owner-only RLS is ON — the four owner policies below (auth.uid() = user_id).
--   3) NO foreign key into the spine — references are ONLY to auth.users (ownership) and
--      gym_exercises (intra-module).
--
-- Run in the Supabase SQL editor (Frankfurt cntlptuacsujbdtwvbis) AFTER db/18 and BEFORE
-- db/20. You should see "Success. No rows returned."

-- 1) The sets cache -----------------------------------------------------------------
create table if not exists public.gym_sets (
  id                uuid        primary key default gen_random_uuid(),

  -- Owner reference (carried on every row so RLS is a simple owner check, no join).
  user_id           uuid        not null default auth.uid()
                                references auth.users (id) on delete cascade,

  -- Parent exercise, by internal row id (INTRA-MODULE FK — never a spine reference).
  exercise_id       uuid        not null
                                references public.gym_exercises (id) on delete cascade,

  position          integer,    -- order of this set within the exercise
  weight_kg         numeric,    -- raw Hevy value (kg)
  reps              integer,    -- raw Hevy value
  set_type          text,       -- raw Hevy tag (normal/warmup/dropset/failure) — no CHECK, see header
  rpe               numeric,    -- raw Hevy value, nullable

  -- Cardio, raw + nullable (kept from the start so we never re-pull to add them).
  distance_m        numeric,
  duration_seconds  integer,

  created_at        timestamptz not null default now()
);

-- The marty_* convention: newest-first owner lookups.
create index if not exists gym_sets_user_created_idx
  on public.gym_sets (user_id, created_at desc);
-- The real read path: fetch an exercise's sets (FKs are not auto-indexed in Postgres).
create index if not exists gym_sets_exercise_idx
  on public.gym_sets (exercise_id);

-- 2) Row-level security: the database only ever touches the owner's rows -------------
alter table public.gym_sets enable row level security;

drop policy if exists "Owner can read own gym_sets"   on public.gym_sets;
drop policy if exists "Owner can insert own gym_sets" on public.gym_sets;
drop policy if exists "Owner can update own gym_sets" on public.gym_sets;
drop policy if exists "Owner can delete own gym_sets" on public.gym_sets;

create policy "Owner can read own gym_sets"
  on public.gym_sets for select
  using (auth.uid() = user_id);
create policy "Owner can insert own gym_sets"
  on public.gym_sets for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own gym_sets"
  on public.gym_sets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own gym_sets"
  on public.gym_sets for delete
  using (auth.uid() = user_id);
