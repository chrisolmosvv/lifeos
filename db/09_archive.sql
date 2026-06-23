-- LifeOS — Archive foundation (Phase 7, Archive A1): universal soft-delete storage.
-- ADDITIVE ONLY. Adds a new table + two nullable columns on each spine table. It
-- does NOT change any existing column, default, trigger, FK, or RLS policy, and
-- edits no existing row. Every existing row stays archived_at = NULL (active), so
-- the app behaves exactly as before (no query filters on archived_at yet — that's
-- A3; the delete→archive write path is A2).

-- 1) The batch table — one row per delete action, so a delete can be restored as
--    a unit. Same per-user shape + RLS as the spine tables (owner-only).
create table if not exists public.archive_batches (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,
  label       text,                  -- e.g. the deleted category's name / item title
  source_type text        check (source_type in ('category', 'task', 'event')),
  created_at  timestamptz not null default now()
);
create index if not exists archive_batches_user_id_idx on public.archive_batches (user_id);

alter table public.archive_batches enable row level security;

drop policy if exists "Owner can read own archive_batches"   on public.archive_batches;
drop policy if exists "Owner can insert own archive_batches" on public.archive_batches;
drop policy if exists "Owner can update own archive_batches" on public.archive_batches;
drop policy if exists "Owner can delete own archive_batches" on public.archive_batches;

create policy "Owner can read own archive_batches"
  on public.archive_batches for select
  using (auth.uid() = user_id);
create policy "Owner can insert own archive_batches"
  on public.archive_batches for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own archive_batches"
  on public.archive_batches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own archive_batches"
  on public.archive_batches for delete
  using (auth.uid() = user_id);

-- 2) The two soft-delete columns on each spine table (additive, nullable).
--    NULL archived_at = active; set = archived. archive_batch_id links to the
--    delete action; ON DELETE SET NULL so dropping a batch never deletes spine rows.
alter table public.tasks
  add column if not exists archived_at      timestamptz,
  add column if not exists archive_batch_id uuid references public.archive_batches (id) on delete set null;

alter table public.events
  add column if not exists archived_at      timestamptz,
  add column if not exists archive_batch_id uuid references public.archive_batches (id) on delete set null;

alter table public.categories
  add column if not exists archived_at      timestamptz,
  add column if not exists archive_batch_id uuid references public.archive_batches (id) on delete set null;

-- Helpful lookups: restore-by-batch on each table.
create index if not exists tasks_archive_batch_idx      on public.tasks (archive_batch_id);
create index if not exists events_archive_batch_idx     on public.events (archive_batch_id);
create index if not exists categories_archive_batch_idx on public.categories (archive_batch_id);
