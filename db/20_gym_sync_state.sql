-- LifeOS — gym_sync_state (Health → Gym track, G2: the workout cache — table 4 of 5).
--
-- WHAT THIS IS (plain English): a tiny ONE-ROW-PER-OWNER scratchpad that remembers where the
-- Hevy sync got to. G4/G5 read it to know "what's new since last time" and write it after a
-- successful sync. Like marty_pending, the PRIMARY KEY is user_id, so there is structurally
-- never more than one row per owner. Bookkeeping only — not part of the spine.
--
-- FOR THE CHECKER — this is a schema change; please confirm:
--   1) ADDITIVE — brand-new table; nothing about tasks/events/categories is altered.
--   2) Owner-only RLS is ON — the four owner policies below (auth.uid() = user_id).
--   3) NO foreign key into the spine — the only reference is to auth.users (ownership).
--   4) One row per owner — PRIMARY KEY user_id (same shape as marty_pending). (No separate
--      (user_id, created_at) index is needed: the primary key already indexes user_id.)
--
-- Run in the Supabase SQL editor (Frankfurt cntlptuacsujbdtwvbis) AFTER db/19 and BEFORE
-- db/21. You should see "Success. No rows returned."

-- 1) The sync scratchpad ------------------------------------------------------------
create table if not exists public.gym_sync_state (
  -- One sync-state row per owner. PRIMARY KEY = user_id makes that structural. Owner gone →
  -- their sync state goes too.
  user_id         uuid        primary key default auth.uid()
                              references auth.users (id) on delete cascade,

  -- When the last successful sync finished.
  last_synced_at  timestamptz,
  -- Incremental cursor: the newest Hevy workout-event time we've ingested. G4 asks Hevy
  -- /v1/workouts/events for everything since this, then advances it.
  last_event_at   timestamptz,

  created_at      timestamptz not null default now()
);

-- 2) Row-level security: the database only ever touches the owner's row -------------
alter table public.gym_sync_state enable row level security;

drop policy if exists "Owner can read own gym_sync_state"   on public.gym_sync_state;
drop policy if exists "Owner can insert own gym_sync_state" on public.gym_sync_state;
drop policy if exists "Owner can update own gym_sync_state" on public.gym_sync_state;
drop policy if exists "Owner can delete own gym_sync_state" on public.gym_sync_state;

create policy "Owner can read own gym_sync_state"
  on public.gym_sync_state for select
  using (auth.uid() = user_id);
create policy "Owner can insert own gym_sync_state"
  on public.gym_sync_state for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own gym_sync_state"
  on public.gym_sync_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own gym_sync_state"
  on public.gym_sync_state for delete
  using (auth.uid() = user_id);
