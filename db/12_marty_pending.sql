-- LifeOS — marty_pending (Marty track M4: hold a half-finished capture between two texts).
--
-- WHAT THIS IS (plain English): the first time the bot needs to remember something across
-- two messages. When a capture is missing the ONE key detail (an event with no time),
-- Marty asks once ("What time?") and parks the half-finished item here; the owner's next
-- message completes it. It is a tiny, short-lived scratchpad — NOT part of the spine.
--
-- FOR THE CHECKER — please confirm, this is a schema change:
--   1) ONE row per owner max (primary key = user_id), so a new question simply REPLACES
--      any old one — there is never a pile of pending captures.
--   2) Short-lived: the code ignores/clears any row older than ~5 minutes, so a stray
--      later message can't attach to a stale question. (Expiry is enforced in code; no
--      DB job needed.)
--   3) Additive + owner-only RLS, same shape as telegram_saves / marty_actions. No spine
--      table/column/policy is changed; no FK into tasks/events/categories; it only ever
--      holds a JSON draft of an UNSAVED item, never a real one.
--   4) It does NOT change the meaning of categories/tasks/events. A parked capture saves
--      a real row only when completed, through the normal capture path (Inbox, source,
--      undoable) — nothing here writes a task/event itself.
--
-- Run this ONCE in the Supabase SQL editor (paste the whole file and Run), AFTER the
-- earlier db/ files. You should see "Success. No rows returned."

-- 1) The scratchpad ----------------------------------------------------------------
create table if not exists public.marty_pending (
  -- One pending capture per owner. PRIMARY KEY = user_id makes that structural: a new
  -- question overwrites the old. Owner gone → their pending row goes too.
  user_id     uuid        primary key default auth.uid()
                          references auth.users (id) on delete cascade,

  -- The half-finished capture (the parsed item so far) as JSON, plus the question Marty
  -- asked. No real task/event exists yet — this is only a draft.
  draft       jsonb       not null,
  question    text,

  created_at  timestamptz not null default now()
);

-- 2) Row-level security: the database only ever touches the owner's row -------------
alter table public.marty_pending enable row level security;

drop policy if exists "Owner can read own marty_pending"   on public.marty_pending;
drop policy if exists "Owner can insert own marty_pending" on public.marty_pending;
drop policy if exists "Owner can update own marty_pending" on public.marty_pending;
drop policy if exists "Owner can delete own marty_pending" on public.marty_pending;

create policy "Owner can read own marty_pending"
  on public.marty_pending for select
  using (auth.uid() = user_id);
create policy "Owner can insert own marty_pending"
  on public.marty_pending for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own marty_pending"
  on public.marty_pending for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own marty_pending"
  on public.marty_pending for delete
  using (auth.uid() = user_id);
