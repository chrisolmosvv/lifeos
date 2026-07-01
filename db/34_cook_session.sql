-- LifeOS — Food V2 P7: cook_session (resume-a-cook persistence). The ONE object deferred at P0.
--
-- WHAT THIS IS (plain English): storage so a cooking session SURVIVES leaving the page / reloading.
-- The marquee cook page persists what you've done — which steps are struck, which ingredients ticked,
-- which timers are running (and WHEN they finish), each step's board column, and whether the cook is
-- still active or done. One row per cook session. It does NOT store the schedule (that's recomputed on
-- read from step durations each render) — only the SESSION STATE. Deferred to P7 because its shape
-- depends on the kanban design, which is now known.
--
-- FOR THE CHECKER — please confirm at a glance:
--   1) ADDITIVE — ONE brand-new table. NOTHING about the task/event/category spine is altered
--      (no ALTER/DROP/RENAME on the spine anywhere).
--   2) NO foreign key into the spine — the only references are (a) user_id → auth.users (ownership,
--      the same anti-spoof pattern as gym_*/health/food_*), and (b) an INTRA-MODULE FK recipe_id →
--      recipes (Food → Food, on delete cascade — a session dies with its recipe). `status` is a
--      CHECK-constrained plain value, never a spine id.
--   3) Owner-only RLS is ON — the four owner policies below (select/insert/update/delete,
--      auth.uid() = user_id), exactly like the other food_*/recipe_* tables.
--   4) NO stored derived numbers — the cooking SCHEDULE is computed on read from step durations; only
--      SESSION STATE persists here. timer_ends stores END timestamps (not remaining seconds) so a
--      countdown resumes correctly after a reload.
--
-- Run in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis — NOT Ireland) AFTER
-- db/33_food_entry_label.sql. You should see "Success. No rows returned." THEN run
--   notify pgrst, 'reload schema';
-- so PostgREST picks up the new table before the P7 UI reads/writes it.

create table if not exists public.cook_session (
  id                 uuid        primary key default gen_random_uuid(),

  -- Owner reference (anti-spoof, same as the spine). Owner gone → their sessions too.
  user_id            uuid        not null default auth.uid()
                                 references auth.users (id) on delete cascade,

  -- Intra-module: the recipe being cooked. A session dies with its recipe.
  recipe_id          uuid        references public.recipes (id) on delete cascade,

  -- Session STATE (jsonb so the shape can evolve without a migration per field):
  struck_steps       jsonb       not null default '[]'::jsonb,   -- step indices marked done
  ticked_ingredients jsonb       not null default '[]'::jsonb,   -- ingredient indices ticked
  timer_ends         jsonb       not null default '{}'::jsonb,   -- { "<stepIdx>"|"manual": END ISO } — END, not remaining
  board_states       jsonb       not null default '{}'::jsonb,   -- { "<stepIdx>": "waiting"|"active"|"done" }

  status             text        not null default 'active'
                                 check (status in ('active', 'done')),
  dismissed          boolean     not null default false,         -- a DONE card stays until manually dismissed

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Resume lookup: the active, non-dismissed session for a recipe (owner-scoped).
create index if not exists cook_session_user_recipe_status_idx
  on public.cook_session (user_id, recipe_id, status);

alter table public.cook_session enable row level security;

drop policy if exists "Owner can read own cook_session"   on public.cook_session;
drop policy if exists "Owner can insert own cook_session" on public.cook_session;
drop policy if exists "Owner can update own cook_session" on public.cook_session;
drop policy if exists "Owner can delete own cook_session" on public.cook_session;

create policy "Owner can read own cook_session"
  on public.cook_session for select using (auth.uid() = user_id);
create policy "Owner can insert own cook_session"
  on public.cook_session for insert with check (auth.uid() = user_id);
create policy "Owner can update own cook_session"
  on public.cook_session for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own cook_session"
  on public.cook_session for delete using (auth.uid() = user_id);

-- ── ROLLBACK (reviewed, DO NOT RUN unless reverting this commit) ─────────────────────────────
--   drop table if exists public.cook_session;
--   notify pgrst, 'reload schema';
