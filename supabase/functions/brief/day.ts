// LifeOS — the morning brief: read MY real day (Piece 6b) + pick the one forgotten
// task (Piece 6d). The verified, deterministic source of truth for the written brief
// (6c). Deliberately accurate — the CODE decides every fact and which task is
// "forgotten"; Gemini (write.ts) only phrases what this module hands it.
//
// READ-ONLY. Uses Supabase's service-role key (auto-injected, server-side only) and
// filters every read to user_id = OWNER_USER_ID (defence in depth — service-role
// bypasses RLS, so the explicit filter is the guard). It NEVER writes.
//
// Groups, in order (each labelled; empty groups are stated, never hidden):
//   1. EVENTS TODAY  — events + time-blocked tasks (scheduled today), earliest first
//   2. TODAY         — open tasks in the 'Today' bucket
//   3. DUE TODAY     — open tasks whose due_date is today
//   4. OVERDUE       — open tasks whose due_date is before today
// A task may appear in more than one group — that's fine, we do not dedupe (6d).
//
// THE FORGOTTEN NUDGE (6d): at most ONE per brief — the single most untouched open
// 'This Week' task NOT already shown above. "Untouched" = created_at 3+ days ago,
// because the tasks table has NO updated_at column (created_at is the only signal);
// so moving a task between buckets does NOT reset its clock. See the handoff.

import { addDaysYMD, clockLabel, daysBetweenYMD, humanDate, localToUtc, todayYMD } from "../_shared/datetime.ts";

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");
export const dayConfigured = !!(SB_URL && SERVICE_KEY && OWNER_USER_ID);

// How long an open This Week task sits untouched before the brief gently surfaces it.
// One named constant so it's easy to read/change. ("brief test" passes 0 to see it
// fire immediately on real tasks — see index.ts.)
export const FORGOTTEN_DAYS = 3;

// One read-only PostgREST query. Returns the rows, or null on any failure (so the
// caller can tell "empty" apart from "couldn't read").
async function select(query: string): Promise<Record<string, unknown>[] | null> {
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

const owner = () => `user_id=eq.${OWNER_USER_ID}`;

// Today's date + the UTC bounds of today (Europe/Amsterdam midnight→midnight),
// shared by the day read and the forgotten-task picker so "today" means one thing.
function todayWindow(): { today: string; startUtc: string; endUtc: string } {
  const today = todayYMD();
  const tomorrow = addDaysYMD(today, 1);
  return {
    today,
    startUtc: localToUtc(today, "00:00").toISOString(),
    endUtc: localToUtc(tomorrow, "00:00").toISOString(),
  };
}

// The gathered, structured day — the single source of truth both the plain
// checklist (the fallback) and the Gemini facts are built from.
export interface TimedItem { title: string; clock: string; isTask: boolean; }
export interface OverdueItem { title: string; dueYMD: string; daysOverdue: number; }
export interface DayData {
  today: string;          // YYYY-MM-DD (Europe/Amsterdam)
  timed: TimedItem[];     // events + time-blocked tasks, earliest first
  todayTasks: string[];
  dueToday: string[];
  overdue: OverdueItem[];
}

// Read today's real data. Returns null if ANY read failed (so we never show a
// half-true day). Empty groups come back as empty arrays — that's information.
export async function gatherDay(): Promise<DayData | null> {
  if (!dayConfigured) return null;

  const { today, startUtc, endUtc } = todayWindow();

  const events = await select(
    `events?${owner()}&start_at=gte.${startUtc}&start_at=lt.${endUtc}&select=title,start_at&order=start_at.asc`,
  );
  const blocked = await select(
    `tasks?${owner()}&status=eq.open&scheduled_start=gte.${startUtc}&scheduled_start=lt.${endUtc}&select=title,scheduled_start&order=scheduled_start.asc`,
  );
  const todayTasks = await select(
    `tasks?${owner()}&status=eq.open&time_bucket=eq.Today&select=title&order=created_at.asc`,
  );
  const dueToday = await select(
    `tasks?${owner()}&status=eq.open&due_date=eq.${today}&select=title&order=created_at.asc`,
  );
  const overdue = await select(
    `tasks?${owner()}&status=eq.open&due_date=lt.${today}&select=title,due_date&order=due_date.asc`,
  );

  if ([events, blocked, todayTasks, dueToday, overdue].some((r) => r === null)) return null;

  // Merge events + time-blocked tasks and sort by their time.
  const timed: { time: number; item: TimedItem }[] = [];
  for (const e of events!) {
    const iso = String(e.start_at);
    timed.push({ time: new Date(iso).getTime(), item: { title: String(e.title), clock: clockLabel(iso), isTask: false } });
  }
  for (const t of blocked!) {
    const iso = String(t.scheduled_start);
    timed.push({ time: new Date(iso).getTime(), item: { title: String(t.title), clock: clockLabel(iso), isTask: true } });
  }
  timed.sort((a, b) => a.time - b.time);

  return {
    today,
    timed: timed.map((x) => x.item),
    todayTasks: todayTasks!.map((t) => String(t.title)),
    dueToday: dueToday!.map((t) => String(t.title)),
    overdue: overdue!.map((t) => {
      const dueYMD = String(t.due_date);
      return { title: String(t.title), dueYMD, daysOverdue: daysBetweenYMD(dueYMD, today) };
    }),
  };
}

// Pick the ONE forgotten task (6d), or null if none qualify. Rule: an OPEN task in
// 'This Week', created `thresholdDays`+ ago, that is NOT shown elsewhere in today's
// brief — i.e. not due today, not overdue, not scheduled onto today's calendar. Of
// those, the single MOST untouched (oldest created_at). Code-side and deterministic;
// Gemini only phrases it. Returns the task's title. (thresholdDays = 0 in test mode.)
export async function pickForgotten(thresholdDays: number): Promise<string | null> {
  if (!dayConfigured) return null;
  const { today, startUtc, endUtc } = todayWindow();
  const cutoff = new Date(Date.now() - thresholdDays * 86400000).toISOString();

  // Open This Week tasks created at/before the cutoff, oldest first. (created_at is
  // the only "untouched" signal — there is no updated_at column.)
  const rows = await select(
    `tasks?${owner()}&status=eq.open&time_bucket=eq.This%20Week&created_at=lte.${cutoff}&select=title,due_date,scheduled_start,created_at&order=created_at.asc`,
  );
  if (rows === null) return null; // read failed → no nudge (the brief still sends)

  const startMs = new Date(startUtc).getTime();
  const endMs = new Date(endUtc).getTime();
  for (const r of rows) {
    const due = r.due_date ? String(r.due_date) : null;
    if (due && due <= today) continue; // due today or overdue → already shown above
    const sched = r.scheduled_start ? String(r.scheduled_start) : null;
    if (sched) {
      const t = new Date(sched).getTime();
      if (t >= startMs && t < endMs) continue; // scheduled today → shown in EVENTS TODAY
    }
    return String(r.title); // oldest survivor = the single most untouched task
  }
  return null;
}

// The plain 6b checklist — ALSO the trustworthy fallback if Gemini fails (6c). When
// a forgotten task is supplied it's appended as one calm line, so the nudge survives
// even when Gemini is unavailable (selection is code-side, not AI).
export function formatChecklist(d: DayData, forgotten: string | null = null): string {
  const block = (heading: string, lines: string[], empty: string) =>
    `${heading}\n${lines.length ? lines.join("\n") : empty}`;
  const eventLines = d.timed.map((x) => `• ${x.title} — ${x.clock}${x.isTask ? " (task)" : ""}`);
  const overdueLines = d.overdue.map((o) => `• ${o.title} (was due ${humanDate(o.dueYMD)})`);
  const parts = [
    `Your day — ${humanDate(d.today)}`,
    "",
    block("EVENTS TODAY", eventLines, "No events today."),
    "",
    block("TODAY", d.todayTasks.map((t) => `• ${t}`), "Nothing in your Today list."),
    "",
    block("DUE TODAY", d.dueToday.map((t) => `• ${t}`), "Nothing due today."),
    "",
    block("OVERDUE", overdueLines, "Nothing overdue."),
  ];
  if (forgotten) parts.push("", `BEEN WAITING\n• ${forgotten}`);
  return parts.join("\n");
}

// The SAME facts, as a compact brief for Gemini to rewrite (6c). Day-counts are
// precomputed so Gemini never does date math; empty groups are stated plainly so it
// can't imply an item that isn't there. A supplied forgotten task is added as the
// single gentle reminder to weave in — Gemini phrases it, never chooses it.
export function factsForGemini(d: DayData, forgotten: string | null = null): string {
  const calendar = d.timed.length
    ? d.timed.map((x) => `- ${x.title} at ${x.clock}${x.isTask ? " (a time-blocked task)" : ""}`).join("\n")
    : "- nothing on the calendar";
  const today = d.todayTasks.length ? d.todayTasks.map((t) => `- ${t}`).join("\n") : "- none";
  const due = d.dueToday.length ? d.dueToday.map((t) => `- ${t}`).join("\n") : "- none";
  const over = d.overdue.length
    ? d.overdue.map((o) => `- ${o.title} (${o.daysOverdue} day${o.daysOverdue === 1 ? "" : "s"} overdue)`).join("\n")
    : "- none";
  const base = [
    `Today is ${humanDate(d.today)}.`,
    `Calendar today (events and time-blocked tasks), earliest first:\n${calendar}`,
    `Tasks in today's column:\n${today}`,
    `Due today:\n${due}`,
    `Overdue:\n${over}`,
  ].join("\n\n");
  if (!forgotten) return base;
  return `${base}\n\nOne task that's been waiting (mention it once, gently, exactly as named): ${forgotten}`;
}
