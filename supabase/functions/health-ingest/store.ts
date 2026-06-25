// LifeOS — health-ingest: the server-side write layer (S3a, body_metrics).
//
// All writes use Supabase's SERVICE-ROLE key (auto-injected into the function,
// server-side only, never sent to a client or committed). Every row is stamped
// with user_id = OWNER_USER_ID — the SAME secret telegram/gym use — so rows are
// the owner's and body_metrics' owner-only RLS policies stay UNCHANGED. (Secrets
// are project-wide; if any of the three below is missing we fail closed and
// SURFACE which — never a hardcoded id.)
//
// Idempotency lives here: the upsert keys on (user_id, metric_type, reading_at,
// source) with merge-duplicates, so the one-time backfill and the 4×/day runs can
// re-send the same reading without ever duplicating it (latest value wins).

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
export const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");
export const storeConfigured = !!(SB_URL && SERVICE_KEY && OWNER_USER_ID);

// Which required secrets are missing (for a clear, non-leaky error — names only).
export function missingStoreSecrets(): string[] {
  const out: string[] = [];
  if (!SB_URL) out.push("SUPABASE_URL");
  if (!SERVICE_KEY) out.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!OWNER_USER_ID) out.push("OWNER_USER_ID");
  return out;
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "apikey": SERVICE_KEY!,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// One body reading, ready to store (user_id is stamped here, not by the caller).
export type BodyRow = {
  metric_type: string;
  value: number;
  unit: string | null;
  reading_at: string; // ISO timestamptz
  metric_date: string; // YYYY-MM-DD, owner's timezone
  source: string;
};

// Upsert a batch of readings on (user_id, metric_type, reading_at, source).
// Returns how many rows were written, or null on any request failure (the caller
// stops and reports — a clean stop is safe because every write is idempotent).
export async function upsertBodyMetrics(rows: BodyRow[]): Promise<number | null> {
  if (rows.length === 0) return 0;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/body_metrics?on_conflict=user_id,metric_type,reading_at,source`,
      {
        method: "POST",
        headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(rows.map((r) => ({ ...r, user_id: OWNER_USER_ID }))),
      },
    );
    if (!res.ok) return null;
    return rows.length;
  } catch (_err) {
    return null;
  }
}

// One hourly activity bucket, ready to store (user_id stamped here, not by the caller).
export type ActivityRow = {
  metric_type: string;
  day: string; // YYYY-MM-DD, owner's timezone
  hour: number; // 0-23
  value: number;
  unit: string;
  source: string;
};

// Upsert a batch of hourly buckets on (user_id, metric_type, day, hour, source).
// merge-duplicates → a re-send of the same hour REPLACES its bucket (latest POST
// wins), so re-running is idempotent as long as a POST carries that hour's full set.
export async function upsertActivityHourly(rows: ActivityRow[]): Promise<number | null> {
  if (rows.length === 0) return 0;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/activity_hourly?on_conflict=user_id,metric_type,day,hour,source`,
      {
        method: "POST",
        headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(rows.map((r) => ({ ...r, user_id: OWNER_USER_ID }))),
      },
    );
    if (!res.ok) return null;
    return rows.length;
  } catch (_err) {
    return null;
  }
}
