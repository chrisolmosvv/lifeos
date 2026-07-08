// LifeOS — Focus module P1: the thin data loader.
//
// FETCH ONLY — no maths. It reads the owner's raw focus_sessions rows from Supabase
// and hands plain rows to the pure calc layer (focusCalc / focusTrend). Keeping
// fetch and maths apart means the calc stays a pure, testable unit and this file
// stays a dumb pipe — exactly like gymLoad.js / healthLoad.js.
//
// RLS already scopes the table to the owner (auth.uid() = user_id), so these are
// plain selects — no user filter in the query. We read through the app's normal
// authenticated client; never the service role. Every read is ACTIVE-ONLY
// (archived_at IS NULL) — a soft-deleted session never surfaces.
//
// NOTE: the daily/weekly focus GOALS are NOT here — they live in the shared
// health_goals table (goal_type 'focus_daily'/'focus_weekly'); reuse
// health/healthLoad.js `fetchGoals()` + health/healthGoals.js `resolveGoals`.

import { supabase } from "../../spine/data/supabaseClient.js";

const COLUMNS =
  "id,started_at,ended_at,mode,target_seconds,break_seconds,task_id,task_title_snapshot,category_id,category_snapshot,segments,source,rating,note,created_at,updated_at";

// Supabase caps a select at 1000 rows; page through so a wide range never truncates
// — the same guard gym/health use. `apply` lets a caller add filters before it runs.
async function fetchAll(apply = (q) => q) {
  const PAGE = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await apply(
      supabase.from("focus_sessions").select(COLUMNS).is("archived_at", null).range(from, from + PAGE - 1),
    );
    if (error) throw new Error(`focus_sessions: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// Finished sessions whose start falls in [startIso, endIso) — the overview/range
// window. The calc layer buckets each into its Amsterdam start-day; this just hands
// over the raw rows (running rows included so callers can spot one; calc excludes
// them from totals). Newest first.
export function fetchSessions(startIso, endIso) {
  return fetchAll((q) =>
    q.gte("started_at", startIso).lt("started_at", endIso).order("started_at", { ascending: false }),
  );
}

// All finished sessions for one task, across all history — the per-task all-time
// total (row tag) + the form's session list. Newest first.
export function fetchTaskSessions(taskId) {
  return fetchAll((q) => q.eq("task_id", taskId).order("started_at", { ascending: false }));
}

// The single running session (ended_at NULL), if any — drives the header live-marker
// and resume-on-load. Returns the row or null. (No paging: at most one.)
export async function fetchRunning() {
  const { data, error } = await supabase
    .from("focus_sessions")
    .select(COLUMNS)
    .is("archived_at", null)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`focus_sessions(running): ${error.message}`);
  return data?.[0] ?? null;
}
