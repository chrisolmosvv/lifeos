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

type Reading = { metric_type?: unknown; value?: unknown; unit?: unknown; at?: unknown };

export type BodyResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string; status: number };

const SOURCE = "apple-health";

export async function ingestBody(payload: { readings?: unknown }): Promise<BodyResult> {
  const readings = payload?.readings;
  if (!Array.isArray(readings) || readings.length === 0) {
    return { ok: false, error: "no_readings", status: 400 };
  }

  let skipped = 0;
  // Collapse same-key readings within this payload (last wins) before the upsert.
  const byKey = new Map<string, BodyRow>();

  for (const r of readings as Reading[]) {
    const metric_type = typeof r?.metric_type === "string" ? r.metric_type.trim() : "";
    const value = Number(r?.value); // accepts a number or a numeric string
    const atRaw = typeof r?.at === "string" ? r.at : "";
    const at = atRaw ? new Date(atRaw) : new Date(NaN);

    if (!metric_type || !Number.isFinite(value) || isNaN(at.getTime())) {
      skipped++;
      continue;
    }

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

  const rows = [...byKey.values()];
  if (rows.length === 0) return { ok: true, inserted: 0, skipped };

  const written = await upsertBodyMetrics(rows);
  if (written === null) return { ok: false, error: "db_write_failed", status: 502 };

  return { ok: true, inserted: written, skipped };
}
