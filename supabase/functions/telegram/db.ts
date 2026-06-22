// LifeOS — Telegram bot: the database access layer (Piece 5e).
// One small place for the server-side writes/reads, shared by save.ts and undo.ts.
//
// All calls use Supabase's service-role key (auto-injected into the function,
// server-side only, never sent to a client or committed). Callers set/filter
// user_id = OWNER_USER_ID explicitly, so rows are the owner's and the tables'
// owner-only RLS policies stay UNCHANGED.

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
export const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID"); // the owner's auth.users id
export const dbConfigured = !!(SB_URL && SERVICE_KEY && OWNER_USER_ID);

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "apikey": SERVICE_KEY!,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Insert one row; returns the saved row (with its id) or null on any failure.
export async function insert(table: string, row: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: headers({ "Prefer": "return=representation" }),
      body: JSON.stringify(row),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? (rows[0] ?? null) : null;
  } catch (_err) {
    return null;
  }
}

// Read rows for a raw PostgREST query (e.g. "tasks?source=eq.telegram&select=id").
export async function select(query: string): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${query}`, { headers: headers() });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch (_err) {
    return null;
  }
}

// Delete rows for a raw PostgREST query; returns the deleted rows (so the caller
// can tell whether anything actually matched).
export async function del(query: string): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${query}`, {
      method: "DELETE",
      headers: headers({ "Prefer": "return=representation" }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch (_err) {
    return null;
  }
}
