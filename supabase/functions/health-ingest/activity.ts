// LifeOS — health-ingest: the activity-samples parse + bucket layer (S3c-fn).
//
// Turns raw Apple-Health samples into hourly buckets and upserts them into
// activity_hourly. Each sample is { metric_type, value, at }; we bucket it to the
// owner's-timezone (day, hour) and aggregate per metric, per the METRICS map below:
//   • totals (steps, active_energy, resting_energy, stand_minutes, flights_climbed)
//     → SUM the hour's samples.
//   • rates (heart_rate, walking_speed, walking_heart_rate_avg, walking_step_length,
//     walking_steadiness) → AVERAGE the hour's samples.
// Units are fixed per metric by the map (not taken from the payload). An unlisted
// metric_type is SKIPPED (we'd not know whether to sum or average it).
//
// IDEMPOTENT, with one assumption: the upsert REPLACES an hour's bucket (latest POST
// wins), so a re-send is safe AS LONG AS a POST carries that hour's full set of
// samples — which the backfill (whole window) and the recurring run (recent window)
// both do. A deliberately partial hour would under-count; the Shortcut sends complete
// hours. Malformed/unknown samples are SKIPPED + counted with a reason, never fatal.

import { localHM, localYMD } from "../_shared/datetime.ts";
import { type ActivityRow, upsertActivityHourly } from "./store.ts";
import { parseInstant, toFiniteNumber } from "./parse.ts";

type Sample = { metric_type?: unknown; value?: unknown; at?: unknown };

export type SkipDetail = { reason: string; metric_type?: unknown; value?: unknown; at?: unknown };

export type ActivityResult =
  | { ok: true; inserted: number; skipped: number; skipped_detail?: SkipDetail[] }
  | { ok: false; error: string; status: number };

const SOURCE = "apple-health";
const MAX_SKIP_DETAIL = 25;

// The hourly metrics we accept and how each aggregates. An unknown metric_type is
// skipped (we'd not know whether to sum or average it).
const METRICS: Record<string, { agg: "sum" | "avg"; unit: string }> = {
  steps: { agg: "sum", unit: "count" },
  active_energy: { agg: "sum", unit: "kcal" },
  heart_rate: { agg: "avg", unit: "bpm" },
  // Health V2 (P0a): activity + mobility metrics — same bucket-and-aggregate path.
  resting_energy: { agg: "sum", unit: "kcal" },
  stand_minutes: { agg: "sum", unit: "min" },
  flights_climbed: { agg: "sum", unit: "count" },
  walking_speed: { agg: "avg", unit: "m/s" },
  walking_heart_rate_avg: { agg: "avg", unit: "bpm" },
  walking_step_length: { agg: "avg", unit: "cm" },
  walking_steadiness: { agg: "avg", unit: "%" },
};

// Hour (0-23) of an instant in the owner's timezone, via the shared HH:MM helper.
function localHourOf(iso: string): number {
  return parseInt(localHM(iso).slice(0, 2), 10);
}

export async function ingestActivity(payload: { samples?: unknown }): Promise<ActivityResult> {
  const samples = payload?.samples;
  if (!Array.isArray(samples) || samples.length === 0) {
    return { ok: false, error: "no_samples", status: 400 };
  }

  let skipped = 0;
  const skippedDetail: SkipDetail[] = [];
  const recordSkip = (reason: string, s: Sample) => {
    skipped++;
    if (skippedDetail.length < MAX_SKIP_DETAIL) {
      skippedDetail.push({ reason, metric_type: s?.metric_type, value: s?.value, at: s?.at });
    }
  };

  // Aggregate raw samples into hourly buckets: key = metric|day|hour → {sum, count}.
  const buckets = new Map<
    string,
    { metric_type: string; day: string; hour: number; sum: number; count: number }
  >();

  for (const s of samples as Sample[]) {
    const metric_type = typeof s?.metric_type === "string" ? s.metric_type.trim() : "";
    if (!metric_type) { recordSkip("bad_metric_type", s); continue; }
    if (!METRICS[metric_type]) { recordSkip("unknown_metric_type", s); continue; }

    const value = toFiniteNumber(s?.value); // missing/empty → null → skip (not a silent 0)
    if (value === null) { recordSkip("bad_value", s); continue; }

    const at = parseInstant(s?.at);
    if (!at) { recordSkip("bad_at", s); continue; }

    const iso = at.toISOString();
    const key = `${metric_type}|${localYMD(iso)}|${localHourOf(iso)}`;
    const b = buckets.get(key);
    if (b) {
      b.sum += value;
      b.count += 1;
    } else {
      buckets.set(key, { metric_type, day: localYMD(iso), hour: localHourOf(iso), sum: value, count: 1 });
    }
  }

  const rows: ActivityRow[] = [...buckets.values()].map((b) => {
    const { agg, unit } = METRICS[b.metric_type];
    const value = agg === "avg" ? Math.round((b.sum / b.count) * 10) / 10 : b.sum;
    return { metric_type: b.metric_type, day: b.day, hour: b.hour, value, unit, source: SOURCE };
  });

  const detail = skippedDetail.length ? { skipped_detail: skippedDetail } : {};
  if (rows.length === 0) return { ok: true, inserted: 0, skipped, ...detail };

  const written = await upsertActivityHourly(rows);
  if (written === null) return { ok: false, error: "db_write_failed", status: 502 };

  return { ok: true, inserted: written, skipped, ...detail };
}
