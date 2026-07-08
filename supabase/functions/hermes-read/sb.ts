// LifeOS — hermes-read: READ-ONLY Supabase access for the external Hermes agent.
//
// Modelled on brief/sb.ts. Uses Supabase's service-role key (auto-injected, server-side
// only, never sent to a client or committed) and every caller filters to
// user_id = OWNER_USER_ID (defence in depth — service-role bypasses RLS, so the explicit
// filter is the guard).
//
// READ-ONLY BY CONSTRUCTION. This module exports ONLY a `select` function. There is NO
// insert, update, delete, upsert, or PATCH function — not behind a flag, not unused, not
// commented out. If a future need requires a write, that belongs in a different function.

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");
export const configured = !!(SB_URL && SERVICE_KEY && OWNER_USER_ID);

// The owner filter for spine tables (tasks/events/focus_sessions) that carry archived_at.
export const ownerActive = () => `user_id=eq.${OWNER_USER_ID}&archived_at=is.null`;

// The owner filter for module tables (gym/sleep/body/activity/categories/food) that have
// no archived_at column.
export const ownerPlain = () => `user_id=eq.${OWNER_USER_ID}`;

// One read-only PostgREST query. Returns the rows, or null on any failure.
export async function select(query: string): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${query}`, {
      headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch (_err) {
    return null;
  }
}

// Paginated read for tables that can exceed PostgREST's 1000-row default cap.
// Returns all matching rows or null on any failure.
export async function selectAll(query: string): Promise<Record<string, unknown>[] | null> {
  const PAGE = 1000;
  const out: Record<string, unknown>[] = [];
  const sep = query.includes("?") ? "&" : "?";
  for (let off = 0; ; off += PAGE) {
    const rows = await select(`${query}${sep}limit=${PAGE}&offset=${off}`);
    if (rows === null) return null;
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}
