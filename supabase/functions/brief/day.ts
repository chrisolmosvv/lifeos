// LifeOS — the morning brief: read MY real day (Piece 6b) + pick the one forgotten
// task (Piece 6d) + thread in the gap offer (Piece 6e). The verified, deterministic
// source of truth for the written brief (6c). The CODE decides every fact, which task
// is "forgotten", and the gap offer; Gemini (write.ts) only phrases what's handed it.
//
// READ-ONLY via sb.ts (service-role, owner-filtered). It NEVER writes.
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

import { clockLabel, daysBetweenYMD, humanDate } from "../_shared/datetime.ts";
import { dayConfigured, owner, select, todayWindow } from "./sb.ts";
import type { GapOffer } from "./gap.ts";

// How long an open This Week task sits untouched before the brief gently surfaces it.
// One named constant so it's easy to read/change. ("brief test" passes 0 to see it
// fire immediately on real tasks — see index.ts.)
export const FORGOTTEN_DAYS = 3;

// The gathered, structured day — the single source of truth for the checklist (the
// fallback), the Gemini facts, AND the numbered action map (M8). Every item carries its
// row id + table so a brief number can act on the EXACT item.
export interface NamedItem { id: string; title: string; }
export interface TimedItem { id: string; title: string; clock: string; isTask: boolean; }
export interface OverdueItem { id: string; title: string; dueYMD: string; daysOverdue: number; }
export interface DayData {
  today: string;          // YYYY-MM-DD (Europe/Amsterdam)
  timed: TimedItem[];     // events + time-blocked tasks, earliest first
  todayTasks: NamedItem[];
  dueToday: NamedItem[];
  overdue: OverdueItem[];
}

// Read today's real data. Returns null if ANY read failed (so we never show a
// half-true day). Empty groups come back as empty arrays — that's information.
export async function gatherDay(): Promise<DayData | null> {
  if (!dayConfigured) return null;

  const { today, startUtc, endUtc } = todayWindow();

  const events = await select(
    `events?${owner()}&start_at=gte.${startUtc}&start_at=lt.${endUtc}&select=id,title,start_at&order=start_at.asc`,
  );
  const blocked = await select(
    `tasks?${owner()}&status=eq.open&scheduled_start=gte.${startUtc}&scheduled_start=lt.${endUtc}&select=id,title,scheduled_start&order=scheduled_start.asc`,
  );
  const todayTasks = await select(
    `tasks?${owner()}&status=eq.open&time_bucket=eq.Today&select=id,title&order=created_at.asc`,
  );
  const dueToday = await select(
    `tasks?${owner()}&status=eq.open&due_date=eq.${today}&select=id,title&order=created_at.asc`,
  );
  const overdue = await select(
    `tasks?${owner()}&status=eq.open&due_date=lt.${today}&select=id,title,due_date&order=due_date.asc`,
  );

  if ([events, blocked, todayTasks, dueToday, overdue].some((r) => r === null)) return null;

  // Merge events + time-blocked tasks and sort by their time.
  const timed: { time: number; item: TimedItem }[] = [];
  for (const e of events!) {
    const iso = String(e.start_at);
    timed.push({ time: new Date(iso).getTime(), item: { id: String(e.id), title: String(e.title), clock: clockLabel(iso), isTask: false } });
  }
  for (const t of blocked!) {
    const iso = String(t.scheduled_start);
    timed.push({ time: new Date(iso).getTime(), item: { id: String(t.id), title: String(t.title), clock: clockLabel(iso), isTask: true } });
  }
  timed.sort((a, b) => a.time - b.time);

  return {
    today,
    timed: timed.map((x) => x.item),
    todayTasks: todayTasks!.map((t) => ({ id: String(t.id), title: String(t.title) })),
    dueToday: dueToday!.map((t) => ({ id: String(t.id), title: String(t.title) })),
    overdue: overdue!.map((t) => {
      const dueYMD = String(t.due_date);
      return { id: String(t.id), title: String(t.title), dueYMD, daysOverdue: daysBetweenYMD(dueYMD, today) };
    }),
  };
}

// Pick the ONE forgotten task (6d), or null if none qualify. Rule: an OPEN task in
// 'This Week', created `thresholdDays`+ ago, that is NOT shown elsewhere in today's
// brief — i.e. not due today, not overdue, not scheduled onto today's calendar. Of
// those, the single MOST untouched (oldest created_at). Code-side and deterministic;
// Gemini only phrases it. Returns the task's title. (thresholdDays = 0 in test mode.)
export async function pickForgotten(thresholdDays: number): Promise<NamedItem | null> {
  if (!dayConfigured) return null;
  const { today, startUtc, endUtc } = todayWindow();
  const cutoff = new Date(Date.now() - thresholdDays * 86400000).toISOString();

  // Open This Week tasks created at/before the cutoff, oldest first. (created_at is
  // the only "untouched" signal — there is no updated_at column.)
  const rows = await select(
    `tasks?${owner()}&status=eq.open&time_bucket=eq.This%20Week&created_at=lte.${cutoff}&select=id,title,due_date,scheduled_start,created_at&order=created_at.asc`,
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
    return { id: String(r.id), title: String(r.title) }; // oldest survivor = most untouched
  }
  return null;
}

// The plain 6b checklist — ALSO the trustworthy fallback if Gemini fails (6c). The
// forgotten nudge (6d) and the gap offer (6e) are appended as calm lines, so they
// survive even when Gemini is unavailable (both are picked code-side, not by AI). If
// the gap task IS the forgotten task, the two are merged into one line (never twice).
export function formatChecklist(d: DayData, forgotten: string | null = null, gap: GapOffer | null = null): string {
  const block = (heading: string, lines: string[], empty: string) =>
    `${heading}\n${lines.length ? lines.join("\n") : empty}`;
  const eventLines = d.timed.map((x) => `• ${x.title} — ${x.clock}${x.isTask ? " (task)" : ""}`);
  // NEEDS ATTENTION (the footer, M8): due today + overdue, merged under one heading so
  // what needs action is together at the end.
  const attentionLines = [
    ...d.dueToday.map((t) => `• ${t.title} — due today`),
    ...d.overdue.map((o) => `• ${o.title} — overdue (was due ${humanDate(o.dueYMD)})`),
  ];
  const parts = [
    `Your day — ${humanDate(d.today)}`,
    "",
    block("TODAY'S SCHEDULE", eventLines, "Nothing scheduled today."),
    "",
    block("IN YOUR TODAY LIST", d.todayTasks.map((t) => `• ${t.title}`), "Nothing in your Today list."),
    "",
    block("NEEDS ATTENTION", attentionLines, "Nothing overdue or due today."),
  ];
  if (forgotten) {
    const merged = gap && gap.isForgotten;
    parts.push("", merged
      ? `BEEN WAITING\n• ${forgotten} — free window ${gap!.startClock}–${gap!.endClock}`
      : `BEEN WAITING\n• ${forgotten}`);
  }
  if (gap && !gap.isForgotten) {
    parts.push("", `FREE WINDOW\n• ${gap.startClock}–${gap.endClock} — could tackle: ${gap.taskTitle}`);
  }
  return parts.join("\n");
}

// The SAME facts, as a compact brief for Gemini to rewrite (6c). Day-counts are
// precomputed so Gemini never does date math; empty groups are stated plainly. A
// forgotten task (6d) and/or a gap offer (6e) are added as the gentle extras Gemini
// phrases — never chooses. When the gap task is already noted, the writer is told to
// fold it into ONE thought (no task named twice).
export function factsForGemini(d: DayData, forgotten: string | null = null, gap: GapOffer | null = null): string {
  const calendar = d.timed.length
    ? d.timed.map((x) => `- ${x.title} at ${x.clock}${x.isTask ? " (a time-blocked task)" : ""}`).join("\n")
    : "- nothing on the calendar";
  const today = d.todayTasks.length ? d.todayTasks.map((t) => `- ${t.title}`).join("\n") : "- none";
  const due = d.dueToday.length ? d.dueToday.map((t) => `- ${t.title}`).join("\n") : "- none";
  const over = d.overdue.length
    ? d.overdue.map((o) => `- ${o.title} (${o.daysOverdue} day${o.daysOverdue === 1 ? "" : "s"} overdue)`).join("\n")
    : "- none";

  // Order matters (M8): LEAD with the schedule; put what needs attention (due/overdue)
  // toward the END as a footer. The write.ts prompt mirrors this ordering.
  let out = [
    `Today is ${humanDate(d.today)}.`,
    `LEAD WITH THIS — today's schedule (events and time-blocked tasks), earliest first:\n${calendar}`,
    `Tasks in today's column:\n${today}`,
    `NEEDS ATTENTION (put this toward the end) — due today:\n${due}`,
    `NEEDS ATTENTION (put this toward the end) — overdue:\n${over}`,
  ].join("\n\n");

  if (forgotten) {
    out += `\n\nOne task that's been waiting (mention it once, gently, exactly as named): ${forgotten}`;
  }
  if (gap) {
    out += gap.sameItem
      ? `\n\nThe owner has a clear stretch today from ${gap.startClock} to ${gap.endClock}. Offer it as a chance to deal with the task already noted above ("${gap.taskTitle}") — fold this into ONE coherent thought; do not mention that task a second time as if new.`
      : `\n\nThe owner has a clear stretch today from ${gap.startClock} to ${gap.endClock} — a good chance to tackle "${gap.taskTitle}". Offer it gently, as an option, never a command.`;
  }
  return out;
}
