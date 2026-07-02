-- LifeOS — Focus module (Time Tracker) P1: focus_sessions — the module's FIRST write surface.
--
-- WHAT THIS IS (plain English): one row per focus session — a stretch of time you spent
-- focused on something. It records when you started/stopped, which mode (free count-up, a
-- set count-down, or focus/break intervals), what you were focused on (a task and/or a
-- category — stored SOFT, with a name snapshot so the record still reads right after the
-- task is deleted), a 1–5 star quality rating, and an optional note. A session that is
-- still running is a row with ended_at NULL (it survives a reload and drives the header's
-- live marker); when you Stop, ended_at is filled in. Interval focus/break blocks live in
-- `segments` (jsonb) so nothing is derived-and-stored — only raw blocks. Duration is
-- ALWAYS computed on read, never stored.
--
-- FOR THE CHECKER — please confirm at a glance:
--   1) ADDITIVE — ONE brand-new table. NOTHING about the task/event/category spine is
--      altered (no ALTER/DROP/RENAME on tasks/events/categories anywhere). No change to
--      any other table either — the Focus daily/weekly GOALS reuse the existing
--      `health_goals` table via new goal_type VALUES only ('focus_daily'/'focus_weekly'),
--      and health_goals.goal_type is free `text` with NO check/enum, so that reuse needs
--      NO schema change and is NOT part of this commit (recorded in 03-decisions.md).
--   2) NO foreign key into the spine — the ONLY reference is user_id → auth.users
--      (ownership, the same anti-spoof pattern as gym_*/health_*/food_*/cook_session).
--      task_id and category_id are PLAIN uuid values (soft references): a deleted task or
--      category is never blocked or cascaded — the snapshot columns keep the record whole
--      and a stale pointer is just reported "already gone".
--   3) Owner-only RLS is ON — the four owner policies below (select/insert/update/delete,
--      auth.uid() = user_id), exactly like the other added-module tables.
--   4) NO stored derived numbers — duration/focus-total/rest-total are all computed on
--      read from started_at/ended_at and the raw `segments`. `segments` holds only raw
--      focus/break blocks (each {kind,start,end}); `target_seconds`/`break_seconds` are the
--      chosen SETUP lengths, not outcomes.
--   5) Delete model — a SAVED session is soft-archived (archived_at set; every read filters
--      archived_at IS NULL), with an undo toast. A DISCARDED unsaved running row is HARD
--      deleted by the app (a mis-start never reaches the archive) — no schema support needed.
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland)
-- AFTER db/35_drop_recipe_last_cooked.sql. You should see "Success. No rows returned." THEN run
--   notify pgrst, 'reload schema';
-- so PostgREST picks up the new table before the P1 calc/UI reads or writes it.

create table if not exists public.focus_sessions (
  id                   uuid        primary key default gen_random_uuid(),

  -- Owner reference (anti-spoof, same as the spine). Owner gone → their sessions too.
  user_id              uuid        not null default auth.uid()
                                   references auth.users (id) on delete cascade,

  -- When it ran. ended_at NULL = a live/running session (survives reload, drives the
  -- header marker). Duration is computed on read, never stored.
  started_at           timestamptz not null,
  ended_at             timestamptz,

  -- How it ran. mode is a CHECK-constrained plain value (never a spine id).
  mode                 text        not null
                                   check (mode in ('count_up', 'count_down', 'intervals')),
  target_seconds       int,                              -- count_down length / interval focus length
  break_seconds        int,                              -- intervals only (break length)

  -- What it was about — SOFT references (NO FK into the spine) + delete-proof snapshots.
  task_id              uuid,                             -- plain value, not an FK
  task_title_snapshot  text,                             -- task title captured at log time
  category_id          uuid,                             -- plain value, not an FK
  category_snapshot    jsonb,                            -- { id, name, colour } at log time

  -- Interval focus/break blocks as RAW segments (nothing derived): each
  -- { kind: 'focus'|'break', start: ISO, end: ISO }. Empty for count_up/count_down,
  -- where the single focus block is simply started_at → ended_at.
  segments             jsonb       not null default '[]'::jsonb,

  -- How the row was created. 'timer' = a live session; 'manual' = a back-filled past one.
  source               text        not null default 'timer'
                                   check (source in ('timer', 'manual')),

  -- Session-quality rating: 1 (poor) .. 5 (great). Optional.
  rating               smallint    check (rating between 1 and 5),
  note                 text,

  -- Soft-delete of a SAVED session (NULL = active; a timestamp = archived). Every read
  -- filters archived_at IS NULL. A discarded UNSAVED running row is hard-deleted instead.
  archived_at          timestamptz,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- The running-row lookup (the global marker + resume-on-load): at most one active,
-- non-archived session with no end time, per owner. A partial index keeps it tiny.
create index if not exists focus_sessions_running_idx
  on public.focus_sessions (user_id)
  where ended_at is null and archived_at is null;

-- Day/dial + range reads: sessions by start time, newest first, owner-scoped.
create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);

-- Per-task all-time total (the row tag + the task-form Focus section).
create index if not exists focus_sessions_user_task_idx
  on public.focus_sessions (user_id, task_id);

alter table public.focus_sessions enable row level security;

drop policy if exists "Owner can read own focus_sessions"   on public.focus_sessions;
drop policy if exists "Owner can insert own focus_sessions" on public.focus_sessions;
drop policy if exists "Owner can update own focus_sessions" on public.focus_sessions;
drop policy if exists "Owner can delete own focus_sessions" on public.focus_sessions;

create policy "Owner can read own focus_sessions"
  on public.focus_sessions for select using (auth.uid() = user_id);
create policy "Owner can insert own focus_sessions"
  on public.focus_sessions for insert with check (auth.uid() = user_id);
create policy "Owner can update own focus_sessions"
  on public.focus_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own focus_sessions"
  on public.focus_sessions for delete using (auth.uid() = user_id);

-- ── ROLLBACK (reviewed, DO NOT RUN unless reverting this commit) ─────────────────────────────
--   drop table if exists public.focus_sessions;
--   notify pgrst, 'reload schema';
