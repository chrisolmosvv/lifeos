// LifeOS — the morning brief, Piece 6e: the "fill a gap" suggestion (RESERVED mode).
//
// When today has a real empty stretch AND a genuinely worth-doing task is waiting,
// the brief offers ONE gentle suggestion to use that time for it. Reserved, not
// eager — when in doubt, say nothing. The CODE finds the gap and picks the task
// (deterministic); Gemini (write.ts) only phrases the offer.
//
// READ-ONLY. Reads via sb.ts (service-role, owner-filtered). Nothing here writes.

import { clockLabel, localToUtc } from "../_shared/datetime.ts";
import { owner, select, todayWindow } from "./sb.ts";

// A GAP = a continuous free stretch in TODAY's calendar of at least GAP_MIN_HOURS,
// inside [GAP_WINDOW_START, GAP_WINDOW_END] local, with NO events and NO time-blocked
// tasks. Earliest qualifying stretch wins. Named constants — easy to read/change.
export const GAP_MIN_HOURS = 2;
export const GAP_WINDOW_START = "08:00";
export const GAP_WINDOW_END = "20:00";
const HOUR_MS = 3_600_000;

interface Busy { start: number; end: number; }

// Events + time-blocked open tasks that touch today's window, as [start,end] ms.
// A scheduled task with no end is treated as a 1-hour block (matches the app default).
async function busyToday(winStartMs: number, winEndMs: number): Promise<Busy[] | null> {
  const winStartIso = new Date(winStartMs).toISOString();
  const winEndIso = new Date(winEndMs).toISOString();

  const events = await select(
    `events?${owner()}&start_at=lt.${winEndIso}&end_at=gt.${winStartIso}&select=start_at,end_at`,
  );
  if (events === null) return null;
  const tasks = await select(
    `tasks?${owner()}&status=eq.open&scheduled_start=lt.${winEndIso}&select=scheduled_start,scheduled_end`,
  );
  if (tasks === null) return null;

  const busy: Busy[] = [];
  for (const e of events) {
    busy.push({ start: new Date(String(e.start_at)).getTime(), end: new Date(String(e.end_at)).getTime() });
  }
  for (const t of tasks) {
    if (!t.scheduled_start) continue;
    const s = new Date(String(t.scheduled_start)).getTime();
    const e = t.scheduled_end ? new Date(String(t.scheduled_end)).getTime() : s + HOUR_MS;
    if (e > winStartMs) busy.push({ start: s, end: e });
  }
  return busy;
}

// The earliest free stretch >= GAP_MIN_HOURS inside today's window, or null.
async function findGap(): Promise<{ startMs: number; endMs: number } | null> {
  const { today } = todayWindow();
  const winStart = localToUtc(today, GAP_WINDOW_START).getTime();
  const winEnd = localToUtc(today, GAP_WINDOW_END).getTime();
  const minMs = GAP_MIN_HOURS * HOUR_MS;

  const busy = await busyToday(winStart, winEnd);
  if (busy === null) return null;

  // Clip to the window, drop empties, sort, merge overlaps.
  const clipped = busy
    .map((b) => ({ start: Math.max(b.start, winStart), end: Math.min(b.end, winEnd) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const merged: Busy[] = [];
  for (const b of clipped) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else merged.push({ ...b });
  }

  // Walk the free stretches between busy blocks (and the window edges).
  let cursor = winStart;
  for (const m of merged) {
    if (m.start - cursor >= minMs) return { startMs: cursor, endMs: m.start };
    cursor = Math.max(cursor, m.end);
  }
  if (winEnd - cursor >= minMs) return { startMs: cursor, endMs: winEnd };
  return null;
}

// The worth-doing candidate task for the gap (RESERVED mode), in priority order,
// first that exists: 1) the forgotten task (6d), 2) most overdue, 3) due today,
// 4) a high-priority Today/This Week task. None of those -> null (no suggestion).
type Reason = "forgotten" | "overdue" | "dueToday" | "highPriority";
interface Candidate { title: string; reason: Reason; bucket?: string; }

async function pickGapTask(forgottenTitle: string | null): Promise<Candidate | null> {
  const { today } = todayWindow();

  if (forgottenTitle) return { title: forgottenTitle, reason: "forgotten" };

  const over = await select(
    `tasks?${owner()}&status=eq.open&due_date=lt.${today}&select=title&order=due_date.asc&limit=1`,
  );
  if (over === null) return null;
  if (over.length) return { title: String(over[0].title), reason: "overdue" };

  const due = await select(
    `tasks?${owner()}&status=eq.open&due_date=eq.${today}&select=title&order=created_at.asc&limit=1`,
  );
  if (due === null) return null;
  if (due.length) return { title: String(due[0].title), reason: "dueToday" };

  const hi = await select(
    `tasks?${owner()}&status=eq.open&priority=eq.high&select=title,time_bucket&order=created_at.asc`,
  );
  if (hi === null) return null;
  const h = hi.find((r) => r.time_bucket === "Today" || r.time_bucket === "This Week");
  if (h) return { title: String(h.title), reason: "highPriority", bucket: String(h.time_bucket) };

  return null;
}

// The single gap offer for the brief, or null. Needs BOTH a real gap AND a
// worth-doing task. `sameItem` = this task is already mentioned elsewhere in the
// brief (so the writer folds it in, never names it twice); `isForgotten` = it's the
// exact 6d forgotten task (so the checklist merges the two lines).
export interface GapOffer {
  startClock: string;
  endClock: string;
  taskTitle: string;
  sameItem: boolean;
  isForgotten: boolean;
}

export async function pickGapOffer(forgottenTitle: string | null): Promise<GapOffer | null> {
  const gap = await findGap();
  if (!gap) return null;
  const cand = await pickGapTask(forgottenTitle);
  if (!cand) return null;

  // Already-shown cases: forgotten (6d line), overdue/due-today (body groups), and a
  // high-priority Today task (it's in the TODAY group). A high-priority This Week task
  // is the only candidate not otherwise in the brief — a fresh, fine mention.
  const sameItem = cand.reason !== "highPriority" || cand.bucket === "Today";
  return {
    startClock: clockLabel(new Date(gap.startMs).toISOString()),
    endClock: clockLabel(new Date(gap.endMs).toISOString()),
    taskTitle: cand.title,
    sameItem,
    isForgotten: cand.reason === "forgotten",
  };
}
