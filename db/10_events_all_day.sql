-- LifeOS — events.all_day (Phase 7, Calendar C7: the all-day / multi-day band).
-- The ONLY database change in the whole Calendar rebuild.
--
-- ADDITIVE and non-destructive: it ADDS one boolean column to the events table.
-- It does NOT rename, drop, or edit any existing column or row. Every existing
-- event gets all_day = false (a normal timed event), so the app behaves exactly
-- as before until the C7 UI starts setting the flag. RLS/policies are unchanged.
--
-- Data model (owner's pick, model "a"): all_day = true means the event is an
-- all-day item; start_at / end_at carry the DATE(S) (normalised to local
-- midnight, end-EXCLUSIVE: a Mon–Wed all-day stores end_at = Thu 00:00), and the
-- time is ignored. Multi-day = an end on a later date. The grid/band read the
-- flag and render by date.
--
-- Run this ONCE in the Supabase SQL editor (paste the whole file and Run), AFTER
-- db/09_archive.sql. Safe to re-run (idempotent via `if not exists`).

alter table public.events
  add column if not exists all_day boolean not null default false;

-- Verify (optional, run after): the column exists and every existing row is
-- false (count unchanged, no all-day items yet).
--   select count(*) as events, bool_or(all_day) as any_all_day from public.events;
-- Expect: events = your current count, any_all_day = false (or null if 0 rows).
