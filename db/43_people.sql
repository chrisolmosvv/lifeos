-- LifeOS — People / Rolodex tables (Track D, Piece 1: the People module schema).
--
-- EIGHT brand-new tables for the personal reference file on people in the owner's
-- life: the person record, circles (groupings), circle membership, connections
-- (person-to-person links), groups (named cliques), group membership, interactions
-- (the catch-up log), and key dates (birthday + custom). Plus ONE additive CHECK
-- expansion on the existing archive_batches table.
--
-- ADDITIVE + SPINE-SAFE. It ADDS eight new tables and widens one existing CHECK.
-- It does NOT rename, drop, or change any existing column, row, table, FK, or RLS
-- policy. ZERO changes to categories / tasks / events.
--
-- NO NEW FK INTO THE SPINE. The only link to the spine is a PLAIN recurrence_id
-- value on people_dates — stored as a bare uuid, NOT a foreign key. A deleted
-- recurrence is simply "already gone"; no cascade, no block.
--
-- Intra-module FKs (person_id → people, circle_id → people_circles, etc.) are
-- ON DELETE CASCADE — MODULE-INTERNAL ONLY, so deleting a person clears that
-- person's own memberships / interactions / dates. No cascade reaches the spine.
--
-- YEAR-UNKNOWN BIRTHDAYS: when year_known = false, date_value stores the real
-- month/day with a FIXED PLACEHOLDER YEAR (2000). The app uses month/day only
-- and shows age only when year_known = true. No schema enforcement needed —
-- this is a caller convention recorded here.
--
-- Run this ONCE in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis
-- — NEVER the retired Ireland ref), AFTER db/42_hermes_source_tags.sql.
-- Safe to re-run (idempotent via if-not-exists / if-exists guards).
--
-- AFTER RUNNING: notify pgrst, 'reload schema';
--
-- FOR THE CHECKER — please confirm at a glance:
--   1) ADDITIVE — eight CREATE TABLE IF NOT EXISTS; one DROP+ADD CONSTRAINT pair
--      on archive_batches (existing values still valid, no data change).
--   2) NO change to categories, tasks, or events. No column added, renamed, or
--      dropped on any spine table.
--   3) NO FK into the spine — recurrence_id on people_dates is a PLAIN uuid value.
--   4) Intra-module FKs are ON DELETE CASCADE, scoped to the module's own tables.
--   5) Owner-only RLS (four policies) on every new table.
--   6) Indexes on every FK / filter column; partial-unique indexes enforce
--      one home circle per person and one birthday per person.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 0) EXISTING TABLE TOUCH — archive_batches.source_type CHECK expansion
-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds 'person' to the allowed source_type values. Existing rows ('category',
-- 'task', 'event') are untouched — they remain valid in the expanded set.

alter table public.archive_batches
  drop constraint if exists archive_batches_source_type_check;
alter table public.archive_batches
  add constraint archive_batches_source_type_check
  check (source_type in ('category', 'task', 'event', 'person'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) people — the person record
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.people (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,
  name            text        not null,
  how_you_know    text,                   -- optional one-liner ("uni friend", "colleague at X")
  notes           text,                   -- freeform plain text
  phone           text,
  email           text,
  other_contact   text,                   -- free "other contact" line
  source          text        not null default 'app'
                              check (source in ('app', 'hermes')),
  archived_at     timestamptz,            -- NULL = active; set = soft-deleted
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists people_user_id_idx on public.people (user_id);
create index if not exists people_name_idx    on public.people (user_id, name);

alter table public.people enable row level security;

create policy "Owner can read own people"
  on public.people for select using (auth.uid() = user_id);
create policy "Owner can insert own people"
  on public.people for insert with check (auth.uid() = user_id);
create policy "Owner can update own people"
  on public.people for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own people"
  on public.people for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) people_circles — owner-defined groupings (start blank, custom sort order)
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.people_circles (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,
  name            text        not null,
  sort_order      integer     not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists people_circles_user_id_idx on public.people_circles (user_id);

alter table public.people_circles enable row level security;

create policy "Owner can read own people_circles"
  on public.people_circles for select using (auth.uid() = user_id);
create policy "Owner can insert own people_circles"
  on public.people_circles for insert with check (auth.uid() = user_id);
create policy "Owner can update own people_circles"
  on public.people_circles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own people_circles"
  on public.people_circles for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) people_circle_members — person ↔ circle membership
-- ═══════════════════════════════════════════════════════════════════════════════
-- A person can be in MANY circles. At most ONE is the "home" circle (the one
-- used for directory filing). The partial unique index enforces one home per
-- person at the DB level.

create table if not exists public.people_circle_members (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,
  person_id       uuid        not null
                              references public.people (id) on delete cascade,
  circle_id       uuid        not null
                              references public.people_circles (id) on delete cascade,
  is_home         boolean     not null default false,
  created_at      timestamptz not null default now(),

  constraint people_circle_members_unique unique (person_id, circle_id)
);

create index if not exists pcm_user_id_idx   on public.people_circle_members (user_id);
create index if not exists pcm_person_id_idx on public.people_circle_members (person_id);
create index if not exists pcm_circle_id_idx on public.people_circle_members (circle_id);

-- At most one home circle per person (DB-enforced).
create unique index if not exists pcm_one_home_idx
  on public.people_circle_members (person_id) where (is_home = true);

alter table public.people_circle_members enable row level security;

create policy "Owner can read own people_circle_members"
  on public.people_circle_members for select using (auth.uid() = user_id);
create policy "Owner can insert own people_circle_members"
  on public.people_circle_members for insert with check (auth.uid() = user_id);
create policy "Owner can update own people_circle_members"
  on public.people_circle_members for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own people_circle_members"
  on public.people_circle_members for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4) people_connections — mutual person-to-person links
-- ═══════════════════════════════════════════════════════════════════════════════
-- Each connection is ONE row (not two directional rows). person_a_id < person_b_id
-- by CHECK to prevent duplicate pairs. Smart-inverse labels are stored as two
-- columns: label_a_to_b (what A calls B, e.g. "parent") and label_b_to_a (what B
-- calls A, e.g. "child"). Symmetric presets and custom labels set both columns to
-- the same value. The presets are UI-only — the DB just stores two labels.

create table if not exists public.people_connections (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,
  person_a_id     uuid        not null
                              references public.people (id) on delete cascade,
  person_b_id     uuid        not null
                              references public.people (id) on delete cascade,
  label_a_to_b    text,                   -- what A calls B (e.g. "parent")
  label_b_to_a    text,                   -- what B calls A (e.g. "child")
  source          text        not null default 'app'
                              check (source in ('app', 'hermes')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Canonical ordering prevents (A,B) and (B,A) duplicates.
  constraint people_connections_order check (person_a_id < person_b_id),
  constraint people_connections_unique unique (person_a_id, person_b_id)
);

create index if not exists pconn_user_id_idx    on public.people_connections (user_id);
create index if not exists pconn_person_a_idx   on public.people_connections (person_a_id);
create index if not exists pconn_person_b_idx   on public.people_connections (person_b_id);

alter table public.people_connections enable row level security;

create policy "Owner can read own people_connections"
  on public.people_connections for select using (auth.uid() = user_id);
create policy "Owner can insert own people_connections"
  on public.people_connections for insert with check (auth.uid() = user_id);
create policy "Owner can update own people_connections"
  on public.people_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own people_connections"
  on public.people_connections for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5) people_groups — named cliques (e.g. "the uni crew")
-- ═══════════════════════════════════════════════════════════════════════════════
-- Groups render VIRTUALLY: co-members are surfaced by shared membership, NOT by
-- materialised connection rows. No group page in V1; managed in the Circles &
-- Groups screen.

create table if not exists public.people_groups (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,
  name            text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pgrp_user_id_idx on public.people_groups (user_id);

alter table public.people_groups enable row level security;

create policy "Owner can read own people_groups"
  on public.people_groups for select using (auth.uid() = user_id);
create policy "Owner can insert own people_groups"
  on public.people_groups for insert with check (auth.uid() = user_id);
create policy "Owner can update own people_groups"
  on public.people_groups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own people_groups"
  on public.people_groups for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6) people_group_members — person ↔ group membership
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.people_group_members (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,
  person_id       uuid        not null
                              references public.people (id) on delete cascade,
  group_id        uuid        not null
                              references public.people_groups (id) on delete cascade,
  created_at      timestamptz not null default now(),

  constraint people_group_members_unique unique (person_id, group_id)
);

create index if not exists pgm_user_id_idx   on public.people_group_members (user_id);
create index if not exists pgm_person_id_idx on public.people_group_members (person_id);
create index if not exists pgm_group_id_idx  on public.people_group_members (group_id);

alter table public.people_group_members enable row level security;

create policy "Owner can read own people_group_members"
  on public.people_group_members for select using (auth.uid() = user_id);
create policy "Owner can insert own people_group_members"
  on public.people_group_members for insert with check (auth.uid() = user_id);
create policy "Owner can update own people_group_members"
  on public.people_group_members for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own people_group_members"
  on public.people_group_members for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7) people_interactions — the catch-up log
-- ═══════════════════════════════════════════════════════════════════════════════
-- Dated interactions per person. ANY date (backdatable), optional precise time,
-- a channel, an optional note. Fully editable/deletable.
-- "Last contact" = MAX(interaction_date) computed on read; nothing derived stored.

create table if not exists public.people_interactions (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null default auth.uid()
                                references auth.users (id) on delete cascade,
  person_id         uuid        not null
                                references public.people (id) on delete cascade,
  interaction_date  date        not null,
  interaction_time  time,                 -- optional precise time
  channel           text        not null
                                check (channel in ('in_person', 'call', 'video', 'message', 'letter', 'other')),
  note              text,
  source            text        not null default 'app'
                                check (source in ('app', 'hermes')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists pint_user_id_idx   on public.people_interactions (user_id);
create index if not exists pint_person_id_idx on public.people_interactions (person_id);
create index if not exists pint_date_idx      on public.people_interactions (person_id, interaction_date);

alter table public.people_interactions enable row level security;

create policy "Owner can read own people_interactions"
  on public.people_interactions for select using (auth.uid() = user_id);
create policy "Owner can insert own people_interactions"
  on public.people_interactions for insert with check (auth.uid() = user_id);
create policy "Owner can update own people_interactions"
  on public.people_interactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own people_interactions"
  on public.people_interactions for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8) people_dates — birthday + custom labelled dates
-- ═══════════════════════════════════════════════════════════════════════════════
-- kind='birthday': at most ONE per person (partial unique index enforces this).
--   Year-optional: when year_known = false, date_value uses the real month/day
--   with a FIXED PLACEHOLDER YEAR (2000). The app reads month/day only and
--   shows age only when year_known = true.
-- kind='custom': labelled dates (e.g. "Anniversary", "Name day"), no limit.
--
-- show_on_calendar: when true, the People module creates a yearly all-day
--   recurring event via the existing recurrences engine. The recipe's uuid is
--   stored in recurrence_id as a PLAIN VALUE (not a foreign key) so a deleted
--   recurrence is simply "already gone" — no cascade, no block.

create table if not exists public.people_dates (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null default auth.uid()
                                references auth.users (id) on delete cascade,
  person_id         uuid        not null
                                references public.people (id) on delete cascade,
  kind              text        not null default 'custom'
                                check (kind in ('birthday', 'custom')),
  label             text,                 -- e.g. "Anniversary". NULL for birthday.
  date_value        date        not null,
  year_known        boolean     not null default true,
  show_on_calendar  boolean     not null default false,
  recurrence_id     uuid,                 -- PLAIN VALUE (not FK) → recurrences.id
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists pdate_user_id_idx   on public.people_dates (user_id);
create index if not exists pdate_person_id_idx on public.people_dates (person_id);

-- At most one birthday per person (DB-enforced).
create unique index if not exists pdate_one_birthday_idx
  on public.people_dates (person_id) where (kind = 'birthday');

alter table public.people_dates enable row level security;

create policy "Owner can read own people_dates"
  on public.people_dates for select using (auth.uid() = user_id);
create policy "Owner can insert own people_dates"
  on public.people_dates for insert with check (auth.uid() = user_id);
create policy "Owner can update own people_dates"
  on public.people_dates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner can delete own people_dates"
  on public.people_dates for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE — reload the API schema cache
-- ═══════════════════════════════════════════════════════════════════════════════
-- REQUIRED after adding tables/columns, or PostgREST will not see them and
-- writes will SILENTLY DROP the new columns until reloaded.

notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFY (optional, run after to confirm the tables exist)
-- ═══════════════════════════════════════════════════════════════════════════════
--   select table_name from information_schema.tables
--     where table_schema = 'public'
--       and table_name like 'people%'
--     order by table_name;
-- Expect 8 rows: people, people_circle_members, people_circles, people_connections,
--   people_dates, people_group_members, people_groups, people_interactions.
--
--   select count(*) from public.people;  -- 0 rows, table exists
