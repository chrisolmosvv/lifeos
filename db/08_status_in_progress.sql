-- LifeOS — tasks.status: add the middle "in progress" state (Phase 7, T7).
--
-- ADDITIVE: widens the allowed-value set of tasks.status from ('open','done')
-- to ('open','in_progress','done'). 'open' still means "to do" and 'done' still
-- means done — neither is renamed, and NO existing row is touched (every current
-- row is 'open', and 'open'/'done' both stay valid). The NOT NULL and the
-- default 'open' are unchanged.
--
-- Postgres can't edit a CHECK constraint in place, so we drop the 2-value check
-- and add the 3-value superset. This only ever ALLOWS MORE; it can never
-- invalidate an existing row. The completed_at trigger (tasks_sync_completed_at,
-- db/03_tasks.sql) already stamps completed_at on 'done' and clears it otherwise,
-- so 'in_progress' (not 'done') correctly carries no finish time — no trigger
-- change needed.

alter table public.tasks drop constraint tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open', 'in_progress', 'done'));
