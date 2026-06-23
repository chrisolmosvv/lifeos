// LifeOS — Telegram bot, M1: the READ-ONLY query path. Answers the owner's questions
// about their day and CHANGES NOTHING.
//
// READ-ONLY BY CONSTRUCTION: this module imports ONLY `select` from db.ts — never
// `insert` or `del`. There is no write/update/delete code here at all, not even an
// unused one. Every read is owner-scoped AND active-only (archived_at IS NULL), the
// SAME rules the morning brief uses (see brief/sb.ts `owner()`).
//
// Answers are plain text on purpose (correct and clear first). Handing them to Gemini
// for nicer phrasing is a possible LATER piece — not built now.

import { dbConfigured, OWNER_USER_ID, select } from "./db.ts";
import { addDaysYMD, clockLabel, humanDate, localToUtc, todayYMD } from "../_shared/datetime.ts";
import type { Classified } from "./intent.ts";

const READ_FAILED = "I couldn't reach your schedule just now — nothing changed. Try again?";

// The filter every read carries: the owner's rows, active only (not archived).
const scope = () => `user_id=eq.${OWNER_USER_ID}&archived_at=is.null`;

// The UTC bounds of one local calendar day (Europe/Amsterdam midnight → next midnight).
function dayBoundsUtc(date: string): { start: string; end: string } {
  return {
    start: localToUtc(date, "00:00").toISOString(),
    end: localToUtc(addDaysYMD(date, 1), "00:00").toISOString(),
  };
}

// "what's on Thursday?" — events + time-blocked tasks (in time order) + anything due
// that day. Read-only.
async function agenda(date: string): Promise<string> {
  const { start, end } = dayBoundsUtc(date);
  const events = await select(
    `events?${scope()}&start_at=gte.${start}&start_at=lt.${end}&select=title,start_at&order=start_at.asc`,
  );
  const blocked = await select(
    `tasks?${scope()}&status=eq.open&scheduled_start=gte.${start}&scheduled_start=lt.${end}&select=title,scheduled_start&order=scheduled_start.asc`,
  );
  const due = await select(
    `tasks?${scope()}&status=eq.open&due_date=eq.${date}&select=title&order=created_at.asc`,
  );
  if (events === null || blocked === null || due === null) return READ_FAILED;

  // Merge events + scheduled tasks and sort by their clock time.
  const timed: { ms: number; line: string }[] = [];
  for (const e of events) {
    const iso = String(e.start_at);
    timed.push({ ms: new Date(iso).getTime(), line: `• ${clockLabel(iso)} — ${String(e.title)}` });
  }
  for (const t of blocked) {
    const iso = String(t.scheduled_start);
    timed.push({ ms: new Date(iso).getTime(), line: `• ${clockLabel(iso)} — ${String(t.title)} (task)` });
  }
  timed.sort((a, b) => a.ms - b.ms);

  if (!timed.length && !due.length) return `Nothing on ${humanDate(date)} — a clear day.`;

  const lines = [`${humanDate(date)}:`];
  if (timed.length) lines.push(...timed.map((x) => x.line));
  if (due.length) {
    if (timed.length) lines.push("");
    lines.push("Due that day:", ...due.map((t) => `• ${String(t.title)}`));
  }
  return lines.join("\n");
}

// "what did I forget?" — the overdue pile + what's due today. Read-only.
// NOTE (known issue, NOT fixed here): a bare date with no year can resolve to the PAST
// at capture time, so a task can look overdue when it shouldn't. We report what the
// data says and neither hide nor depend on that bug (see 08-marty-upgrade.md).
async function forgot(): Promise<string> {
  const today = todayYMD();
  const overdue = await select(
    `tasks?${scope()}&status=eq.open&due_date=lt.${today}&select=title,due_date&order=due_date.asc`,
  );
  const dueToday = await select(
    `tasks?${scope()}&status=eq.open&due_date=eq.${today}&select=title&order=created_at.asc`,
  );
  if (overdue === null || dueToday === null) return READ_FAILED;

  if (!overdue.length && !dueToday.length) return "Nothing overdue or due today — you're on top of things.";

  const lines: string[] = [];
  if (overdue.length) {
    lines.push("Overdue:", ...overdue.map((o) => `• ${String(o.title)} (was due ${humanDate(String(o.due_date))})`));
  }
  if (dueToday.length) {
    if (lines.length) lines.push("");
    lines.push("Due today:", ...dueToday.map((t) => `• ${String(t.title)}`));
  }
  return lines.join("\n");
}

// "am I free Friday afternoon?" — look at the named window and say plainly whether it's
// open. Read-only. Windows are local clock ranges.
const PARTS: Record<string, [string, string]> = {
  morning: ["08:00", "12:00"],
  afternoon: ["12:00", "18:00"],
  evening: ["18:00", "22:00"],
  day: ["08:00", "20:00"],
};
const HOUR_MS = 3_600_000;
interface Busy { start: number; end: number; title: string; }

async function free(date: string, dayPart: string): Promise<string> {
  const [ps, pe] = PARTS[dayPart] ?? PARTS["day"];
  const winStart = localToUtc(date, ps).getTime();
  const winEnd = localToUtc(date, pe).getTime();
  const winStartIso = new Date(winStart).toISOString();
  const winEndIso = new Date(winEnd).toISOString();

  const events = await select(
    `events?${scope()}&start_at=lt.${winEndIso}&end_at=gt.${winStartIso}&select=title,start_at,end_at&order=start_at.asc`,
  );
  const tasks = await select(
    `tasks?${scope()}&status=eq.open&scheduled_start=lt.${winEndIso}&select=title,scheduled_start,scheduled_end`,
  );
  if (events === null || tasks === null) return READ_FAILED;

  const busy: Busy[] = [];
  for (const e of events) {
    busy.push({ start: new Date(String(e.start_at)).getTime(), end: new Date(String(e.end_at)).getTime(), title: String(e.title) });
  }
  for (const t of tasks) {
    if (!t.scheduled_start) continue;
    const s = new Date(String(t.scheduled_start)).getTime();
    const en = t.scheduled_end ? new Date(String(t.scheduled_end)).getTime() : s + HOUR_MS;
    if (en > winStart) busy.push({ start: s, end: en, title: String(t.title) });
  }

  const inWin = busy.filter((b) => b.end > winStart && b.start < winEnd).sort((a, b) => a.start - b.start);
  const label = `${humanDate(date)}${dayPart && dayPart !== "day" ? ` ${dayPart}` : ""}`;

  if (!inWin.length) return `You're free ${label} — nothing booked.`;

  const lines = [`Not totally free ${label}. You've got:`];
  for (const b of inWin) {
    lines.push(`• ${clockLabel(new Date(Math.max(b.start, winStart)).toISOString())} — ${b.title}`);
  }
  // Report the biggest remaining open stretch in the window, if it's worth naming.
  const gap = largestFreeGap(inWin, winStart, winEnd);
  if (gap && gap.end - gap.start >= HOUR_MS) {
    lines.push(`Still open: ${clockLabel(new Date(gap.start).toISOString())}–${clockLabel(new Date(gap.end).toISOString())}.`);
  }
  return lines.join("\n");
}

// The single largest free stretch inside [winStart, winEnd] given busy blocks. Clips to
// the window, merges overlaps, then returns the widest gap (or null if fully booked).
function largestFreeGap(busy: Busy[], winStart: number, winEnd: number): { start: number; end: number } | null {
  const clipped = busy
    .map((b) => ({ start: Math.max(b.start, winStart), end: Math.min(b.end, winEnd) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const b of clipped) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else merged.push({ ...b });
  }
  let best: { start: number; end: number } | null = null;
  let cursor = winStart;
  for (const m of merged) {
    if (m.start - cursor > 0 && (!best || m.start - cursor > best.end - best.start)) best = { start: cursor, end: m.start };
    cursor = Math.max(cursor, m.end);
  }
  if (winEnd - cursor > 0 && (!best || winEnd - cursor > best.end - best.start)) best = { start: cursor, end: winEnd };
  return best;
}

// Dispatch a classified QUESTION to the right reader and return a plain-text answer.
// Read-only throughout. (Caller guarantees c.kind === "question".)
export async function answerQuery(c: Classified): Promise<string> {
  if (!dbConfigured) return "I can't check your schedule right now — give it a moment and ask again.";
  const date = c.date || todayYMD(); // a question with no day defaults to today
  if (c.query_type === "forgot") return await forgot();
  if (c.query_type === "free") return await free(date, c.day_part || "day");
  return await agenda(date); // "agenda" and any unlabelled question
}
