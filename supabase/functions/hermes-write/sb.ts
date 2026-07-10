// LifeOS — hermes-write: the database access layer.
//
// Uses Supabase's service-role key (auto-injected, server-side only, never sent to a
// client or committed). Every caller stamps user_id = OWNER_USER_ID explicitly, so rows
// are the owner's and the tables' owner-only RLS policies stay UNCHANGED.
//
// WRITE-CAPABLE but CONTROLLED: only the index.ts per-kind handlers call these, and
// every insert is preceded by a marty_actions log entry so writes are always undoable.

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
export const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");
export const configured = !!(SB_URL && SERVICE_KEY && OWNER_USER_ID);

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Insert one row; returns the saved row (with its id) or null on failure.
export async function insert(
  table: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? (rows[0] ?? null) : null;
  } catch {
    return null;
  }
}

// Upsert one row on the given conflict key; returns the saved row or null.
export async function upsert(
  table: string,
  row: Record<string, unknown>,
  onConflict: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/${table}?on_conflict=${onConflict}`,
      {
        method: "POST",
        headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(row),
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? (rows[0] ?? null) : null;
  } catch {
    return null;
  }
}

// Read rows for a raw PostgREST query.
export async function select(
  query: string,
): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${query}`, { headers: headers() });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

// Patch (update) rows for a raw PostgREST query; returns the first patched row or null.
export async function patch(
  query: string,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${query}`, {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(fields),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? (rows[0] ?? null) : null;
  } catch {
    return null;
  }
}

// Delete rows for a raw PostgREST query; returns deleted rows or null.
export async function del(
  query: string,
): Promise<Record<string, unknown>[] | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${query}`, {
      method: "DELETE",
      headers: headers({ Prefer: "return=representation" }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}
