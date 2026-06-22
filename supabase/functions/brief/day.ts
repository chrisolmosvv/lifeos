// LifeOS — the morning brief, Piece 6b: read MY real day, plain text, no AI.
//
// Builds a deliberately ROBOTIC, rule-built summary of today from my real data,
// so I can eyeball it against the app and trust the reading BEFORE Gemini (6c)
// ever rewrites it. No prioritising, no "stale" logic, no cleverness — that's 6d.
//
// READ-ONLY. Uses Supabase's service-role key (auto-injected, server-side only)
// and filters every read to user_id = OWNER_USER_ID (defence in depth — service-
// role bypasses RLS, so the explicit filter is the guard). It NEVER writes.
//
// Groups, in order (each labelled; empty groups are stated, never hidden):
//   1. EVENTS TODAY  — events + time-blocked tasks (scheduled today), earliest first
//   2. TODAY         — open tasks in the 'Today' bucket
//   3. DUE TODAY     — open tasks whose due_date is today
//   4. OVERDUE       — open tasks whose due_date is before today
// A task may appear in more than one group — that's fine, we do not dedupe (6d).

import { addDaysYMD, clockLabel, humanDate, localToUtc, todayYMD } from "../_shared/datetime.ts";

const SB_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID");
export const dayConfigured = !!(SB_URL && SERVICE_KEY && OWNER_USER_ID);

// One read-only PostgREST query. Returns the rows, or null on any failure (so the
// caller can tell "empty day" apart from "couldn't read").
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

// Format a group: a heading, then either its lines or a plain "empty" sentence.
function block(heading: string, lines: string[], emptyText: string): string {
  return `${heading}\n${lines.length ? lines.join("\n") : emptyText}`;
}

// Build the whole brief text, or null if any read failed (caller sends a fallback).
export async function buildBrief(): Promise<string | null> {
  if (!dayConfigured) return null;

  const today = todayYMD();
  const tomorrow = addDaysYMD(today, 1);
  const startUtc = localToUtc(today, "00:00").toISOString();    // today 00:00 local
  const endUtc = localToUtc(tomorrow, "00:00").toISOString();   // tomorrow 00:00 local

  // 1) Events today + time-blocked (scheduled) open tasks today, merged by time.
  const events = await select(
    `events?${owner()}&start_at=gte.${startUtc}&start_at=lt.${endUtc}&select=title,start_at&order=start_at.asc`,
  );
  const blocked = await select(
    `tasks?${owner()}&status=eq.open&scheduled_start=gte.${startUtc}&scheduled_start=lt.${endUtc}&select=title,scheduled_start&order=scheduled_start.asc`,
  );

  // 2) Open tasks in the Today bucket.
  const todayTasks = await select(
    `tasks?${owner()}&status=eq.open&time_bucket=eq.Today&select=title&order=created_at.asc`,
  );

  // 3) Open tasks due today (any bucket).
  const dueToday = await select(
    `tasks?${owner()}&status=eq.open&due_date=eq.${today}&select=title&order=created_at.asc`,
  );

  // 4) Open tasks whose due date is before today.
  const overdue = await select(
    `tasks?${owner()}&status=eq.open&due_date=lt.${today}&select=title,due_date&order=due_date.asc`,
  );

  // Any read failing means we can't trust the picture — bail to a fallback.
  if ([events, blocked, todayTasks, dueToday, overdue].some((r) => r === null)) return null;

  // --- Group 1: merge events + time-blocked tasks, sort by their time. ---
  type Timed = { time: number; line: string };
  const timed: Timed[] = [];
  for (const e of events!) {
    const iso = String(e.start_at);
    timed.push({ time: new Date(iso).getTime(), line: `• ${e.title} — ${clockLabel(iso)}` });
  }
  for (const t of blocked!) {
    const iso = String(t.scheduled_start);
    timed.push({ time: new Date(iso).getTime(), line: `• ${t.title} — ${clockLabel(iso)} (task)` });
  }
  timed.sort((a, b) => a.time - b.time);

  const eventLines = timed.map((x) => x.line);
  const todayLines = todayTasks!.map((t) => `• ${t.title}`);
  const dueLines = dueToday!.map((t) => `• ${t.title}`);
  const overdueLines = overdue!.map((t) => `• ${t.title} (was due ${humanDate(String(t.due_date))})`);

  return [
    `Your day — ${humanDate(today)}`,
    "",
    block("EVENTS TODAY", eventLines, "No events today."),
    "",
    block("TODAY", todayLines, "Nothing in your Today list."),
    "",
    block("DUE TODAY", dueLines, "Nothing due today."),
    "",
    block("OVERDUE", overdueLines, "Nothing overdue."),
  ].join("\n");
}
