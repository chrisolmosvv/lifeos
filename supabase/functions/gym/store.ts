// LifeOS — Health → Gym: the server-side write layer for the backfill.
//
// All writes use Supabase's SERVICE-ROLE key (auto-injected into the function,
// server-side only, never sent to a client or committed). Every row is stamped
// with user_id = OWNER_USER_ID — the SAME secret the telegram function uses — so
// rows are the owner's and the gym tables' owner-only RLS policies stay UNCHANGED.
// (Secrets are project-wide, so this function sees OWNER_USER_ID that telegram set;
// if any of the three below is missing we fail closed and SURFACE it — never a
// hardcoded id.)
//
// Idempotency lives here:
//   • upsertWorkout — POST with on_conflict=(user_id,hevy_id) + merge-duplicates,
//     so a re-run updates the existing workout row instead of duplicating it.
//   • replaceWorkoutChildren — delete this workout's exercises (the FK cascade
//     drops their sets), then reinsert fresh from Hevy. An edited-in-Hevy workout
//     re-imports correctly and sets never accumulate. This is a within-module
//     (gym→gym) delete — it NEVER touches the task/event/category spine.

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
export const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");
export const storeConfigured = !!(SB_URL && SERVICE_KEY && OWNER_USER_ID);

// Which of the required secrets are missing (for a clear, non-leaky error).
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

// Upsert one workout on (user_id, hevy_id); returns its row id, or null on failure.
export async function upsertWorkout(
  w: { hevy_id: string; title: string | null; started_at: string | null; ended_at: string | null },
): Promise<string | null> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/gym_workouts?on_conflict=user_id,hevy_id`,
      {
        method: "POST",
        headers: headers({ "Prefer": "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify({ ...w, user_id: OWNER_USER_ID }),
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? (rows[0]?.id ?? null) : null;
  } catch (_err) {
    return null;
  }
}

// Replace one workout's children: delete its exercises (sets cascade), then
// reinsert each exercise + its sets fresh. Returns counts written, or null on
// any failure (the caller stops and reports — a clean stop is safe, it re-runs).
export async function replaceWorkoutChildren(
  workoutId: string,
  exercises: Array<{
    title: string | null;
    position: number | null;
    exercise_template_id: string | null;
    sets: Array<{
      position: number | null;
      weight_kg: number | null;
      reps: number | null;
      set_type: string | null;
      rpe: number | null;
      distance_m: number | null;
      duration_seconds: number | null;
    }>;
  }>,
): Promise<{ exercises: number; sets: number } | null> {
  try {
    // 1) Clear existing children for this workout (sets cascade via FK).
    const delRes = await fetch(
      `${SB_URL}/rest/v1/gym_exercises?workout_id=eq.${workoutId}`,
      { method: "DELETE", headers: headers() },
    );
    if (!delRes.ok) return null;

    let exCount = 0;
    let setCount = 0;

    // 2) Reinsert each exercise, then bulk-insert its sets under the new id.
    for (const ex of exercises) {
      const exRes = await fetch(`${SB_URL}/rest/v1/gym_exercises`, {
        method: "POST",
        headers: headers({ "Prefer": "return=representation" }),
        body: JSON.stringify({
          user_id: OWNER_USER_ID,
          workout_id: workoutId,
          title: ex.title,
          position: ex.position,
          exercise_template_id: ex.exercise_template_id,
        }),
      });
      if (!exRes.ok) return null;
      const exRows = await exRes.json();
      const exId = Array.isArray(exRows) ? exRows[0]?.id : null;
      if (!exId) return null;
      exCount++;

      if (ex.sets.length > 0) {
        const setRows = ex.sets.map((s) => ({ ...s, user_id: OWNER_USER_ID, exercise_id: exId }));
        const setRes = await fetch(`${SB_URL}/rest/v1/gym_sets`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(setRows),
        });
        if (!setRes.ok) return null;
        setCount += setRows.length;
      }
    }

    return { exercises: exCount, sets: setCount };
  } catch (_err) {
    return null;
  }
}

// G4 — delete ONE workout by (owner, hevy_id); its gym_exercises + gym_sets cascade away.
// This is a within-module (gym→gym) delete; it NEVER touches the task/event/category spine.
// Returns how many workout rows were removed (0 if it was already gone — safe/idempotent), or
// null on a request failure (the caller stops and reports). Only ever called for an EXPLICIT
// Hevy "deleted" event matched by hevy_id — never inferred from a workout's absence.
export async function deleteWorkoutByHevyId(hevyId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/gym_workouts?user_id=eq.${OWNER_USER_ID}&hevy_id=eq.${encodeURIComponent(hevyId)}`,
      { method: "DELETE", headers: headers({ "Prefer": "return=representation" }) },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : null;
  } catch (_err) {
    return null;
  }
}

// G4 — read the owner's stored incremental cursor (last_event_at), or null if there is no
// sync-state row yet (first ever sync → caller starts from epoch). A read failure also
// returns null; starting from epoch is safe because every write is idempotent.
export async function readSyncCursor(): Promise<string | null> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/gym_sync_state?user_id=eq.${OWNER_USER_ID}&select=last_event_at`,
      { headers: headers() },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const v = Array.isArray(rows) ? rows[0]?.last_event_at : null;
    return typeof v === "string" ? v : null;
  } catch (_err) {
    return null;
  }
}

// G4 — upsert the owner's sync state (one row per owner, PK = user_id). Written ONLY after a
// fully successful sync pass, so the cursor never advances past what was actually applied.
export async function writeSyncState(
  s: { last_event_at: string | null; last_synced_at: string },
): Promise<boolean> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/gym_sync_state?on_conflict=user_id`,
      {
        method: "POST",
        headers: headers({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify({ user_id: OWNER_USER_ID, ...s }),
      },
    );
    return res.ok;
  } catch (_err) {
    return false;
  }
}
