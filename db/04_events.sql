-- LifeOS — events table (Phase 4, Piece 4a: the next spine table).
-- Things that HAPPEN and you attend. Built to the FULL architecture shape now
-- (calendar-standard start/end, location, repeat rule, and the hidden
-- external_id for future Apple Calendar sync) so the Phase-4b timeline and that
-- sync bolt on with no rebuild — even though this piece's UI only proves an
-- event saves, reads and deletes.
--
-- Run this AFTER db/01_categories.sql, db/02_categories_guards.sql and
-- db/03_tasks.sql, once, in the Supabase SQL editor (paste the whole file and
-- Run). It ADDS the events table; it does NOT change the tasks/categories
-- tables' meaning. RLS stays owner-only.

-- 1) The table -------------------------------------------------------------
create table if not exists public.events (
  id           uuid        primary key default gen_random_uuid(),

  -- Owner reference. Defaults to the logged-in owner so a client can't forge
  -- one (same pattern as tasks/categories). Owner gone → their events go too.
  user_id      uuid        not null default auth.uid()
                           references auth.users (id) on delete cascade,

  title        text        not null,
  notes        text,

  -- The category this event belongs to. NULL means uncategorised (same as
  -- tasks). ON DELETE SET NULL: if a category is deleted, its events have their
  -- category EMPTIED, never deleted. NEVER cascade — silent loss of events is
  -- unacceptable. This deliberately mirrors the tasks table exactly.
  category_id  uuid        references public.categories (id) on delete set null,

  -- The event's span, built to the calendar standard. Both required.
  start_at     timestamptz not null,
  end_at       timestamptz not null,

  location     text,                 -- optional (no map/lookup, just text)

  -- Recurrence (later). A standard rule string only for now — NO recurrence
  -- logic is built this piece; the field just exists so 4b+ can fill it.
  repeat_rule  text,

  -- Hidden field from the architecture doc: free prep for future Apple Calendar
  -- sync. Nullable, never shown in any UI.
  external_id  text,

  created_at   timestamptz not null default now(),

  -- Sanity guard: an event can never end before it starts (zero-length is ok).
  constraint events_end_not_before_start check (end_at >= start_at)
);

-- Helpful lookups: the owner's rows, a category's events, and by start time
-- (the timeline in 4b will read events for a day in start order).
create index if not exists events_user_id_idx     on public.events (user_id);
create index if not exists events_category_id_idx on public.events (category_id);
create index if not exists events_start_at_idx    on public.events (start_at);

-- 2) Row-level security: the database only ever touches the owner's rows ----
alter table public.events enable row level security;

create policy "Owner can read own events"
  on public.events for select
  using (auth.uid() = user_id);

create policy "Owner can insert own events"
  on public.events for insert
  with check (auth.uid() = user_id);

create policy "Owner can update own events"
  on public.events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete own events"
  on public.events for delete
  using (auth.uid() = user_id);
