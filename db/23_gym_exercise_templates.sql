-- LifeOS — gym_exercise_templates (Health → Gym track, G6: the exercise dictionary).
--
-- WHAT THIS IS (plain English): a read-only lookup table mapping a Hevy EXERCISE TEMPLATE id
-- → its name + muscle group(s) (+ a few bonus fields). `gym_exercises` already stores
-- `exercise_template_id` (captured at G3); this dictionary lets the G7 calc layer turn that id
-- into "Bench Press (Barbell), chest" and compute body-part balance. Filled read-only from
-- Hevy's GET /v1/exercise_templates by the gym function's "sync_templates" mode. A CACHE of an
-- external source, NOT part of the task/event/category spine.
--
-- SHAPE (confirmed off live Hevy data in G6 Part 1): each template is
--   { id, title, type, primary_muscle_group (single string), secondary_muscle_groups (string[]),
--     equipment, is_custom }.
-- Muscle groups are stored RAW as text / text[] (no enum, no CHECK) — exactly like `set_type`:
-- an external value must never break the fill; the known values live in the G7 calc layer.
--
-- FOR THE CHECKER — this is a schema change; please confirm all four:
--   1) ADDITIVE — a brand-new table; nothing about tasks/events/categories is altered.
--   2) Owner-only RLS is ON — the four owner policies below; the DB only ever touches the
--      owner's rows (auth.uid() = user_id).
--   3) NO foreign key into the spine — the only reference is to auth.users (ownership).
--      `template_id` is a PLAIN text value (Hevy's), and the link to `gym_exercises` is BY
--      THAT VALUE with NO foreign key (same "plain id, no FK" rule as the marty_* tables).
--   4) UNIQUE (user_id, template_id) — so the "sync_templates" fill upserts idempotently and
--      can never duplicate a template on a re-run.
--
-- Run this ONCE in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis) AFTER the
-- earlier db/ files. You should see "Success. No rows returned."

-- 1) The exercise dictionary ---------------------------------------------------------
create table if not exists public.gym_exercise_templates (
  id                       uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine). Owner gone → their dictionary too.
  user_id                  uuid        not null default auth.uid()
                                       references auth.users (id) on delete cascade,

  -- Hevy's exercise template id (EXTERNAL, plain text — NOT a spine id, NOT a foreign key).
  -- gym_exercises.exercise_template_id matches this BY VALUE; the unique below keys the upsert.
  template_id              text        not null,

  title                    text,
  type                     text,       -- raw Hevy: weight_reps / reps_only / duration / ...
  primary_muscle_group     text,       -- raw Hevy single value, e.g. 'chest'
  secondary_muscle_groups  text[],     -- raw Hevy list, e.g. {glutes,lower_back} (often empty)
  equipment                text,       -- raw Hevy: barbell / dumbbell / machine / none / other
  is_custom                boolean,    -- raw Hevy: an owner-made template vs the default library

  created_at               timestamptz not null default now(),

  -- One dictionary row per Hevy template, per owner. The fill upserts on this.
  unique (user_id, template_id)
);

-- The JOIN key (id → name/muscle) is the unique index above. This extra index serves the G7
-- body-part-balance aggregation (group the owner's exercises by primary muscle).
create index if not exists gym_exercise_templates_user_muscle_idx
  on public.gym_exercise_templates (user_id, primary_muscle_group);

-- 2) Row-level security: the database only ever touches the owner's rows -------------
alter table public.gym_exercise_templates enable row level security;

drop policy if exists "Owner can read own gym_exercise_templates"   on public.gym_exercise_templates;
drop policy if exists "Owner can insert own gym_exercise_templates" on public.gym_exercise_templates;
drop policy if exists "Owner can update own gym_exercise_templates" on public.gym_exercise_templates;
drop policy if exists "Owner can delete own gym_exercise_templates" on public.gym_exercise_templates;

create policy "Owner can read own gym_exercise_templates"
  on public.gym_exercise_templates for select
  using (auth.uid() = user_id);
create policy "Owner can insert own gym_exercise_templates"
  on public.gym_exercise_templates for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own gym_exercise_templates"
  on public.gym_exercise_templates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own gym_exercise_templates"
  on public.gym_exercise_templates for delete
  using (auth.uid() = user_id);
