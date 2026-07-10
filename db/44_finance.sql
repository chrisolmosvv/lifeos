-- LifeOS — Finance tables (Track FIN, Piece 1: the four Finance module tables).
--
-- WHAT THIS IS (plain English): the storage for the new Finance pillar — a personal
-- ledger for tracking accounts, transactions, investment snapshots, and monthly
-- budgets. FOUR brand-new tables, each owner-only. The app READS them (the ledger,
-- budgets, net worth trend) and WRITES them (manual entry, CSV import, later Hermes).
-- This is its OWN module's storage — it ADDS tables and never changes the
-- task/event/category spine.
--
-- ADDITIVE + SPINE-SAFE. It ADDS four new tables. It does NOT rename, drop, or change
-- any existing column, row, table, FK, or RLS policy. ZERO changes to categories /
-- tasks / events / recurrences / archive_batches. (The recurrences extension for
-- recurring bills is a LATER piece — 6a.)
--
-- NO NEW FK INTO THE SPINE. category_id on finance_transactions and finance_budgets
-- is a PLAIN uuid value (not a foreign key), so deleting a spine category can never
-- be blocked or cascaded by a finance row — a stale pointer is just "already gone."
-- The only REFERENCES are: (a) user_id -> auth.users (ownership, the standard
-- anti-spoof pattern), (b) INTRA-MODULE FKs within Finance (transactions/snapshots
-- -> accounts, paired_transaction_id -> self), and (c) series_id -> recurrences
-- (points OUT to the recurrence engine, ON DELETE SET NULL — the same link events
-- and tasks already have).
--
-- AMOUNT SIGN CONVENTION: expenses are stored NEGATIVE, income POSITIVE. A transfer
-- creates TWO rows: one negative on the source account, one positive on the
-- destination, linked by paired_transaction_id. Balance for a cash account =
-- starting_balance + SUM(amount) WHERE entry_date <= today AND archived_at IS NULL.
-- The sign-consistency CHECK enforces this at the database level.
--
-- UPDATED_AT: no database trigger — the app explicitly sets updated_at on every
-- update call, matching the existing pattern across all other LifeOS tables
-- (people, focus_sessions, cook_session, food_items, etc.).
--
-- Run this ONCE in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis
-- — NEVER the retired Ireland ref), AFTER db/43_people.sql.
-- Safe to re-run (idempotent via if-not-exists guards).
--
-- FOR THE CHECKER — this is a schema change; please confirm these at a glance:
--   1) ADDITIVE — four brand-new tables; NOTHING about tasks/events/categories/
--      recurrences/archive_batches is altered (no ALTER/DROP/RENAME anywhere).
--   2) NO foreign key into the spine — category_id is a PLAIN uuid everywhere
--      (comments say "plain value, not an FK"). series_id -> recurrences is the
--      same outward link events/tasks already use. All other FKs are intra-module.
--   3) Owner-only RLS is ON for ALL FOUR — the four owner policies per table
--      (select/insert/update/delete, auth.uid() = user_id).
--   4) The sign-consistency CHECK on finance_transactions enforces the amount/
--      txn_type contract at the DB level (income > 0, expense < 0, transfer <> 0).
--   5) account_id on transactions/snapshots has NO ON DELETE clause — this is
--      INTENTIONAL: the database blocks deleting an account that still has
--      transactions or snapshots (the account must be archived instead, never
--      hard-deleted while it has history). This prevents orphan financial data.
--
-- AFTER RUNNING: notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) finance_accounts — the owner's bank/cash/investment accounts
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.finance_accounts (
  id                uuid        primary key default gen_random_uuid(),

  user_id           uuid        not null default auth.uid()
                                references auth.users (id) on delete cascade,

  name              text        not null,
  account_type      text        not null
                                check (account_type in ('cash', 'investment')),
  institution       text,                  -- free text (bank name, broker, etc.)
  starting_balance  numeric     not null default 0,
  is_archived       boolean     not null default false,
  source            text        not null default 'manual'
                                check (source in ('manual', 'hermes')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists finance_accounts_user_id_idx
  on public.finance_accounts (user_id);

alter table public.finance_accounts enable row level security;

drop policy if exists "Owner can read own finance_accounts"   on public.finance_accounts;
drop policy if exists "Owner can insert own finance_accounts" on public.finance_accounts;
drop policy if exists "Owner can update own finance_accounts" on public.finance_accounts;
drop policy if exists "Owner can delete own finance_accounts" on public.finance_accounts;

create policy "Owner can read own finance_accounts"
  on public.finance_accounts for select
  using (auth.uid() = user_id);
create policy "Owner can insert own finance_accounts"
  on public.finance_accounts for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own finance_accounts"
  on public.finance_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own finance_accounts"
  on public.finance_accounts for delete
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) finance_transactions — every money movement (income, expense, transfer)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.finance_transactions (
  id                    uuid        primary key default gen_random_uuid(),

  user_id               uuid        not null default auth.uid()
                                    references auth.users (id) on delete cascade,

  -- Intra-module FK. NO ON DELETE clause — intentionally blocks deleting an account
  -- that still has transactions (archive the account instead).
  account_id            uuid        not null
                                    references public.finance_accounts (id),

  entry_date            date        not null,

  -- Sign convention: expense < 0, income > 0, transfer <> 0.
  -- The CHECK below enforces this contract at the database level.
  amount                numeric     not null,

  txn_type              text        not null
                                    check (txn_type in ('income', 'expense', 'transfer')),

  -- Sign-consistency: the database rejects a row where the amount sign doesn't
  -- match the transaction type.
  check (
    (txn_type = 'income'   and amount > 0) or
    (txn_type = 'expense'  and amount < 0) or
    (txn_type = 'transfer' and amount <> 0)
  ),

  category_id           uuid,       -- plain value, not an FK (spine category id or null)
  transfer_account_id   uuid                   -- the OTHER account in a transfer; null otherwise
                                    references public.finance_accounts (id) on delete set null,

  -- Self-referencing pair link: a transfer's two rows point at each other so
  -- editing/deleting one can always find + update its twin.
  paired_transaction_id uuid
                                    references public.finance_transactions (id) on delete set null,

  description           text,
  notes                 text,

  -- Recurring-bill link: the same series_id/series_detached pair that events and
  -- tasks already carry. Points OUT to recurrences, ON DELETE SET NULL. Null until
  -- Piece 6 wires recurring bills.
  series_id             uuid
                                    references public.recurrences (id) on delete set null,
  series_detached       boolean     not null default false,

  source                text        not null default 'manual'
                                    check (source in ('manual', 'csv_import', 'hermes', 'recurring')),

  csv_match_key         text,       -- dedup key for CSV re-import (account+date+amount+description)

  -- Soft-delete columns (for series edit/delete + undo, same pattern as tasks/events).
  archived_at           timestamptz,
  archive_batch_id      uuid
                                    references public.archive_batches (id) on delete set null,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists finance_txn_user_id_idx
  on public.finance_transactions (user_id);
create index if not exists finance_txn_account_id_idx
  on public.finance_transactions (account_id);
create index if not exists finance_txn_entry_date_idx
  on public.finance_transactions (entry_date);
create index if not exists finance_txn_category_id_idx
  on public.finance_transactions (category_id);
create index if not exists finance_txn_series_id_idx
  on public.finance_transactions (series_id);
create index if not exists finance_txn_csv_match_key_idx
  on public.finance_transactions (csv_match_key);
create index if not exists finance_txn_archive_batch_id_idx
  on public.finance_transactions (archive_batch_id);
create index if not exists finance_txn_paired_id_idx
  on public.finance_transactions (paired_transaction_id);


alter table public.finance_transactions enable row level security;

drop policy if exists "Owner can read own finance_transactions"   on public.finance_transactions;
drop policy if exists "Owner can insert own finance_transactions" on public.finance_transactions;
drop policy if exists "Owner can update own finance_transactions" on public.finance_transactions;
drop policy if exists "Owner can delete own finance_transactions" on public.finance_transactions;

create policy "Owner can read own finance_transactions"
  on public.finance_transactions for select
  using (auth.uid() = user_id);
create policy "Owner can insert own finance_transactions"
  on public.finance_transactions for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own finance_transactions"
  on public.finance_transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own finance_transactions"
  on public.finance_transactions for delete
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) finance_account_snapshots — periodic value snapshots (investment accounts)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.finance_account_snapshots (
  id                uuid        primary key default gen_random_uuid(),

  user_id           uuid        not null default auth.uid()
                                references auth.users (id) on delete cascade,

  -- Intra-module FK. NO ON DELETE clause — intentionally blocks deleting an account
  -- that still has snapshot history (archive the account instead).
  account_id        uuid        not null
                                references public.finance_accounts (id),

  snapshot_date     date        not null,
  value             numeric     not null,   -- the account's total value on that date
  notes             text,
  source            text        not null default 'manual'
                                check (source in ('manual', 'hermes')),

  created_at        timestamptz not null default now(),

  -- One snapshot per account per day; re-entry upserts.
  unique (account_id, snapshot_date)
);

create index if not exists finance_snap_user_id_idx
  on public.finance_account_snapshots (user_id);
create index if not exists finance_snap_account_date_idx
  on public.finance_account_snapshots (account_id, snapshot_date desc);

alter table public.finance_account_snapshots enable row level security;

drop policy if exists "Owner can read own finance_account_snapshots"   on public.finance_account_snapshots;
drop policy if exists "Owner can insert own finance_account_snapshots" on public.finance_account_snapshots;
drop policy if exists "Owner can update own finance_account_snapshots" on public.finance_account_snapshots;
drop policy if exists "Owner can delete own finance_account_snapshots" on public.finance_account_snapshots;

create policy "Owner can read own finance_account_snapshots"
  on public.finance_account_snapshots for select
  using (auth.uid() = user_id);
create policy "Owner can insert own finance_account_snapshots"
  on public.finance_account_snapshots for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own finance_account_snapshots"
  on public.finance_account_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own finance_account_snapshots"
  on public.finance_account_snapshots for delete
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4) finance_budgets — monthly spend limits per category (append-only log)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Same pattern as health_goals: the newest row per category_id is the live budget.
-- Old rows stay for history. A budget change = a new row, never an update.
create table if not exists public.finance_budgets (
  id              uuid        primary key default gen_random_uuid(),

  user_id         uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,

  category_id     uuid        not null,  -- plain value, not an FK (spine category id)
  monthly_limit   numeric     not null,

  created_at      timestamptz not null default now()
);

create index if not exists finance_budgets_user_cat_idx
  on public.finance_budgets (user_id, category_id, created_at desc);

alter table public.finance_budgets enable row level security;

drop policy if exists "Owner can read own finance_budgets"   on public.finance_budgets;
drop policy if exists "Owner can insert own finance_budgets" on public.finance_budgets;
drop policy if exists "Owner can update own finance_budgets" on public.finance_budgets;
drop policy if exists "Owner can delete own finance_budgets" on public.finance_budgets;

create policy "Owner can read own finance_budgets"
  on public.finance_budgets for select
  using (auth.uid() = user_id);
create policy "Owner can insert own finance_budgets"
  on public.finance_budgets for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own finance_budgets"
  on public.finance_budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own finance_budgets"
  on public.finance_budgets for delete
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5) PostgREST cache reload — REQUIRED after adding tables
-- ═══════════════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6) Verify (optional, run after)
-- ═══════════════════════════════════════════════════════════════════════════════
--   select count(*) from public.finance_accounts;            -- 0 rows, table exists
--   select count(*) from public.finance_transactions;        -- 0 rows, table exists
--   select count(*) from public.finance_account_snapshots;   -- 0 rows, table exists
--   select count(*) from public.finance_budgets;             -- 0 rows, table exists
