// LifeOS — Health → Gym: the G3 backfill (one-shot history loader).
//
// Pages through Hevy's GET /v1/workouts and writes every workout/exercise/set
// into the G2 tables. Idempotent (the write layer upserts workouts + replaces
// children), so a re-run never duplicates and a clean STOP is always safe.
//
// DEFENSIVE PAGING — Hevy's real rate ceiling is still unknown (G1 saw no
// headers), so we assume it's low: a short delay between pages (never a tight
// loop), and on a 429 we back off ONCE politely, then STOP and report how far we
// got. We also surface every rate-limit header we see — this run is where we
// finally measure Hevy's limit before wiring the G5 cron.

import { fetchWorkoutsPage, HEVY_PAGE_SIZE, rateLimitInfo } from "./hevy.ts";
import { replaceWorkoutChildren, upsertWorkout } from "./store.ts";

// A few hundred ms between page requests — polite, never a hammer loop.
const PAGE_DELAY_MS = 350;
// Safety stop so a missing page_count can never spin forever (92 workouts ≈ 10
// pages at pageSize 10; 200 pages = 2000 workouts of headroom).
const MAX_PAGES = 200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Num = number | null;
const num = (v: unknown): Num => (typeof v === "number" ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

// Map ONE raw Hevy workout object → our table rows. Stated field choices (Hevy's
// documented v1 shape; we read tolerant fallbacks so a renamed field degrades to
// null rather than crashing the backfill):
//   workout:  id→hevy_id, title, start_time→started_at, end_time→ended_at
//   exercise: index→position, title, exercise_template_id (kept now for G6)
//   set:      index→position, weight_kg, reps, type→set_type (raw, verbatim),
//             rpe, distance_meters→distance_m, duration_seconds
export function mapWorkout(raw: Record<string, unknown>) {
  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];
  const exercises = rawExercises.map((e) => {
    const ex = e as Record<string, unknown>;
    const rawSets = Array.isArray(ex.sets) ? ex.sets : [];
    const sets = rawSets.map((s) => {
      const set = s as Record<string, unknown>;
      return {
        position: num(set.index),
        weight_kg: num(set.weight_kg),
        reps: num(set.reps),
        set_type: str(set.type ?? set.set_type), // Hevy's raw tag, stored verbatim — no transform
        rpe: num(set.rpe),
        distance_m: num(set.distance_meters ?? set.distance_m ?? set.distance),
        duration_seconds: num(set.duration_seconds ?? set.duration),
      };
    });
    return {
      title: str(ex.title),
      position: num(ex.index),
      exercise_template_id: str(ex.exercise_template_id),
      sets,
    };
  });
  return {
    workout: {
      hevy_id: str(raw.id) ?? "",
      title: str(raw.title),
      started_at: str(raw.start_time ?? raw.started_at),
      ended_at: str(raw.end_time ?? raw.ended_at),
    },
    exercises,
  };
}

export type BackfillReport = {
  ok: boolean;
  mode: "backfill";
  workouts_written: number;
  exercises_written: number;
  sets_written: number;
  pages_fetched: number;
  page_size: number;
  delay_ms: number;
  rate_limit_429s: number;
  rate_limits_seen: Record<string, string>;
  stopped_early: boolean;
  note: string;
};

export async function runBackfill(): Promise<BackfillReport> {
  const report: BackfillReport = {
    ok: false,
    mode: "backfill",
    workouts_written: 0,
    exercises_written: 0,
    sets_written: 0,
    pages_fetched: 0,
    page_size: HEVY_PAGE_SIZE,
    delay_ms: PAGE_DELAY_MS,
    rate_limit_429s: 0,
    rate_limits_seen: {},
    stopped_early: false,
    note: "",
  };

  const stop = (note: string): BackfillReport => {
    report.stopped_early = true;
    report.note = note;
    return report;
  };

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await sleep(PAGE_DELAY_MS);

    let res = await fetchWorkoutsPage(page);

    // 429 (or any rate-limit signal): ONE polite backoff, then stop if still hit.
    if (!res.ok && res.status === 429) {
      report.rate_limit_429s++;
      report.rate_limits_seen = { ...report.rate_limits_seen, ...res.rate };
      const retry = Number(res.rate["retry-after"]);
      const wait = Number.isFinite(retry) && retry > 0 ? Math.min(retry * 1000, 10000) : 2000;
      await sleep(wait);
      res = await fetchWorkoutsPage(page);
      if (!res.ok && res.status === 429) {
        report.rate_limit_429s++;
        return stop(`Hit Hevy's rate limit (429) on page ${page} after one backoff — stopped cleanly. Re-run to continue; nothing duplicates.`);
      }
    }

    if (!res.ok) {
      return stop(`Hevy returned HTTP ${res.status} on page ${page} — stopped. (${res.note})`);
    }

    // Record any rate-limit headers this page exposed (the measurement).
    if (Object.keys(res.rate).length > 0) {
      report.rate_limits_seen = { ...report.rate_limits_seen, ...res.rate };
    }

    report.pages_fetched++;

    // Empty page = past the end (also our fallback when page_count is absent).
    if (res.workouts.length === 0) break;

    for (const raw of res.workouts) {
      const { workout, exercises } = mapWorkout(raw as Record<string, unknown>);
      if (!workout.hevy_id) {
        return stop(`A workout on page ${page} had no id — stopped to avoid a bad row. Payload shape may differ from Hevy's documented schema.`);
      }
      const workoutId = await upsertWorkout(workout);
      if (!workoutId) return stop(`Couldn't write workout ${workout.hevy_id} (page ${page}) — stopped. Re-run is safe.`);
      report.workouts_written++;

      const counts = await replaceWorkoutChildren(workoutId, exercises);
      if (!counts) return stop(`Couldn't write children for workout ${workout.hevy_id} (page ${page}) — stopped. Re-run is safe.`);
      report.exercises_written += counts.exercises;
      report.sets_written += counts.sets;
    }

    // Stop once we've fetched the last page Hevy reported (when it tells us).
    if (res.pageCount !== null && page >= res.pageCount) break;
  }

  report.ok = true;
  report.note = report.note ||
    `Backfill complete. Re-running is safe — workouts upsert on (user_id, hevy_id) and children are replaced.`;
  return report;
}
