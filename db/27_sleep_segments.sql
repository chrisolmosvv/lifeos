-- LifeOS — store sleep SEGMENTS per night (Health → Track S, S5b: hypnogram storage).
--
-- WHAT THIS IS (plain English): one new, optional column on the existing sleep_nights
-- table. The sleep ingest function ALREADY computes each night's time-ordered stage
-- segments (Core 23:14→00:02, Deep 00:02→00:38, REM…) in memory while it clusters the
-- night — then throws them away after writing the totals. This column gives those
-- segments a home, so the Sleep front page (S6) can draw a real hypnogram and let you
-- tap into any past night. Storage only — no screen, no calc reads, in this task.
--
-- The shape we store (chronological, the page derives durations itself):
--   [{"stage":"Core","start":"2026-06-24T23:14:00+02:00","end":"2026-06-25T00:02:00+02:00"},
--    {"stage":"Deep","start":"…","end":"…"}, …]
-- Stage values are the function's canonical set: REM / Core / Deep / Awake / inbed /
-- asleep (the last two lowercase — same normalization the per-stage TOTALS already use;
-- S6 maps them to display labels). start + end are ISO timestamps; duration is NOT stored.
--
-- FOR THE CHECKER — this is a schema change; please confirm:
--   1) ADDITIVE + NULLABLE — ONE new column, `add column if not exists`. No existing
--      column is altered or dropped; no default is set, so every existing sleep_nights
--      row keeps its current values and simply has segments = NULL (= "no hypnogram",
--      distinct from an empty array). Older nights stay valid.
--   2) NO change to constraints, indexes, RLS, or policies — the new column inherits
--      sleep_nights' existing owner-only RLS (auth.uid() = user_id) automatically. The
--      latest-wins upsert key (user_id, night_date) is untouched.
--   3) MODULE table, NOT the spine — this only touches sleep_nights. Nothing about
--      tasks/events/categories is changed, and there is no foreign key into the spine.
--   4) The function change that POPULATES this column is a SEPARATE, later commit; this
--      DDL is safe to run on its own (the column just stays NULL until the function ships).
--
-- Run this in the Supabase SQL editor (Frankfurt project cntlptuacsujbdtwvbis) AFTER the
-- earlier db/ files. You should see "Success. No rows returned."

alter table public.sleep_nights
  add column if not exists segments jsonb;

-- Optional doc note on the column (no behaviour change; safe to re-run).
comment on column public.sleep_nights.segments is
  'Chronological stage segments of the night''s kept main session: '
  '[{stage,start,end}] (stage = REM/Core/Deep/Awake/inbed/asleep; ISO timestamps; '
  'duration derived on read). NULL for nights ingested before S5b. Written by the '
  'health-ingest sleep handler on the latest-wins upsert.';

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY (read-only; run after the column is added):
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'sleep_nights' and column_name = 'segments';
--   -- expect ONE row: segments | jsonb | YES
