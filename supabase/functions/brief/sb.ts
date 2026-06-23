// LifeOS — the morning brief: shared READ-ONLY Supabase access for the reader
// modules (day.ts, gap.ts). One small place for the service-role reads.
//
// Uses Supabase's service-role key (auto-injected, server-side only, never sent to a
// client or committed) and every caller filters to user_id = OWNER_USER_ID (defence
// in depth — service-role bypasses RLS, so the explicit filter is the guard). Reads
// only; nothing here writes.

import { addDaysYMD, localToUtc, todayYMD } from "../_shared/datetime.ts";

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");
export const dayConfigured = !!(SB_URL && SERVICE_KEY && OWNER_USER_ID);

// The filter every brief read carries: owner-scoped AND active-only (Archive A3b —
// archived items must never surface in the morning brief or its gap-fill). Every
// brief read is of tasks or events (both carry archived_at), and every read appends
// owner(), so bundling the archive filter here covers them all — current and future —
// with no read missed.
export const owner = () => `user_id=eq.${OWNER_USER_ID}&archived_at=is.null`;

// One read-only PostgREST query. Returns the rows, or null on any failure (so the
// caller can tell "empty" apart from "couldn't read").
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

// Today's date + the UTC bounds of today (Europe/Amsterdam midnight→midnight),
// shared so "today" means one thing across the day read and the gap finder.
export function todayWindow(): { today: string; startUtc: string; endUtc: string } {
  const today = todayYMD();
  const tomorrow = addDaysYMD(today, 1);
  return {
    today,
    startUtc: localToUtc(today, "00:00").toISOString(),
    endUtc: localToUtc(tomorrow, "00:00").toISOString(),
  };
}
