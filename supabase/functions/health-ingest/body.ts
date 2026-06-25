// LifeOS — health-ingest: the body-readings parse layer (S3a).
//
// Turns the { kind:"body", readings:[…] } payload into clean body_metrics rows and
// upserts them. GENERIC — any metric_type (weight, body_fat, lean_mass, bmi, …) is
// just a value here; a new stat never needs a code or schema change.
//
// Robust by design: malformed rows are SKIPPED and counted, never fatal, so one bad
// reading in a big backfill can't sink the whole batch. Duplicate readings within a
// single payload are collapsed (last wins) before the upsert, so the DB never sees
// the same conflict key twice in one statement.

import { localYMD } from "../_shared/datetime.ts";
import { type BodyRow, upsertBodyMetrics } from "./store.ts";
import { parseInstant, toFiniteNumber } from "./parse.ts";

type Reading = { metric_type?: unknown; value?: unknown; unit?: unknown; at?: unknown };

// A skipped reading, with the offending raw value echoed back so a bad backfill row
// is visible in the response ("why was this skipped?") rather than a silent tally.
export type SkipDetail = { reason: string; metric_type?: unknown; value?: unknown; at?: unknown };

export type BodyResult =
  | { ok: true; inserted: number; skipped: number; skipped_detail?: SkipDetail[] }
  | { ok: false; error: string; status: number };

const SOURCE = "apple-health";
// Cap the echoed detail so a huge backfill of bad rows can't bloat the response.
const MAX_SKIP_DETAIL = 25;

export async function ingestBody(payload: { readings?: unknown }): Promise<BodyResult> {
  const readings = payload?.readings;
  if (!Array.isArray(readings) || readings.length === 0) {
    return { ok: false, error: "no_readings", status: 400 };
  }

  let skipped = 0;
  const skippedDetail: SkipDetail[] = [];
  const recordSkip = (reason: string, r: Reading) => {
    skipped++;
    if (skippedDetail.length < MAX_SKIP_DETAIL) {
      skippedDetail.push({ reason, metric_type: r?.metric_type, value: r?.value, at: r?.at });
    }
  };

  // Collapse same-key readings within this payload (last wins) before the upsert.
  const byKey = new Map<string, BodyRow>();

  for (const r of readings as Reading[]) {
    const metric_type = typeof r?.metric_type === "string" ? r.metric_type.trim() : "";
    if (!metric_type) { recordSkip("bad_metric_type", r); continue; }

    const value = toFiniteNumber(r?.value); // number or numeric string; missing/empty → null
    if (value === null) { recordSkip("bad_value", r); continue; }

    // `at` is any ISO-8601 instant ("…Z" or "…+02:00"); skip ONLY if genuinely unparseable.
    const at = parseInstant(r?.at);
    if (!at) { recordSkip("bad_at", r); continue; }

    const reading_at = at.toISOString(); // normalise to UTC so the dedupe key is stable
    const unit = typeof r?.unit === "string" && r.unit.trim() ? r.unit.trim() : null;
    byKey.set(`${metric_type}|${reading_at}`, {
      metric_type,
      value,
      unit,
      reading_at,
      metric_date: localYMD(reading_at), // owner's-timezone calendar day of the reading
      source: SOURCE,
    });
  }

  const detail = skippedDetail.length ? { skipped_detail: skippedDetail } : {};
  const rows = [...byKey.values()];
  if (rows.length === 0) return { ok: true, inserted: 0, skipped, ...detail };

  const written = await upsertBodyMetrics(rows);
  if (written === null) return { ok: false, error: "db_write_failed", status: 502 };

  return { ok: true, inserted: written, skipped, ...detail };
}
