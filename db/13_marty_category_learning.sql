-- LifeOS — marty_category_learning (Marty track M6: learn how the owner files things).
--
-- WHAT THIS IS (plain English): a log of category CORRECTIONS. On capture Marty GUESSES a
-- category and shows it; when the owner corrects it in words, that correction is recorded
-- here. The guess logic READS this log and only starts applying a learned preference once
-- the SAME kind of correction has happened a few times (threshold = 2 — see below). One
-- correction fixes one item; it does NOT retrain Marty.
--
-- LEARNING THRESHOLD (stated for the checker + owner): a preference is applied to a new
-- item once there are >= 2 past corrections to the SAME category among items that share a
-- content word with it. So: 1 correction = one-off (no retrain); the 2nd matching
-- correction establishes the pattern, and the NEXT similar capture auto-files there. The
-- threshold lives in code (categorize.ts, LEARN_THRESHOLD), not here.
--
-- FOR THE CHECKER — please confirm, this is a schema change:
--   1) ADDITIVE + owner-only RLS — a brand-new table, same shape/policies as the other
--      Marty tables (telegram_saves / marty_actions / marty_pending). No spine
--      table/column/policy is changed.
--   2) NO foreign key into categories/tasks/events — guessed_category_id and
--      corrected_category_id are plain uuids (NOT FKs), so deleting a category can never be
--      blocked or cascaded by this log. A learned preference pointing at a since-deleted
--      category is simply ignored (the code checks the category still exists).
--   3) It only LOGS corrections (title + guessed + corrected category ids). It writes no
--      task/event/category and does not change their meaning. The only behaviour change on
--      the spine is that capture now writes a real category_id (a value the column already
--      allows) instead of always null.
--
-- Run this ONCE in the Supabase SQL editor (paste the whole file and Run), AFTER the
-- earlier db/ files. You should see "Success. No rows returned."

-- 1) The corrections log -----------------------------------------------------------
create table if not exists public.marty_category_learning (
  id                     uuid        primary key default gen_random_uuid(),

  -- Owner reference (same anti-spoof pattern as the spine). Owner gone → their log goes too.
  user_id                uuid        not null default auth.uid()
                                     references auth.users (id) on delete cascade,

  -- What was captured, what Marty guessed, and what the owner corrected it to. The two
  -- category ids are PLAIN uuids (NO FK) on purpose: a deleted category must never block or
  -- cascade through this log; a stale id is just ignored by the guess logic.
  item_title             text        not null,
  guessed_category_id    uuid,                 -- null = Marty had guessed Inbox / no category
  corrected_category_id  uuid,                 -- null = corrected TO Inbox / no category

  created_at             timestamptz not null default now()
);

-- Newest-first lookups for the owner (the guess reads recent corrections).
create index if not exists marty_category_learning_user_created_idx
  on public.marty_category_learning (user_id, created_at desc);

-- 2) Row-level security: the database only ever touches the owner's rows -----------
alter table public.marty_category_learning enable row level security;

drop policy if exists "Owner can read own marty_category_learning"   on public.marty_category_learning;
drop policy if exists "Owner can insert own marty_category_learning" on public.marty_category_learning;
drop policy if exists "Owner can update own marty_category_learning" on public.marty_category_learning;
drop policy if exists "Owner can delete own marty_category_learning" on public.marty_category_learning;

create policy "Owner can read own marty_category_learning"
  on public.marty_category_learning for select
  using (auth.uid() = user_id);
create policy "Owner can insert own marty_category_learning"
  on public.marty_category_learning for insert
  with check (auth.uid() = user_id);
create policy "Owner can update own marty_category_learning"
  on public.marty_category_learning for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owner can delete own marty_category_learning"
  on public.marty_category_learning for delete
  using (auth.uid() = user_id);
