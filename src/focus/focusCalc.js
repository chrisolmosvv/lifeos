// LifeOS — Focus module P1: the day-level calc layer (PURE, compute-on-read).
//
// PURE FUNCTIONS ONLY. No database, no fetch, no React — these take raw
// focus_sessions rows (as plain objects, straight from Supabase) and return
// numbers / plain shapes. focusLoad.js does the fetching; the maths lives here so
// it can be verified in isolation and never drifts. Week/trend aggregates live in
// focusTrend.js; display strings in focusFormat.js.
//
// LOCKED DECISIONS (focus-module-spec.md §1/§6 + Planner rulings A/B):
//   • Duration is NEVER stored — always computed here from timestamps.
//   • Only FOCUS segments count toward logged time + the dial; BREAK segments are
//     rest (a separate secondary total + the ghost arcs).
//   • A RUNNING session (ended_at NULL) is excluded from the dial + every total.
//   • Ruling B — a session belongs to its START day (amsYMD of started_at); the day
//     TOTAL counts the whole session, but a dial ARC truncates at midnight (1440).
//   • The day boundary is Amsterdam — reuse the ONE shared helper (gymDates), never
//     a new one.

import { amsYMD, amsClockMinutes } from "../gym/gymDates.js";

const MIN_PER_DAY = 1440;

// A finite number or 0 — never NaN/undefined leaks into a sum.
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
// Absolute milliseconds for a timestamp/ISO/Date; 0 for a missing/unparseable value.
function ms(v) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

// A running session = no end time yet (the live row that drives the header marker).
export function isRunning(session) {
  return !session?.ended_at;
}

// Normalise a session to raw {kind, start, end, seconds} blocks, timezone-agnostic
// (seconds are true elapsed from the timestamps — correct even across midnight):
//   • intervals → the stored `segments` (each { kind:'focus'|'break', start, end }).
//   • count_up / count_down → ONE focus block, started_at → ended_at.
//   • a running session → [] (nothing logged until it stops).
export function sessionSegments(session) {
  if (!session || isRunning(session)) return [];
  const raw = Array.isArray(session.segments) ? session.segments : [];
  const blocks = raw.length
    ? raw
    : [{ kind: "focus", start: session.started_at, end: session.ended_at }];
  return blocks
    .map((b) => {
      const start = ms(b.start), end = ms(b.end);
      return { kind: b.kind === "break" ? "break" : "focus", start, end, seconds: end > start ? (end - start) / 1000 : 0 };
    })
    .filter((b) => b.seconds > 0 || b.start > 0);
}

// Logged FOCUS seconds for one session (break time excluded). 0 while running.
export function sessionFocusSeconds(session) {
  return sessionSegments(session).reduce((t, b) => (b.kind === "focus" ? t + b.seconds : t), 0);
}
// Logged REST/break seconds for one session (intervals only; 0 otherwise).
export function sessionRestSeconds(session) {
  return sessionSegments(session).reduce((t, b) => (b.kind === "break" ? t + b.seconds : t), 0);
}

// The finished, non-archived, non-running sessions whose START day (Amsterdam) is
// `ymd` — the single day-membership rule every day getter below shares (ruling B).
export function sessionsOnDay(sessions, ymd) {
  return (sessions || []).filter(
    (s) => s && !s.archived_at && !isRunning(s) && amsYMD(s.started_at) === ymd,
  );
}

// Today's total FOCUS seconds (the dial centre) and total REST seconds (secondary).
export function dayFocusTotal(sessions, ymd) {
  return sessionsOnDay(sessions, ymd).reduce((t, s) => t + sessionFocusSeconds(s), 0);
}
export function dayRestTotal(sessions, ymd) {
  return sessionsOnDay(sessions, ymd).reduce((t, s) => t + sessionRestSeconds(s), 0);
}

// Focus + rest seconds per category for the day → Map<categoryId|null, {focus,rest}>.
// (Drives the tap-to-filter per-category totals; null = no-category sessions.)
export function dayCategoryTotals(sessions, ymd) {
  const out = new Map();
  for (const s of sessionsOnDay(sessions, ymd)) {
    const key = s.category_id ?? null;
    const b = out.get(key) || { focus: 0, rest: 0 };
    b.focus += sessionFocusSeconds(s);
    b.rest += sessionRestSeconds(s);
    out.set(key, b);
  }
  return out;
}

// One ledger entry from a session (time range, category, task, duration, stars,
// note). Clock minutes come from the shared Amsterdam helper. Shared by the day
// ledger and the full "see all" ledger so their rows never drift.
function ledgerRow(s) {
  return {
    id: s.id,
    ymd: amsYMD(s.started_at),
    startMin: amsClockMinutes(s.started_at),
    endMin: amsClockMinutes(s.ended_at),
    categoryId: s.category_id ?? null,
    categorySnapshot: s.category_snapshot ?? null,
    taskId: s.task_id ?? null,
    taskTitle: s.task_title_snapshot ?? null,
    mode: s.mode,
    source: s.source,
    focusSeconds: sessionFocusSeconds(s),
    restSeconds: sessionRestSeconds(s),
    rating: s.rating ?? null,
    note: s.note ?? null,
  };
}

// The day ledger: one entry per day-session, NEWEST FIRST.
export function dayLedger(sessions, ymd) {
  return sessionsOnDay(sessions, ymd)
    .slice()
    .sort((a, b) => ms(b.started_at) - ms(a.started_at))
    .map(ledgerRow);
}

// The full ledger for the "see all" page: every finished, non-archived session in
// the given rows, NEWEST FIRST (each row carries its ymd). Not day-scoped.
export function ledgerAll(sessions) {
  return (sessions || [])
    .filter((s) => s && !s.archived_at && !isRunning(s))
    .sort((a, b) => ms(b.started_at) - ms(a.started_at))
    .map(ledgerRow);
}

// Dial arcs for the day: focus arcs (category colour) + rest arcs (ghost/hatched),
// each { id, categoryId, startMin, endMin } on the 0..1440 ring. Ruling B: an arc
// that runs past midnight is truncated to 1440 (the day total still counts it whole).
export function dayArcs(sessions, ymd) {
  const focus = [], rest = [];
  for (const s of sessionsOnDay(sessions, ymd)) {
    for (const seg of sessionSegments(s)) {
      let startMin = amsClockMinutes(seg.start);
      let endMin = amsClockMinutes(seg.end);
      if (startMin == null) continue;
      if (endMin == null || endMin <= startMin) endMin = MIN_PER_DAY; // wrapped past midnight → truncate
      const arc = { id: s.id, categoryId: s.category_id ?? null, startMin, endMin };
      (seg.kind === "break" ? rest : focus).push(arc);
    }
  }
  return { focus, rest };
}

// ── Per-task (the reverse view: row tag + the form's Focus section) ───────────
// All-time logged FOCUS seconds for one task across all history (running + archived
// excluded). No subtree roll-up — a task shows only its own focus.
export function perTaskTotal(sessions, taskId) {
  if (!taskId) return 0;
  return (sessions || [])
    .filter((s) => s && !s.archived_at && !isRunning(s) && s.task_id === taskId)
    .reduce((t, s) => t + sessionFocusSeconds(s), 0);
}
// That task's finished sessions, NEWEST FIRST, shaped for the form's session list.
export function taskSessions(sessions, taskId) {
  if (!taskId) return [];
  return (sessions || [])
    .filter((s) => s && !s.archived_at && !isRunning(s) && s.task_id === taskId)
    .sort((a, b) => ms(b.started_at) - ms(a.started_at))
    .map((s) => ({
      id: s.id,
      ymd: amsYMD(s.started_at),
      startMin: amsClockMinutes(s.started_at),
      endMin: amsClockMinutes(s.ended_at),
      focusSeconds: sessionFocusSeconds(s),
      rating: s.rating ?? null,
      note: s.note ?? null,
    }));
}
