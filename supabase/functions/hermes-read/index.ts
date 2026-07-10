// LifeOS — hermes-read: a READ-ONLY edge function for the external Hermes analysis agent.
//
// Returns a JSON snapshot of the owner's LifeOS data (tasks, events, categories, food log,
// sleep, body metrics, activity, focus sessions, gym workouts, health goals) for an
// external agent running on the owner's VPS. The agent uses this for analysis — summarise
// the day, spot patterns, track habits.
//
// READ-ONLY BY CONSTRUCTION. This function contains NO insert, update, delete, upsert, or
// PATCH code of any kind — not for any table, not behind any flag. It only SELECTs.
//
// AUTH: one shared-secret header (X-Hermes-Secret). The function reads the secret from
// Supabase's secret store at runtime, compares in constant time, and rejects (401)
// anything without the exact match. The secret is NEVER in the repo, NEVER logged, NEVER
// returned.
//
// The service-role key is used ONLY inside the function to read PostgREST; it is never
// returned, never logged, never exposed to the caller.
//
// OWNER-SCOPED. Every query filters to user_id = OWNER_USER_ID (the same pattern the
// brief function uses). Single-user; only the owner's rows are returned.
//
// PAYLOAD CAPS (per table, documented):
//   tasks:        500 (all open + recently completed, most recent first)
//   events:       200 (within window, earliest first)
//   categories:   100 (all — bounded by design)
//   food_log:     500 (within window, newest first)
//   sleep:         90 (within window, newest first — max 1/night)
//   body:         500 (within window, newest first)
//   activity:      90 days of daily aggregates (rolled up from hourly, not raw rows)
//   focus:        200 (within window, newest first)
//   gym_workouts: 100 (within window, newest first)
//   health_goals:  50 (active only)
//
// Secrets (read at run time, never in this file / the repo / a response / a log):
//   HERMES_READ_SECRET  — must match the X-Hermes-Secret request header.
//   OWNER_USER_ID       — the owner's auth.users id (same secret the brief/telegram use).
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected by the platform.

import { addDaysYMD, localToUtc, todayYMD } from "../_shared/datetime.ts";
import { configured, ownerActive, ownerPlain, select, selectAll } from "./sb.ts";
import { buildPeopleSection } from "./people.ts";

const SECRET = Deno.env.get("HERMES_READ_SECRET");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Constant-time string comparison to prevent timing attacks on the secret.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Parse and validate the `days` parameter (1–90, default 7).
function parseDays(body: unknown): number {
  if (body && typeof body === "object" && "days" in body) {
    const d = Number((body as Record<string, unknown>).days);
    if (Number.isInteger(d) && d >= 1 && d <= 90) return d;
  }
  return 7;
}

// Roll up activity_hourly to daily aggregates per metric_type. Steps and active_energy
// are SUMMED; heart_rate is AVERAGED. Returns one object per (day, metric_type).
function aggregateActivity(
  rows: Record<string, unknown>[],
): { day: string; metric_type: string; value: number; unit: string | null }[] {
  const buckets = new Map<string, { sum: number; count: number; unit: string | null }>();
  for (const r of rows) {
    const key = `${r.day}|${r.metric_type}`;
    const v = typeof r.value === "number" ? r.value : Number(r.value);
    if (!Number.isFinite(v)) continue;
    const b = buckets.get(key);
    if (b) { b.sum += v; b.count++; }
    else buckets.set(key, { sum: v, count: 1, unit: typeof r.unit === "string" ? r.unit : null });
  }
  const out: { day: string; metric_type: string; value: number; unit: string | null }[] = [];
  for (const [key, b] of buckets) {
    const [day, metric_type] = key.split("|");
    // Heart rate → average; everything else → sum.
    const value = metric_type === "heart_rate"
      ? Math.round(b.sum / b.count)
      : Math.round(b.sum * 100) / 100;
    out.push({ day, metric_type, value, unit: b.unit });
  }
  out.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // --- AUTH: shared-secret header, constant-time compare. ---
  if (!SECRET) {
    return json({ ok: false, error: "not_configured" }, 500);
  }
  const sent = req.headers.get("x-hermes-secret") ?? "";
  if (!sent || !timingSafeEqual(sent, SECRET)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (!configured) {
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  // --- Parse request body. ---
  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty body is fine — defaults apply */ }
  const days = parseDays(body);

  const today = todayYMD();
  const windowStart = addDaysYMD(today, -days);
  // Window bounds in UTC (Amsterdam midnight → midnight).
  const windowStartUtc = localToUtc(windowStart, "00:00").toISOString();
  const tomorrowUtc = localToUtc(addDaysYMD(today, 1), "00:00").toISOString();

  // --- All reads in parallel. Every query is owner-scoped + bounded. ---
  const [
    categories,
    openTasks,
    recentDoneTasks,
    events,
    foodLog,
    sleep,
    bodyMetrics,
    activityRaw,
    focus,
    gymWorkouts,
    healthGoals,
    peopleSection,
  ] = await Promise.all([
    // Categories — all (bounded by design, no archive column).
    select(
      `categories?${ownerPlain()}&select=id,name,parent_id,color,sort_order&order=sort_order.asc&limit=100`,
    ),
    // Tasks — all open (regardless of window).
    select(
      `tasks?${ownerActive()}&status=eq.open&select=id,title,status,time_bucket,due_date,priority,category_id,scheduled_start,scheduled_end,source,created_at,completed_at&order=created_at.desc&limit=500`,
    ),
    // Tasks — completed within the window (most recent first).
    select(
      `tasks?${ownerActive()}&status=eq.done&completed_at=gte.${windowStartUtc}&select=id,title,status,time_bucket,due_date,priority,category_id,scheduled_start,scheduled_end,source,created_at,completed_at&order=completed_at.desc&limit=200`,
    ),
    // Events — within the window (earliest first).
    select(
      `events?${ownerActive()}&start_at=gte.${windowStartUtc}&start_at=lt.${tomorrowUtc}&select=id,title,start_at,end_at,category_id,created_at&order=start_at.asc&limit=200`,
    ),
    // Food log — within the window (newest first).
    select(
      `food_log_entries?${ownerPlain()}&entry_date=gte.${windowStart}&entry_date=lte.${today}&select=id,entry_date,meal_slot,kcal,protein,carbs,fat,fibre,sugar,amount,unit,entry_label,is_alcohol,alcohol_units,entry_source,created_at&order=entry_date.desc,created_at.desc&limit=500`,
    ),
    // Sleep — within the window (newest first).
    select(
      `sleep_nights?${ownerPlain()}&night_date=gte.${windowStart}&night_date=lte.${today}&select=night_date,in_bed_at,woke_at,asleep_minutes,rem_minutes,core_minutes,deep_minutes,awake_minutes,awakenings,score&order=night_date.desc&limit=90`,
    ),
    // Body metrics — within the window (newest first).
    select(
      `body_metrics?${ownerPlain()}&metric_date=gte.${windowStart}&metric_date=lte.${today}&select=metric_date,metric_type,value,unit,reading_at&order=reading_at.desc&limit=500`,
    ),
    // Activity hourly — raw rows within the window (will be aggregated to daily).
    selectAll(
      `activity_hourly?${ownerPlain()}&day=gte.${windowStart}&day=lte.${today}&select=day,hour,metric_type,value,unit&order=day.desc`,
    ),
    // Focus sessions — within the window, active only (newest first).
    select(
      `focus_sessions?${ownerActive()}&ended_at=not.is.null&started_at=gte.${windowStartUtc}&select=started_at,ended_at,mode,task_title_snapshot,category_snapshot,segments,rating,note&order=started_at.desc&limit=200`,
    ),
    // Gym workouts — within the window (newest first).
    select(
      `gym_workouts?${ownerPlain()}&started_at=gte.${windowStartUtc}&started_at=lt.${tomorrowUtc}&select=id,title,started_at,ended_at&order=started_at.desc&limit=100`,
    ),
    // Health goals — active only.
    select(
      `health_goals?${ownerPlain()}&active=eq.true&select=goal_type,target_value,unit,direction,active&order=set_at.desc&limit=50`,
    ),
    // People — all non-archived with circle, birthday, connections, last contact.
    buildPeopleSection(),
  ]);

  // Merge open + recently completed tasks (deduplicated by id, open tasks first).
  const seenTaskIds = new Set<string>();
  const tasks: Record<string, unknown>[] = [];
  for (const list of [openTasks, recentDoneTasks]) {
    if (!list) continue;
    for (const t of list) {
      const id = String(t.id);
      if (!seenTaskIds.has(id)) { seenTaskIds.add(id); tasks.push(t); }
    }
  }

  // Roll up activity to daily aggregates.
  const activity = activityRaw ? aggregateActivity(activityRaw) : null;

  return json({
    ok: true,
    snapshot_date: today,
    window: { from: windowStart, to: today, days },
    categories,
    tasks: tasks.length ? tasks : openTasks,
    events,
    food_log: foodLog,
    sleep,
    body: bodyMetrics,
    activity,
    focus,
    gym_workouts: gymWorkouts,
    health_goals: healthGoals,
    people: peopleSection,
  });
});
