-- LifeOS — categories table (Phase 2, Piece 2: the first real spine table).
-- Buckets that can nest (parent_id self-reference). Inbox is just the first
-- category, not special machinery. Colours/nesting/editing UI come later.
-- Paste this whole file into the Supabase SQL editor and Run it once.

-- 1) The table -------------------------------------------------------------
create table if not exists public.categories (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,
  name       text        not null,
  parent_id  uuid        references public.categories (id) on delete cascade,
  color      text,                       -- stays empty until the Piece-3 palette
  sort_order integer     not null default 0,
  created_at timestamptz not null default now()
);

-- Helpful lookups (owner's rows, and a category's children).
create index if not exists categories_user_id_idx   on public.categories (user_id);
create index if not exists categories_parent_id_idx on public.categories (parent_id);

-- 2) Row-level security: the database only ever touches the owner's rows ----
alter table public.categories enable row level security;

create policy "Owner can read own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Owner can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Owner can update own categories"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- 3) Seed the default Inbox for the owner (single-user app) -----------------
-- Runs as admin here, so auth.uid() is null; we read the owner's id straight
-- from auth.users. Idempotent: won't create a second Inbox if one exists.
insert into public.categories (user_id, name, sort_order)
select u.id, 'Inbox', 0
from auth.users u
where not exists (
  select 1 from public.categories c
  where c.user_id = u.id and c.name = 'Inbox'
);
