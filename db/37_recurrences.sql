-- LifeOS — recurrences (Phase 7, T10 Piece 1): repeating events + tasks.
-- The "recipe" for a repeat: one row describes a pattern (daily/weekly/monthly/
-- yearly + an end condition) and the template fields, and the app GENERATES real
-- events/tasks rows ("occurrences") from it. Occurrences are ordinary rows, so
-- they render through the existing pipeline with no new drawing code. Time is
-- stored DST-safe: a wall-clock time + a fixed timezone, so "09:00 every Monday"
-- stays 09:00 across daylight-saving changes.
--
-- ADDITIVE + spine-safe. It ADDS one new table (recurrences) and TWO nullable
-- columns to events AND tasks (series_id, series_detached). It does NOT rename,
-- drop, or change the meaning of any existing column or row: an existing event/
-- task keeps series_id = NULL and series_detached = false and behaves EXACTLY as
-- before. series_id points OUT to the new recurrences table (the same shape as
-- events already pointing out to categories) — it is NOT a new FK INTO the spine,
-- and ON DELETE SET NULL means deleting a recipe never cascade-deletes its
-- occurrences. The dormant events.repeat_rule column is LEFT UNTOUCHED.
--
-- Run this ONCE in the Supabase SQL editor (paste the whole file and Run), AFTER
-- db/36_focus_sessions.sql. Safe to re-run (idempotent via if-not-exists). RLS is
-- owner-only, matching events/tasks/categories. After running, reload the API
-- schema cache (see the bottom of this file) so writes see the new columns/table.

-- 1) The recipe table ------------------------------------------------------
create table if not exists public.recurrences (
  id            uuid        primary key default gen_random_uuid(),

  -- Owner reference. Defaults to the logged-in owner so a client can't forge one
  -- (same pattern as events/tasks). Owner gone → their recipes go too.
  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  -- Does this recipe generate EVENTS or TASKS?
  target_kind   text        not null check (target_kind in ('event', 'task')),

  -- The pattern.
  freq          text        not null check (freq in ('daily', 'weekly', 'monthly', 'yearly')),
  weekdays      smallint[],           -- weekly only; JS getDay() values 0=Sun..6=Sat; null otherwise

  -- The end condition: never / after N times / until a date.
  end_kind      text        not null check (end_kind in ('never', 'count', 'until')),
  end_count     int,                  -- used when end_kind = 'count'
  end_until     date,                 -- used when end_kind = 'until'

  -- Time, stored DST-safe. wall_time null = an all-day event OR a dateless to-do
  -- task; set = a timed occurrence (and, for a task, ALSO calendar-scheduled).
  start_date        date    not null, -- anchor (the first occurrence's date)
  wall_time         time,             -- wall-clock start; null per the note above
  duration_minutes  int,              -- occurrence length for timed items (end = start + duration)
  timezone          text    not null default 'Europe/Amsterdam',

  -- The template stamped onto each generated occurrence.
  title         text        not null,
  notes         text,
  -- Category link — the EXISTING pattern (like events/tasks): ON DELETE SET NULL,
  -- so deleting a category empties the recipe's category, never deletes the recipe.
  category_id   uuid        references public.categories (id) on delete set null,
  location      text,                 -- event template
  all_day       boolean     not null default false,           -- event template
  time_bucket   text        check (time_bucket is null or time_bucket in ('Today', 'This Week', 'Someday')),

  -- Bookkeeping.
  generated_until  date,              -- rolling-window: occurrences materialised through this date
  split_parent_id  uuid    references public.recurrences (id) on delete set null, -- 'this and following' lineage

  created_at    timestamptz not null default now(),

  -- End-condition integrity: the matching field must be present for count/until.
  -- (weekdays stays app-enforced — array checks are fiddly and low-value here.)
  constraint recurrences_end_count_present check (end_kind <> 'count' or end_count is not null),
  constraint recurrences_end_until_present check (end_kind <> 'until' or end_until is not null)
);

-- Helpful lookups: the owner's recipes, and a category's recipes.
create index if not exists recurrences_user_id_idx     on public.recurrences (user_id);
create index if not exists recurrences_category_id_idx on public.recurrences (category_id);

-- 2) Row-level security: the database only ever touches the owner's rows ----
alter table public.recurrences enable row level security;

create policy "Owner can read own recurrences"
  on public.recurrences for select
  using (auth.uid() = user_id);

create policy "Owner can insert own recurrences"
  on public.recurrences for insert
  with check (auth.uid() = user_id);

create policy "Owner can update own recurrences"
  on public.recurrences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete own recurrences"
  on public.recurrences for delete
  using (auth.uid() = user_id);

-- 3) Link occurrences back to their recipe (additive, on BOTH events + tasks) --
-- series_id: null = a one-off (unchanged behaviour); set = an occurrence of that
-- recipe. Points OUT to recurrences; ON DELETE SET NULL so deleting a recipe
-- orphans its occurrences (keeps the rows) rather than cascade-deleting them.
-- series_detached: a "customised occurrence" — a later whole-series edit SKIPS it.
alter table public.events
  add column if not exists series_id       uuid references public.recurrences (id) on delete set null,
  add column if not exists series_detached boolean not null default false;

alter table public.tasks
  add column if not exists series_id       uuid references public.recurrences (id) on delete set null,
  add column if not exists series_detached boolean not null default false;

-- Lookups for "all occurrences of a series" (the edit/delete "all" + "following").
create index if not exists events_series_id_idx on public.events (series_id);
create index if not exists tasks_series_id_idx  on public.tasks  (series_id);

-- 4) After running: reload the API schema cache -----------------------------
-- REQUIRED after adding columns/tables, or PostgREST will not see the new table
-- and will SILENTLY DROP series_id/series_detached on writes until reloaded.
notify pgrst, 'reload schema';

-- 5) Verify (optional, run after) -------------------------------------------
--   select count(*) from public.recurrences;                       -- 0 rows, table exists
--   select column_name from information_schema.columns
--     where table_schema='public' and table_name='events'
--       and column_name in ('series_id','series_detached');        -- 2 rows
--   select column_name from information_schema.columns
--     where table_schema='public' and table_name='tasks'
--       and column_name in ('series_id','series_detached');        -- 2 rows
