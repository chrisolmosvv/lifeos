-- LifeOS — gym_pins (Health → Gym track, G2: the workout cache — table 5 of 5).
--
-- WHAT THIS IS (plain English): the owner's pinned lifts for the Records screen (G14) —
-- "keep Bench Press and Squat at the top." Trivial shape, defined now so the Records screen
-- needs no new schema later. The ONLY owner-authored gym table (the other four are a pure
-- cache of Hevy); even so it's just a list of pointers, nothing derived.
--
-- HOW A PIN IDENTIFIES A LIFT (stated for the checker + owner): by
-- `exercise_template_id` (Hevy's template id), NOT by exercise title. Why: the template id is
-- stable across title renames and is the SAME key the G6 muscle-group lookup and the Records
-- screen use; a title can change or be duplicated. It is a PLAIN text value — no FK anywhere.
--
-- FOR THE CHECKER — this is a schema change; please confirm:
--   1) ADDITIVE — brand-new table; nothing about tasks/events/categories is altered.
--   2) Owner-only RLS is ON — the four owner policies below (auth.uid() = user_id).
--   3) NO foreign key into the spine — the only reference is to auth.users (ownership).
--      `exercise_template_id` is a PLAIN text value (Hevy's), never a spine id.
--
-- Run in the Supabase SQL editor (Frankfurt cntlptuacsujbdtwvbis) AFTER db/20. You should see
-- "Success. No rows returned." (This is the last G2 file.)

-- 1) The pins -----------------------------------------------------------------------
create table if not exists public.gym_pins (
  id                    uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine). Owner gone → their pins too.
  user_id               uuid        not null default auth.uid()
                                    references auth.users (id) on delete cascade,

  -- The lift to pin, by Hevy template id (plain text — no FK). See header for why.
  exercise_template_id  text        not null,

  created_at            timestamptz not null default now(),

  -- A lift can be pinned at most once per owner.
  unique (user_id, exercise_template_id)
);

-- The marty_* convention: newest-first owner lookups.
create index if not exists gym_pins_user_created_idx
  on public.gym_pins (user_id, created_at desc);

-- 2) Row-level security: the database only ever touches the owner's rows -------------
alter table public.gym_pins enable row level security;

drop policy if exists "Owner can read own gym_pins"   on public.gym_pins;
drop policy if exists "Owner can insert own gym_pins" on public.gym_pins;
drop policy if exists "Owner can update own gym_pins" on public.gym_pins;
drop policy if exists "Owner can delete own gym_pins" on public.gym_pins;

create policy "Owner can read own gym_pins"
  on public.gym_pins for select
  using (auth.uid() = user_id);
create policy "Owner can insert own gym_pins"
  on public.gym_pins for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own gym_pins"
  on public.gym_pins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own gym_pins"
  on public.gym_pins for delete
  using (auth.uid() = user_id);
