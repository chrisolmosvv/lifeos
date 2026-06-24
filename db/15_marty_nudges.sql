-- LifeOS — marty_nudges (Marty track M9: daytime nudge bookkeeping).
--
-- WHAT THIS IS (plain English): scheduling state for the daytime "use this free window"
-- offers. It records each offer made TODAY so the guardrails hold (MAX 2/day — one morning,
-- one afternoon — and never back-to-back), and so a reply ("yes"/"no") arriving at the
-- SEPARATE telegram function can find the open offer and act on it. This is scheduling
-- bookkeeping, NOT a spine change.
--
-- FOR THE CHECKER — please confirm, this is a schema change:
--   1) Additive + owner-only RLS — a brand-new table, same shape/policies as the other
--      Marty tables. No spine table/column/policy is changed.
--   2) NO foreign key into tasks/events — offered_task_id is a plain uuid (NOT an FK), so a
--      deleted task can never block or cascade through this log; a stale offer just gets
--      "that task's gone / window passed".
--   3) It changes nothing about categories/tasks/events. Accepting an offer ("yes") writes
--      the task's scheduled_start/end through the EXISTING edit engine (undoable) — this
--      table only records what was offered + whether it was answered.
--   4) Caps are read PER DAY (rows where created_at >= today's local midnight); older rows
--      are ignored, so a "no" is forgotten tomorrow (no permanent "don't offer X" memory).
--
-- Run this ONCE in the Supabase SQL editor (paste the whole file and Run), AFTER the
-- earlier db/ files. You should see "Success. No rows returned."

-- 1) The offer log -----------------------------------------------------------------
create table if not exists public.marty_nudges (
  id               uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine). Owner gone → their log too.
  user_id          uuid        not null default auth.uid()
                               references auth.users (id) on delete cascade,

  -- The task offered + the free slot offered. offered_task_id is a PLAIN uuid (NO FK) so a
  -- deleted task can never block/cascade through this log.
  offered_task_id  uuid,
  slot_start       timestamptz,
  slot_end         timestamptz,

  -- Which half of the day this offer belongs to — enforces "one morning, one afternoon".
  period           text        check (period in ('morning', 'afternoon')),

  -- false until the owner replies yes/no; once answered the offer is closed.
  answered         boolean     not null default false,

  created_at       timestamptz not null default now()
);

-- Newest-first lookups for the owner (caps read today's rows; yes/no reads the open one).
create index if not exists marty_nudges_user_created_idx
  on public.marty_nudges (user_id, created_at desc);

-- 2) Row-level security: the database only ever touches the owner's rows -------------
alter table public.marty_nudges enable row level security;

drop policy if exists "Owner can read own marty_nudges"   on public.marty_nudges;
drop policy if exists "Owner can insert own marty_nudges" on public.marty_nudges;
drop policy if exists "Owner can update own marty_nudges" on public.marty_nudges;
drop policy if exists "Owner can delete own marty_nudges" on public.marty_nudges;

create policy "Owner can read own marty_nudges"
  on public.marty_nudges for select
  using (auth.uid() = user_id);
create policy "Owner can insert own marty_nudges"
  on public.marty_nudges for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own marty_nudges"
  on public.marty_nudges for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own marty_nudges"
  on public.marty_nudges for delete
  using (auth.uid() = user_id);
