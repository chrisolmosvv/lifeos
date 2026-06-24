-- LifeOS — marty_brief (Marty track M8: the brief's numbered action map).
--
-- WHAT THIS IS (plain English): when the 7am brief is sent, it numbers the actionable
-- items (your schedule + what needs attention). This table stores that numbered list so a
-- REPLY like "done 1" — which arrives at the SEPARATE telegram function — can map the
-- number back to the EXACT item the brief showed and act on it (via the M3 edit engine,
-- so it stays undoable). Without this, the number would have to be re-derived from live
-- data and could shift to the wrong item.
--
-- FOR THE CHECKER — please confirm, this is a schema change:
--   1) ONE row per owner (primary key = user_id): the latest brief simply OVERWRITES the
--      old map — there is never a pile-up.
--   2) Additive + owner-only RLS, same shape as the other Marty tables. No spine
--      table/column/policy is changed.
--   3) NO foreign key into tasks/events — the item ids live inside the JSON `items` array
--      as plain values, so a deleted task/event can never block or cascade through this
--      map (a reply to a since-deleted number just gets "that one's gone").
--   4) It only stores a transient pointer list (number → table + id + title). It writes no
--      task/event and does not change their meaning; acting on a number goes through the
--      existing edit path.
--
-- Run this ONCE in the Supabase SQL editor (paste the whole file and Run), AFTER the
-- earlier db/ files. You should see "Success. No rows returned."

-- 1) The numbered-action map ------------------------------------------------------
create table if not exists public.marty_brief (
  -- One map per owner. PRIMARY KEY = user_id makes that structural (a new brief overwrites).
  user_id    uuid        primary key default auth.uid()
                         references auth.users (id) on delete cascade,

  -- The numbered actionable items of the latest brief, as JSON:
  --   [ { "n": 1, "table": "events", "id": "<uuid>", "title": "dentist" }, ... ]
  -- ids are plain values inside JSON (NO FK) so a deleted item can't block/cascade.
  items      jsonb       not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

-- 2) Row-level security: the database only ever touches the owner's row -------------
alter table public.marty_brief enable row level security;

drop policy if exists "Owner can read own marty_brief"   on public.marty_brief;
drop policy if exists "Owner can insert own marty_brief" on public.marty_brief;
drop policy if exists "Owner can update own marty_brief" on public.marty_brief;
drop policy if exists "Owner can delete own marty_brief" on public.marty_brief;

create policy "Owner can read own marty_brief"
  on public.marty_brief for select
  using (auth.uid() = user_id);
create policy "Owner can insert own marty_brief"
  on public.marty_brief for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own marty_brief"
  on public.marty_brief for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own marty_brief"
  on public.marty_brief for delete
  using (auth.uid() = user_id);
