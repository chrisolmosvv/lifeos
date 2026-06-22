-- LifeOS — tasks table (Phase 3, Piece 1: the next spine table).
-- Things to DO. Built to the FULL architecture shape now (priority, time
-- bucket, due date, scheduled start/end, subtasks, source) so later pieces bolt
-- on without a rebuild — even though this piece's UI only touches title,
-- category and done/open.
--
-- Run this AFTER db/01_categories.sql + db/02_categories_guards.sql, once, in
-- the Supabase SQL editor (paste the whole file and Run). It ADDS the tasks
-- table; it does NOT touch the categories table's meaning. RLS stays owner-only.

-- 1) The table -------------------------------------------------------------
create table if not exists public.tasks (
  id              uuid        primary key default gen_random_uuid(),

  -- Owner reference. Defaults to the logged-in owner so a client can't forge
  -- one (same pattern as categories). Owner gone → their tasks go too.
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,

  title           text        not null,
  notes           text,

  -- The bucket this task lives in. NULL is the ONE and ONLY way a task means
  -- "Inbox / uncategorised" — we never re-point it at the real Inbox row's id.
  -- ON DELETE SET NULL: if a category is deleted, its tasks have their category
  -- EMPTIED (so they fall into Inbox), never deleted. NEVER cascade here —
  -- silent task loss is unacceptable.
  category_id     uuid        references public.categories (id) on delete set null,

  -- Subtasks (a later piece). Self-reference. ON DELETE SET NULL: deleting a
  -- parent task PROMOTES its subtasks to standalone tasks rather than deleting
  -- them — same least-destructive rule as the category link. (Revisit when the
  -- subtasks UI is built if we ever want a different behaviour.)
  parent_task_id  uuid        references public.tasks (id) on delete set null,

  -- Fixed-value fields, locked at the DB so a bad value can never be stored —
  -- even though the UI won't touch priority/time_bucket this piece.
  -- priority is nullable (NULL = "no priority set"); a CHECK passes on NULL.
  priority        text        check (priority in ('high', 'med', 'low')),
  time_bucket     text        not null default 'Today'
                              check (time_bucket in ('Today', 'This Week', 'Someday')),

  due_date        date,                 -- optional deadline (picker comes later)
  scheduled_start timestamptz,          -- optional — calendar time-blocking later
  scheduled_end   timestamptz,

  status          text        not null default 'open'
                              check (status in ('open', 'done')),
  -- Set when marked done, cleared when reopened (enforced by the trigger below)
  -- so the "finished at" time can never lie.
  completed_at    timestamptz,

  -- The architecture's "one move that unlocks everything": future modules write
  -- tasks with their own source; typed-in tasks default to this.
  source          text        default 'typed by me',

  created_at      timestamptz not null default now()
);

-- Helpful lookups: the owner's rows, a category's tasks, a parent's subtasks.
create index if not exists tasks_user_id_idx        on public.tasks (user_id);
create index if not exists tasks_category_id_idx    on public.tasks (category_id);
create index if not exists tasks_parent_task_id_idx on public.tasks (parent_task_id);

-- 2) Keep completed_at honest, at the DB level -----------------------------
-- Done → stamp the finish time (if not already set). Open → clear it. This
-- holds no matter who writes the row (the app, Telegram, a future module), so
-- an open task can never carry a stale "finished at" time.
create or replace function public.tasks_sync_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' then
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;   -- reopened (or never done): no finish time
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_sync_completed_at on public.tasks;
create trigger tasks_sync_completed_at
  before insert or update on public.tasks
  for each row execute function public.tasks_sync_completed_at();

-- 3) Row-level security: the database only ever touches the owner's rows ----
alter table public.tasks enable row level security;

create policy "Owner can read own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Owner can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Owner can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);
