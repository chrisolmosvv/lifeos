// LifeOS — Health → Gym ("The Form Guide"): the Hevy API client (read-only).
//
// One small place for every call we make to Hevy. We ONLY ever READ Hevy — never
// a write endpoint. The api-key is a SECRET (HEVY_API_KEY in Supabase's secret
// store); it is read at run time, never written to a file/repo/response/log.
//
// HEVY API (documented v1 shape — base https://api.hevyapp.com, auth header
// `api-key: <key>`):
//   GET /v1/workouts/count            → { workout_count }
//   GET /v1/workouts?page=&pageSize=  → { page, page_count, workouts: [...] }
// Hevy caps pageSize at 10, so the full history pages in ~ceil(count/10) calls.

const HEVY_API_KEY = Deno.env.get("HEVY_API_KEY");
const HEVY_BASE = "https://api.hevyapp.com";

// Hevy's hard cap on page size is 10 — asking for more is silently clamped.
export const HEVY_PAGE_SIZE = 10;

// Rate-limit-ish headers worth surfacing if Hevy sends any. We pass through
// whatever is present; Hevy may use only some (or none) of these. This is how we
// finally MEASURE Hevy's real ceiling during the G3 backfill.
const RATE_HEADERS = [
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
];

export const hevyConfigured = !!HEVY_API_KEY;

function hevyHeaders(): Record<string, string> {
  return { "api-key": HEVY_API_KEY!, "Accept": "application/json" };
}

// Collect any rate-limit headers Hevy returned, so each page reveals the policy.
// Returns {} when Hevy sends none (G1 saw none on /count).
export function rateLimitInfo(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of RATE_HEADERS) {
    const v = res.headers.get(name);
    if (v !== null) out[name] = v;
  }
  return out;
}

// The owner's total Hevy workout count (G1's probe — reused as a cross-check).
export async function countWorkouts(): Promise<
  { ok: true; count: number; rate: Record<string, string> }
  | { ok: false; status: number; note: string; rate: Record<string, string> }
> {
  const res = await fetch(`${HEVY_BASE}/v1/workouts/count`, { headers: hevyHeaders() });
  const rate = rateLimitInfo(res);
  if (!res.ok) {
    const note = await res.text().catch(() => "");
    return { ok: false, status: res.status, note: note.slice(0, 200), rate };
  }
  const data = await res.json().catch(() => null);
  const count = (data && typeof data === "object")
    ? (data.workout_count ?? data.count ?? null)
    : null;
  if (typeof count !== "number") {
    return { ok: false, status: 502, note: "no workout_count in reply", rate };
  }
  return { ok: true, count, rate };
}

// One page of the CHANGES feed (G4 incremental sync). Hevy returns events newest-first:
//   { page, page_count, events: [ { type: "updated", workout: {...} }
//                                | { type: "deleted", ... } ] }
// We pass a `since` (ISO time) so we only get what changed; same defensive paging as the
// workouts feed. Mapping/decisions about each event happen in sync.ts. Confirmed live: an
// "updated" event carries the full workout under `.workout` (id, title, start_time, end_time,
// exercises, updated_at, …); the "deleted" shape is read off real data in G4 before we act.
export async function fetchWorkoutEventsPage(since: string, page: number): Promise<
  | { ok: true; status: 200; events: unknown[]; pageCount: number | null; rate: Record<string, string> }
  | { ok: false; status: number; note: string; rate: Record<string, string> }
> {
  const url =
    `${HEVY_BASE}/v1/workouts/events?since=${encodeURIComponent(since)}&page=${page}&pageSize=${HEVY_PAGE_SIZE}`;
  const res = await fetch(url, { headers: hevyHeaders() });
  const rate = rateLimitInfo(res);
  if (!res.ok) {
    const note = await res.text().catch(() => "");
    return { ok: false, status: res.status, note: note.slice(0, 200), rate };
  }
  const data = await res.json().catch(() => null) as Record<string, unknown> | null;
  const events = Array.isArray(data?.events) ? (data!.events as unknown[]) : [];
  const pcRaw = data?.page_count;
  const pageCount = typeof pcRaw === "number" ? pcRaw : null;
  return { ok: true, status: 200, events, pageCount, rate };
}

// One page of full workouts (each carries its exercises + sets inline). We return
// the raw Hevy workout objects; mapping to our table shape happens in backfill.ts.
// `page_count` (when present) tells us the last page; we also stop on an empty page.
export async function fetchWorkoutsPage(page: number): Promise<
  | { ok: true; status: 200; workouts: unknown[]; pageCount: number | null; rate: Record<string, string> }
  | { ok: false; status: number; note: string; rate: Record<string, string> }
> {
  const url = `${HEVY_BASE}/v1/workouts?page=${page}&pageSize=${HEVY_PAGE_SIZE}`;
  const res = await fetch(url, { headers: hevyHeaders() });
  const rate = rateLimitInfo(res);
  if (!res.ok) {
    const note = await res.text().catch(() => "");
    return { ok: false, status: res.status, note: note.slice(0, 200), rate };
  }
  const data = await res.json().catch(() => null) as Record<string, unknown> | null;
  // Defensive: accept `workouts` (documented) or a bare array, and tolerate a
  // missing page_count by falling back to empty-page detection in the caller.
  const workouts = Array.isArray(data?.workouts)
    ? (data!.workouts as unknown[])
    : (Array.isArray(data) ? (data as unknown[]) : []);
  const pcRaw = data?.page_count;
  const pageCount = typeof pcRaw === "number" ? pcRaw : null;
  return { ok: true, status: 200, workouts, pageCount, rate };
}
