-- LifeOS — marty_actions (Marty track M2: the undo FOUNDATION).
--
-- WHAT THIS IS (plain English): a single, generalised "action log" for the Telegram
-- bot, replacing the older telegram_saves (which could only remember "I created row X").
-- Each row here is ONE logical action Marty took, holding ONE OR MORE items, with enough
-- PRIOR STATE to reverse it. This is plumbing for "undo": today the only action type is
-- 'create' (from capture); the structure already holds 'edit' (before-values) and
-- 'delete' (the full prior row) so the M3 edit/delete features need NO further schema
-- change.
--
-- FOR THE CHECKER — please confirm all four, this is a schema change:
--   1) It only logs POINTERS (table + id) and, later, PRIOR VALUES for actions MARTY
--      itself took. It does not record or watch app-made rows.
--   2) It never touches a hand-made (app-created) row — except to restore one that Marty
--      itself deleted, and only on an explicit "undo". Reversal is by id + owner filter.
--   3) It is ADDITIVE and owner-only RLS, exactly like the rest of the spine
--      (telegram_saves / archive_batches use the same shape). No existing table, column,
--      default, trigger, FK, or policy is changed; no existing row is edited.
--   4) It does NOT change the meaning of categories / tasks / events. It is a separate
--      bookkeeping table that only ever points AT them (no FK to them on purpose — see
--      below), so it can never block or cascade-delete a spine row.
--
-- The old telegram_saves table is left in place (additive principle) but is no longer
-- written or read after M2 — it can be dropped in a later cleanup.
--
-- Run this ONCE in the Supabase SQL editor (paste the whole file and Run), AFTER the
-- earlier db/ files. You should see "Success. No rows returned."

-- 1) The action log --------------------------------------------------------------
create table if not exists public.marty_actions (
  id          uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine tables). Owner gone →
  -- their action log goes too.
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,

  -- What kind of action this was — decides how every item in it is reversed.
  -- Only 'create' is written today; 'edit'/'delete' are reserved for M3.
  kind        text        not null check (kind in ('create', 'edit', 'delete')),

  -- A short human label for the whole action (e.g. a title, or "3 items").
  label       text,

  -- The items this action covered, as a JSON array. One element per item, e.g.
  --   create: { "table": "tasks",  "id": "<uuid>", "title": "buy milk" }
  --   edit:   { "table": "events", "id": "<uuid>", "title": "...", "before": { ... } }
  --   delete: { "table": "tasks",  "id": "<uuid>", "title": "...", "row": { ... } }
  -- We deliberately store the id as a value inside JSON (NOT a foreign key) so that if
  -- the row is deleted elsewhere (e.g. in the app), this log simply goes stale and undo
  -- reports "already gone" — it must never block or cascade a spine row.
  items       jsonb       not null default '[]'::jsonb,

  created_at  timestamptz not null default now()
);

-- Newest-first lookups for the owner (undo reads the most recent action(s)).
create index if not exists marty_actions_user_created_idx
  on public.marty_actions (user_id, created_at desc);

-- 2) Row-level security: the database only ever touches the owner's rows -----------
alter table public.marty_actions enable row level security;

drop policy if exists "Owner can read own marty_actions"   on public.marty_actions;
drop policy if exists "Owner can insert own marty_actions" on public.marty_actions;
drop policy if exists "Owner can update own marty_actions" on public.marty_actions;
drop policy if exists "Owner can delete own marty_actions" on public.marty_actions;

create policy "Owner can read own marty_actions"
  on public.marty_actions for select
  using (auth.uid() = user_id);
create policy "Owner can insert own marty_actions"
  on public.marty_actions for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own marty_actions"
  on public.marty_actions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own marty_actions"
  on public.marty_actions for delete
  using (auth.uid() = user_id);
