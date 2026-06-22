-- LifeOS — telegram_saves (Phase 5, Piece 5e: the bot's own undo log).
-- A small, SEPARATE bookkeeping table so the Telegram bot can safely "undo" the
-- last thing IT saved. It records, per saved item, which core table the row lives
-- in and that row's id. Undo reads the most recent entry and deletes that exact
-- row by id — so it can NEVER touch a task/event you made in the app yourself.
--
-- This ADDS a table; it does NOT change the meaning of categories/tasks/events
-- (per CLAUDE.md "modules add tables, protect the spine"). RLS stays owner-only.
--
-- Run this AFTER the earlier db/ files, once, in the Supabase SQL editor (paste
-- the whole file and Run). You should see "Success. No rows returned."

-- 1) The table -------------------------------------------------------------
create table if not exists public.telegram_saves (
  id          uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine tables). Owner gone →
  -- their log entries go too.
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,

  -- Which core table the saved row is in, and its id. We do NOT add a foreign key
  -- here on purpose: if the row is deleted elsewhere (e.g. in the app), the log
  -- entry simply becomes stale and undo reports "already gone" — it must never
  -- block or cascade-delete a core row.
  item_table  text        not null check (item_table in ('tasks', 'events')),
  item_id     uuid        not null,

  title       text,                 -- for a friendly "Removed the event 'dentist'."
  created_at  timestamptz not null default now()
);

-- Newest-first lookups for the owner (undo reads the single most recent entry).
create index if not exists telegram_saves_user_created_idx
  on public.telegram_saves (user_id, created_at desc);

-- 2) Row-level security: the database only ever touches the owner's rows -----
alter table public.telegram_saves enable row level security;

create policy "Owner can read own telegram_saves"
  on public.telegram_saves for select
  using (auth.uid() = user_id);

create policy "Owner can insert own telegram_saves"
  on public.telegram_saves for insert
  with check (auth.uid() = user_id);

create policy "Owner can update own telegram_saves"
  on public.telegram_saves for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete own telegram_saves"
  on public.telegram_saves for delete
  using (auth.uid() = user_id);
