// LifeOS — Food → cook DEADLINES + serve anchor (3c-i, PURE). Anchors cookSchedule's second-offsets
// to real clock time and computes the serve-time drift. No Date.now — the caller passes nowMs, so
// this is a testable map. Nothing stored; all compute-on-read.

// anchorPlan({ schedule, finish, serveAtMs, cookStartMs, nowMs }) →
//   { startClockMs, deadlineMs: {index→ms}, endClockMs: {index→ms}, projectedFinishMs, serve }
// Anchor rules (spec): a serve time set → anchor BACKWARD from it (startClock = serve − span); else
// the cook has begun → anchor to the first timer start; else → anchor to now. A step's deadline is
// its LATEST start, in clock time ("start by 18:42").
export function anchorPlan({ schedule, finish, serveAtMs, cookStartMs, nowMs }) {
  const spanMs = (finish || 0) * 1000;
  const startClockMs =
    serveAtMs != null ? serveAtMs - spanMs :
    cookStartMs != null ? cookStartMs :
    nowMs;

  const deadlineMs = {}, endClockMs = {};
  for (const s of schedule || []) {
    deadlineMs[s.index] = startClockMs + s.latestStart * 1000;
    endClockMs[s.index] = startClockMs + s.latestEnd * 1000;
  }

  // Planned projection: the cook finishes span seconds after its actual start (or now if unstarted).
  const projectedFinishMs = (cookStartMs != null ? cookStartMs : nowMs) + spanMs;
  let serve = null;
  if (serveAtMs != null) {
    const driftSec = Math.round((projectedFinishMs - serveAtMs) / 1000);
    const state = Math.abs(driftSec) <= 60 ? "on_time" : driftSec > 0 ? "late" : "early";
    serve = { set: true, driftSec, state };
  }
  return { startClockMs, deadlineMs, endClockMs, projectedFinishMs, serve };
}

// A step deadline's urgency vs now: past it → 'overdue'; within 10 minutes → 'urgent'; else null.
// A readout only — never an alarm or interruption.
export function deadlineUrgency(deadlineMs, nowMs) {
  const d = (deadlineMs - nowMs) / 1000;
  if (d < 0) return "overdue";
  if (d <= 600) return "urgent";
  return null;
}
