-- LifeOS — Finance recurrence extension (Track FIN, Piece 6a): enable recurring bills.
--
-- WHAT THIS IS (plain English): a NARROW extension of the existing `recurrences` table
-- (the repeat-recipe engine used by calendar events and tasks) so it can also generate
-- recurring financial transactions (e.g. monthly rent, weekly subscriptions). Plus a
-- CHECK-constraint widening on `archive_batches` so Finance's recurring-bill series
-- edits (Piece 6c, later) can use the same batch-undo machinery as task/event series.
--
-- ADDITIVE ONLY. Every change is a nullable column addition or a CHECK-constraint
-- widening. No existing row is affected — all new columns default to NULL, and the
-- widened CHECKs accept every value that was previously valid. ZERO changes to
-- categories / tasks / events / finance_accounts / finance_transactions.
--
-- NO NEW FK INTO THE SPINE. The two new id columns (account_id, transfer_account_id)
-- are PLAIN VALUES — they are deliberately NOT foreign keys into finance_accounts.
-- Reason: `recurrences` is shared infrastructure (events, tasks, and now transactions
-- all use it); wiring it to a specific module table via an FK would couple the spine's
-- repeat engine to Finance permanently. If an account is later deleted, the recipe
-- becomes stale (detectable on read), same as a deleted spine category is "already gone"
-- elsewhere in the app.
--
-- NO RLS CHANGE NEEDED. RLS is already enabled on both tables from their original
-- migrations (owner-only, auth.uid() = user_id). Adding nullable columns and widening
-- a CHECK does not change the RLS policies.
--
-- Run this ONCE in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis
-- — NEVER the retired Ireland ref), AFTER db/44_finance.sql.
-- Safe to re-run (idempotent via if-not-exists / if-exists guards).
--
-- FOR THE CHECKER — this is a schema change; please confirm at a glance:
--   1) ADDITIVE — no DROP TABLE, no DROP COLUMN, no data migration. Only ALTER ADD
--      COLUMN (all nullable, if-not-exists) and two CHECK-constraint widenings.
--   2) Every existing recurrence row (event/task recipes) is completely unaffected —
--      all new columns will be NULL on them, and the widened target_kind CHECK still
--      accepts 'event' and 'task'.
--   3) account_id and transfer_account_id are PLAIN VALUES (uuid, no REFERENCES) —
--      deliberately NOT foreign keys. See the reasoning above.
--   4) The archive_batches widening adds 'transaction' — all existing source_type
--      values ('category','task','event','person') remain valid.
--   5) No RLS change — existing owner-only policies on both tables are unaffected.
--
-- AFTER RUNNING: notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) Widen the target_kind CHECK on recurrences
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.recurrences
  drop constraint if exists recurrences_target_kind_check;

alter table public.recurrences
  add constraint recurrences_target_kind_check
  check (target_kind in ('event', 'task', 'transaction'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) Add nullable transaction-template columns to recurrences
-- ═══════════════════════════════════════════════════════════════════════════════
-- These store the template for a recurring bill: what amount, which account,
-- what transaction type. All nullable — existing event/task recipes have these
-- as NULL and behave exactly as before.

alter table public.recurrences
  -- Plain value, not an FK — recurrences stays generic, not wired to a specific module.
  add column if not exists account_id          uuid,
  -- Plain value, not an FK — same reasoning as above.
  add column if not exists transfer_account_id uuid,
  add column if not exists amount              numeric,
  add column if not exists txn_type            text
    check (txn_type is null or txn_type in ('income', 'expense', 'transfer'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) Widen the source_type CHECK on archive_batches
-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds 'transaction' so Finance's recurring-bill series edits (Piece 6c) can
-- use the same batch-undo machinery as task/event series. Regular Finance
-- transaction delete/undo (Piece 4b) does NOT use archive_batches — this is
-- only for the series "this and following" multi-row batch case.
alter table public.archive_batches
  drop constraint if exists archive_batches_source_type_check;

alter table public.archive_batches
  add constraint archive_batches_source_type_check
  check (source_type in ('category', 'task', 'event', 'person', 'transaction'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4) PostgREST cache reload
-- ═══════════════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5) Verify (optional, run after)
-- ═══════════════════════════════════════════════════════════════════════════════
--   -- Existing recurrences untouched (new cols all null):
--   select id, target_kind, amount, account_id, transfer_account_id, txn_type
--   from public.recurrences limit 5;
--
--   -- The CHECK accepts 'transaction':
--   -- (verified by the throwaway insert below)
--
--   -- The CHECK still rejects bogus values:
--   -- insert into public.recurrences (target_kind, ...) values ('nonsense', ...)
--   -- → should fail with CHECK violation
