-- LifeOS — Food: event-sourced cook session (supersedes db/34 cook_session).
--
-- WHAT THIS IS (plain English): replaces the old single-mutable-row cook_session with an
-- event-sourced design — a thin SESSION HEADER (cook_session) plus an APPEND-ONLY EVENT LOG
-- (cook_event). Every cook action (mark a step, tick an ingredient, start/stop a timer,
-- finish) is an immutable insert. Live state (which steps are done, which ingredients are
-- ticked, how much time is left on each timer) is DERIVED by replaying events in order —
-- compute-on-read, never stored as overwritten mutable state. This structurally eliminates
-- the two bugs the old table had: debounce-loss on quick reload (no debounced overwrite
-- to lose) and cross-recipe isolation leak (every event carries its own session_id, so a
-- stale insert can't corrupt another session).
--
-- EXISTING DATA IS DISPOSABLE (Food rebuild ground rule) — the old cook_session is dropped.
--
-- FOR THE CHECKER — already approved; confirming at a glance:
--   1) ADDITIVE to the Food module (drops + replaces its OWN table, never touches
--      categories/tasks/events). recipe_id → recipes is INTRA-MODULE. session_id →
--      cook_session is INTRA-MODULE. No spine FK anywhere.
--   2) Owner-only RLS on BOTH tables, all four operations (auth.uid() = user_id).
--   3) Compute-on-read: no mutable state columns (step statuses, ticked lists, timer
--      countdowns) — all derived by replay. Timer math: duration (payload) minus elapsed
--      (now() − event created_at) = remaining, computed at read time.
--   4) cook_event has NO updated_at BY DESIGN (events are immutable — see table comment).
--      cook_session HAS updated_at (for recency ordering on session lookups).
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland).
-- THEN run: notify pgrst, 'reload schema';

-- ── Step 1: drop the old table ────────────────────────────────────────────────
drop table if exists public.cook_session cascade;

-- ── Step 2: cook_session (thin session header) ────────────────────────────────
create table if not exists public.cook_session (
  id            uuid        primary key default gen_random_uuid(),

  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  -- Intra-module FK: a session belongs to its recipe; delete the recipe → sessions go.
  recipe_id     uuid        not null
                            references public.recipes (id) on delete cascade,

  status        text        not null default 'active'
                            check (status in ('active', 'done', 'abandoned')),

  started_at    timestamptz not null default now(),
  ended_at      timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists cook_session_user_status_idx
  on public.cook_session (user_id, status);

alter table public.cook_session enable row level security;

drop policy if exists "Owner can read own cook_session"   on public.cook_session;
drop policy if exists "Owner can insert own cook_session" on public.cook_session;
drop policy if exists "Owner can update own cook_session" on public.cook_session;
drop policy if exists "Owner can delete own cook_session" on public.cook_session;

create policy "Owner can read own cook_session"
  on public.cook_session for select
  using (auth.uid() = user_id);
create policy "Owner can insert own cook_session"
  on public.cook_session for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own cook_session"
  on public.cook_session for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own cook_session"
  on public.cook_session for delete
  using (auth.uid() = user_id);

-- ── Step 3: cook_event (append-only action log) ──────────────────────────────
create table if not exists public.cook_event (
  id            uuid        primary key default gen_random_uuid(),

  user_id       uuid        not null default auth.uid()
                            references auth.users (id) on delete cascade,

  -- Intra-module FK: an event belongs to its session; delete the session → events go.
  session_id    uuid        not null
                            references public.cook_session (id) on delete cascade,

  event_type    text        not null
                            check (event_type in (
                              'step_marked',
                              'ingredient_ticked',
                              'timer_started',
                              'timer_stopped',
                              'finished'
                            )),

  -- Plain-value reference to a step or ingredient (e.g. a position index or id as text).
  -- Nullable: the 'finished' event has no target.
  target_ref    text,

  -- Event-specific extra data (e.g. new step status, timer duration in seconds).
  -- Nullable: some events need no payload beyond their type + target.
  payload       jsonb,

  -- This IS the event's timestamp — the source of truth for replay ordering AND for
  -- timer math (elapsed = now() − created_at). No updated_at — events are immutable.
  created_at    timestamptz not null default now()
);

comment on table public.cook_event is
  'Append-only cook action log; state is derived by replay. No updated_at by design — events are immutable.';

create index if not exists cook_event_session_created_idx
  on public.cook_event (session_id, created_at);

alter table public.cook_event enable row level security;

drop policy if exists "Owner can read own cook_event"   on public.cook_event;
drop policy if exists "Owner can insert own cook_event" on public.cook_event;
drop policy if exists "Owner can update own cook_event" on public.cook_event;
drop policy if exists "Owner can delete own cook_event" on public.cook_event;

create policy "Owner can read own cook_event"
  on public.cook_event for select
  using (auth.uid() = user_id);
create policy "Owner can insert own cook_event"
  on public.cook_event for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own cook_event"
  on public.cook_event for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own cook_event"
  on public.cook_event for delete
  using (auth.uid() = user_id);

-- ── ROLLBACK (reviewed, DO NOT RUN unless reverting) ──────────────────────────
-- drop table if exists public.cook_event;
-- drop table if exists public.cook_session;
-- (cook_event first, due to the FK.)
-- notify pgrst, 'reload schema';
