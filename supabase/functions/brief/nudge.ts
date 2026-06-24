// LifeOS — the daytime nudge (Marty track M9). The HIGHEST nag-risk feature, so the
// guardrails ARE the feature. A scheduled scan (same cron/pg_net + DST-safe local-hour gate
// as the 7am brief) offers, CALMLY, ONE good use of a real free window.
//
// HARD GUARDRAILS (all enforced here):
//   - 9am–6pm Amsterdam only (local-hour gate, DST-safe via localHour()).
//   - MAX 2 per day: one morning, one afternoon (the marty_nudges log, today's rows).
//   - NEVER back-to-back (>= MIN_GAP_HOURS since the last offer).
//   - One offer, one task — never a list. The single most-overdue task, or ONE quick-win.
// The guardrails are ALWAYS enforced — there is no bypass (the M10 cleanup retired the
// "nudge test"/force path). On-demand "nudge" runs this exact guarded scan.

import { clockLabel, localHour, localToUtc, todayYMD } from "../_shared/datetime.ts";
import { owner, select, todayWindow } from "./sb.ts";

const WORK_START = 9, WORK_END = 18;        // 9am–6pm Amsterdam
const MIN_WINDOW_MS = 60 * 60 * 1000;        // a free window must be 60+ minutes
const MIN_GAP_HOURS = 2;                      // never back-to-back

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");

// marty_nudges has no archived_at, so its reads use a PLAIN owner filter (not sb.ts owner(),
// which appends archived_at=is.null and would error on this table).
const mine = () => `user_id=eq.${OWNER_USER_ID}`;

// Today's offers (for the caps). null on a read failure (→ stay quiet, never risk over-nudging).
async function todaysOffers(): Promise<{ period: string; createdMs: number }[] | null> {
  const { startUtc } = todayWindow();
  const rows = await select(`marty_nudges?${mine()}&created_at=gte.${startUtc}&select=period,created_at`);
  if (rows === null) return null;
  return rows.map((r) => ({ period: String(r.period), createdMs: new Date(String(r.created_at)).getTime() }));
}

// Events + scheduled tasks overlapping [a,b] as busy [start,end] ms. null on read failure.
async function busyIn(a: number, b: number): Promise<{ start: number; end: number }[] | null> {
  const aIso = new Date(a).toISOString(), bIso = new Date(b).toISOString();
  const events = await select(`events?${owner()}&start_at=lt.${bIso}&end_at=gt.${aIso}&select=start_at,end_at`);
  if (events === null) return null;
  const tasks = await select(`tasks?${owner()}&status=eq.open&scheduled_start=lt.${bIso}&select=scheduled_start,scheduled_end`);
  if (tasks === null) return null;
  const busy: { start: number; end: number }[] = [];
  for (const e of events) busy.push({ start: new Date(String(e.start_at)).getTime(), end: new Date(String(e.end_at)).getTime() });
  for (const t of tasks) {
    if (!t.scheduled_start) continue;
    const s = new Date(String(t.scheduled_start)).getTime();
    const en = t.scheduled_end ? new Date(String(t.scheduled_end)).getTime() : s + MIN_WINDOW_MS;
    if (en > a) busy.push({ start: s, end: en });
  }
  return busy;
}

// The earliest 60+ min free stretch from NOW (or 9am) to 6pm today, or null.
async function findWindow(): Promise<{ start: number; end: number } | null> {
  const today = todayYMD();
  const winStart = Math.max(Date.now(), localToUtc(today, "09:00").getTime());
  const winEnd = localToUtc(today, "18:00").getTime();
  if (winEnd - winStart < MIN_WINDOW_MS) return null;

  const busy = await busyIn(winStart, winEnd);
  if (busy === null) return null;
  const merged = busy
    .map((b) => ({ start: Math.max(b.start, winStart), end: Math.min(b.end, winEnd) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start)
    .reduce<{ start: number; end: number }[]>((acc, b) => {
      const last = acc[acc.length - 1];
      if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
      else acc.push({ ...b });
      return acc;
    }, []);

  let cursor = winStart;
  for (const m of merged) {
    if (m.start - cursor >= MIN_WINDOW_MS) return { start: cursor, end: Math.min(m.start, cursor + MIN_WINDOW_MS) };
    cursor = Math.max(cursor, m.end);
  }
  if (winEnd - cursor >= MIN_WINDOW_MS) return { start: cursor, end: cursor + MIN_WINDOW_MS };
  return null;
}

// The single task to offer: the MOST overdue; failing that, ONE quick-win (an unscheduled
// Today / This Week task that fits a 60-min window). null = nothing worth offering.
async function pickTask(): Promise<{ id: string; title: string } | null> {
  const today = todayYMD();
  const over = await select(`tasks?${owner()}&status=eq.open&due_date=lt.${today}&select=id,title&order=due_date.asc&limit=1`);
  if (over === null) return null;
  if (over.length) return { id: String(over[0].id), title: String(over[0].title) };

  const qw = await select(
    `tasks?${owner()}&status=eq.open&scheduled_start=is.null&time_bucket=in.(Today,This%20Week)&select=id,title&order=created_at.asc&limit=1`,
  );
  if (qw === null || qw.length === 0) return null;
  return { id: String(qw[0].id), title: String(qw[0].title) };
}

// Record the offer so the caps hold and the telegram reply can resolve it. Returns false
// if it couldn't store — in which case we do NOT offer (an unenforceable cap is worse).
async function recordOffer(taskId: string, start: number, end: number, period: string): Promise<boolean> {
  if (!SB_URL || !SERVICE_KEY || !OWNER_USER_ID) return false;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/marty_nudges`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: OWNER_USER_ID,
        offered_task_id: taskId,
        slot_start: new Date(start).toISOString(),
        slot_end: new Date(end).toISOString(),
        period,
      }),
    });
    return res.ok;
  } catch (_err) {
    return false;
  }
}

// The scan. Returns the calm offer text to send, or null to stay quiet. The guardrails
// are ALWAYS enforced — there is no bypass — whether this was poked by the hourly cron or
// fired on demand ("nudge"). Outside hours / over the caps / no window → it stays quiet.
export async function scanForNudge(): Promise<string | null> {
  const hour = localHour();
  if (hour < WORK_START || hour >= WORK_END) return null; // 9–6 only
  const period = hour < 12 ? "morning" : "afternoon";

  const todays = await todaysOffers();
  if (todays === null) return null;                                   // read failed → quiet
  if (todays.some((n) => n.period === period)) return null;           // already offered this half-day
  const last = Math.max(0, ...todays.map((n) => n.createdMs));
  if (last && Date.now() - last < MIN_GAP_HOURS * 3_600_000) return null; // never back-to-back

  const win = await findWindow();
  if (!win) return null;
  const task = await pickTask();
  if (!task) return null;

  if (!(await recordOffer(task.id, win.start, win.end, period))) return null;

  const slot = `${clockLabel(new Date(win.start).toISOString())}–${clockLabel(new Date(win.end).toISOString())}`;
  return `You've got a free window ${slot}. Want to use it for '${task.title}'? Reply "yes" to block it in, or "no" to skip.`;
}
