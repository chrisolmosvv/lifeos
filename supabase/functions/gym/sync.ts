// LifeOS — Health → Gym: the G4 incremental sync ("sync" mode).
//
// Pulls ONLY what changed since the last run from Hevy's GET /v1/workouts/events
// (read-only) and applies it locally, reusing the SAME idempotent writer as the G3
// backfill (upsert workout + replace its children) so we never fork a second writer.
//
// SAFETY MODEL (this is the only pipe piece that DELETES local rows):
//   • COLLECT-then-APPLY. We page the whole events feed first; only if every page
//     fetched cleanly do we apply anything. A fetch stop (429/error) applies NOTHING
//     and leaves the cursor untouched — a partial run is always safe to just re-run.
//   • Apply UPDATES first, then DELETES — so if the same batch holds both for one
//     workout, the delete wins (a deleted workout can never be resurrected by an
//     older update in the same run).
//   • A DELETE only ever happens for an EXPLICIT Hevy event of type "deleted",
//     matched by hevy_id. We NEVER infer a delete from a workout's absence. If a
//     "deleted" event arrives that we can't read an id from, we STOP and report the
//     raw event (delete nothing) rather than guess.
//   • The cursor (gym_sync_state.last_event_at) advances ONLY after a fully
//     successful pass, to the newest event time processed — never past what we applied.

import { fetchWorkoutEventsPage, HEVY_PAGE_SIZE } from "./hevy.ts";
import {
  deleteWorkoutByHevyId,
  readSyncCursor,
  replaceWorkoutChildren,
  upsertWorkout,
  writeSyncState,
} from "./store.ts";
import { mapWorkout } from "./backfill.ts";

const PAGE_DELAY_MS = 350;                 // polite gap between pages (same as backfill)
const MAX_PAGES = 400;                      // safety stop; far beyond any real history
const EPOCH = "1970-01-01T00:00:00.000Z";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// since = stored cursor + 1ms (exclude the already-ingested boundary event so a no-op run
// processes nothing), or epoch for the first ever sync. Idempotency makes any overlap safe.
function sinceFrom(cursor: string | null): string {
  if (!cursor) return EPOCH;
  const t = Date.parse(cursor);
  return Number.isFinite(t) ? new Date(t + 1).toISOString() : EPOCH;
}

// The deleted workout's Hevy id from a "deleted" event. CONFIRMED off live data (G4): a
// deleted event is exactly { type:"deleted", id:"<workout hevy_id>", deleted_at:"<iso>" } — so
// we read `id`. The extra fallbacks are belt-and-braces; if NONE yields an id the caller STOPS
// and surfaces the raw event (it must never delete the wrong row, never infer from absence).
function deletedHevyId(ev: Record<string, unknown>): string | null {
  const w = ev.workout as Record<string, unknown> | undefined;
  for (const c of [ev.id, ev.workout_id, ev.hevy_id, w?.id]) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

// The timestamp of an event, for advancing the cursor. CONFIRMED: an "updated" event uses its
// workout.updated_at; a "deleted" event carries `deleted_at`. (Fallbacks kept for safety.)
function eventTime(ev: Record<string, unknown>): string | null {
  const w = ev.workout as Record<string, unknown> | undefined;
  for (const c of [w?.updated_at, ev.deleted_at, ev.updated_at, ev.timestamp, w?.created_at]) {
    if (typeof c === "string") return c;
  }
  return null;
}

const later = (a: string | null, b: string | null): string | null => {
  if (a === null) return b;
  if (b === null) return a;
  return Date.parse(b) > Date.parse(a) ? b : a;
};

export type SyncReport = {
  ok: boolean;
  mode: "sync";
  since: string;
  events_seen: number;
  updated_applied: number;
  deleted_applied: number;
  workout_rows_deleted: number;
  exercises_written: number;
  sets_written: number;
  unknown_events: number;
  pages_fetched: number;
  page_size: number;
  delay_ms: number;
  rate_limit_429s: number;
  rate_limits_seen: Record<string, string>;
  stopped_early: boolean;
  cursor_before: string | null;
  cursor_after: string | null;
  note: string;
};

export async function runSync(): Promise<SyncReport> {
  const cursorBefore = await readSyncCursor();
  const since = sinceFrom(cursorBefore);

  const report: SyncReport = {
    ok: false, mode: "sync", since,
    events_seen: 0, updated_applied: 0, deleted_applied: 0, workout_rows_deleted: 0,
    exercises_written: 0, sets_written: 0, unknown_events: 0,
    pages_fetched: 0, page_size: HEVY_PAGE_SIZE, delay_ms: PAGE_DELAY_MS,
    rate_limit_429s: 0, rate_limits_seen: {}, stopped_early: false,
    cursor_before: cursorBefore, cursor_after: cursorBefore, note: "",
  };
  const stop = (note: string): SyncReport => {
    report.stopped_early = true;
    report.note = note;
    return report; // cursor NOT advanced — re-running is safe
  };

  // 1) COLLECT every changed event since the cursor (apply nothing yet) ---------------
  const events: Record<string, unknown>[] = [];
  let maxTs: string | null = cursorBefore;
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await sleep(PAGE_DELAY_MS);
    let res = await fetchWorkoutEventsPage(since, page);

    if (!res.ok && res.status === 429) {
      report.rate_limit_429s++;
      report.rate_limits_seen = { ...report.rate_limits_seen, ...res.rate };
      const retry = Number(res.rate["retry-after"]);
      await sleep(Number.isFinite(retry) && retry > 0 ? Math.min(retry * 1000, 10000) : 2000);
      res = await fetchWorkoutEventsPage(since, page);
      if (!res.ok && res.status === 429) {
        report.rate_limit_429s++;
        return stop(`Hit Hevy's rate limit (429) on events page ${page} after one backoff — stopped cleanly, applied nothing. Re-run is safe.`);
      }
    }
    if (!res.ok) return stop(`Hevy returned HTTP ${res.status} on events page ${page} — stopped, applied nothing. (${res.note})`);

    if (Object.keys(res.rate).length > 0) report.rate_limits_seen = { ...report.rate_limits_seen, ...res.rate };
    report.pages_fetched++;

    if (res.events.length === 0) break; // past the end (also the no-op case)
    for (const raw of res.events) {
      const ev = raw as Record<string, unknown>;
      events.push(ev);
      maxTs = later(maxTs, eventTime(ev));
    }
    if (res.pageCount !== null && page >= res.pageCount) break;
  }
  report.events_seen = events.length;

  // 2) SEPARATE updates from deletes; a "deleted" we can't parse STOPS the whole run -----
  const updates: Record<string, unknown>[] = [];
  const deleteIds: string[] = [];
  for (const ev of events) {
    const type = ev.type;
    if (type === "updated") {
      updates.push(ev);
    } else if (type === "deleted") {
      const id = deletedHevyId(ev);
      if (!id) {
        return stop(`Saw a Hevy "deleted" event I couldn't read a workout id from — applied NOTHING, cursor unchanged. Raw event: ${JSON.stringify(ev).slice(0, 300)}`);
      }
      deleteIds.push(id);
    } else {
      report.unknown_events++; // ignore unknown event types safely (act only on updated/deleted)
    }
  }

  // 3) APPLY updates first ------------------------------------------------------------
  for (const ev of updates) {
    const { workout, exercises } = mapWorkout(ev.workout as Record<string, unknown>);
    if (!workout.hevy_id) return stop(`An "updated" event had no workout id — stopped. Payload may differ from Hevy's schema.`);
    const wid = await upsertWorkout(workout);
    if (!wid) return stop(`Couldn't write workout ${workout.hevy_id} — stopped. Re-run is safe.`);
    report.updated_applied++;
    const counts = await replaceWorkoutChildren(wid, exercises);
    if (!counts) return stop(`Couldn't write children for workout ${workout.hevy_id} — stopped. Re-run is safe.`);
    report.exercises_written += counts.exercises;
    report.sets_written += counts.sets;
  }

  // 4) APPLY deletes second (so a delete always wins over an update in the same batch) ---
  for (const id of deleteIds) {
    const n = await deleteWorkoutByHevyId(id);
    if (n === null) return stop(`Couldn't apply a delete (hevy_id ${id}) — stopped. Re-run is safe.`);
    report.deleted_applied++;
    report.workout_rows_deleted += n; // 0 = it was already gone (harmless)
  }

  // 5) Success → advance the cursor to the newest event processed ----------------------
  const saved = await writeSyncState({ last_event_at: maxTs, last_synced_at: new Date().toISOString() });
  report.cursor_after = saved ? maxTs : cursorBefore;
  report.ok = saved;
  report.note = saved
    ? `Sync complete. ${report.updated_applied} updated, ${report.deleted_applied} deleted; cursor advanced.`
    : `Applied all changes but couldn't save the cursor — re-running is safe (idempotent), it just re-checks from the old cursor.`;
  return report;
}
