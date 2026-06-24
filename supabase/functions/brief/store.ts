// LifeOS — the morning brief, M8: store the numbered action map at send-time.
//
// The brief function is otherwise read-only (sb.ts). This is the ONE small write it does:
// it parks the latest brief's number→item map in marty_brief so a reply arriving at the
// SEPARATE telegram function can resolve "done 1" to the exact item. One row per owner
// (PK user_id), so a new brief overwrites the old. Best-effort: if it fails the brief
// still sends — only the numbered replies won't resolve.

import type { BriefMapItem } from "./actions.ts";

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...extra };
}

// Returns true if the map was stored — so the caller only shows numbered items it can
// actually resolve (e.g. before the marty_brief table exists, this returns false and the
// brief omits the numbered list rather than showing numbers that won't work).
export async function storeBriefMap(items: BriefMapItem[]): Promise<boolean> {
  if (!SB_URL || !SERVICE_KEY || !OWNER_USER_ID) return false;
  try {
    // One row per owner: clear the old map, then write the new one (empty on a quiet day).
    await fetch(`${SB_URL}/rest/v1/marty_brief?user_id=eq.${OWNER_USER_ID}`, { method: "DELETE", headers: headers() });
    const res = await fetch(`${SB_URL}/rest/v1/marty_brief`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ user_id: OWNER_USER_ID, items }),
    });
    return res.ok;
  } catch (_err) {
    return false; // best-effort: the brief still sends without the numbered list
  }
}
