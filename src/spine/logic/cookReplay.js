// cookReplay — PURE function: cook_event rows (ordered by created_at) → derived live state.
// No fetch, no writes, no Date.now — the caller passes `now` so this is a testable map.
//
// ★ TWO MODELS live here right now (Cookbook 3b, Amendment A22 — ADDITIVE):
//   • OLD outputs (stepStates, timers[].done, clamped remaining) — a TEMPORARY BRIDGE, kept
//     EXACTLY as they were so the still-live MobileCook.jsx keeps working unchanged. Marked
//     "BRIDGE" below. Remove when the mobile cook is reworked or retired.
//   • NEW outputs (liveStates, liveTimers with SIGNED remaining + reachedZero + segment-summed
//     elapsed) — what the desktop cook plan (3b) reads. Position derives from TIMERS ONLY;
//     step_marked is ignored here.

export function replayCookEvents(events, now) {
  // ── BRIDGE (mobile): last-write-wins step marks + last-start-wins timers, clamped remaining ──
  const stepStates = {};        // BRIDGE — targetRef → status, from step_marked (mobile only)
  const ingredientTicks = {};   // targetRef → bool (shopping)
  const ingredientUsed = {};    // targetRef → bool (cooking)
  const timerStarts = {};       // BRIDGE — targetRef → { durationSeconds, startedAt }
  const timerStops = new Set();  // BRIDGE — refs stopped
  let finished = false;

  // ── NEW (desktop 3b): per-step timer SEGMENTS for signed remaining + timer-derived state ──
  const seg = {};               // targetRef → { duration, accumulated (sec), runningSince (ts|null) }

  for (const e of events || []) {
    const ref = e.target_ref;
    const payload = e.payload || {};
    const ts = new Date(e.created_at).getTime();

    switch (e.event_type) {
      case "step_marked": // BRIDGE only — the NEW model ignores this entirely.
        stepStates[ref] = payload.status || "waiting";
        break;
      case "ingredient_ticked":
        ingredientTicks[ref] = !ingredientTicks[ref];
        break;
      case "ingredient_used":
        ingredientUsed[ref] = !ingredientUsed[ref];
        break;
      case "timer_started":
        timerStarts[ref] = { durationSeconds: payload.duration_seconds || 0, startedAt: ts }; // BRIDGE
        timerStops.delete(ref); // BRIDGE
        // NEW: a fresh start resets the segment accumulator and runs from here.
        seg[ref] = { duration: payload.duration_seconds || 0, accumulated: 0, runningSince: ts };
        break;
      case "timer_resumed": {
        // NEW only (db/47): CONTINUE — keep accumulated elapsed + duration, run again from here.
        const c = seg[ref];
        if (c) c.runningSince = ts;
        else seg[ref] = { duration: payload.duration_seconds || 0, accumulated: 0, runningSince: ts };
        break;
      }
      case "timer_stopped":
        timerStops.add(ref); // BRIDGE
        // NEW: close the live segment into the accumulator.
        if (seg[ref] && seg[ref].runningSince != null) {
          seg[ref].accumulated += (ts - seg[ref].runningSince) / 1000;
          seg[ref].runningSince = null;
        }
        break;
      case "finished":
        finished = true;
        break;
    }
  }

  // ── BRIDGE: derive old-shape running timers (clamped remaining + done) ──
  const timers = [];
  for (const [ref, t] of Object.entries(timerStarts)) {
    if (timerStops.has(ref)) continue;
    const elapsed = (now - t.startedAt) / 1000;
    const remaining = Math.max(0, t.durationSeconds - elapsed);
    timers.push({ targetRef: ref, durationSeconds: t.durationSeconds, startedAt: t.startedAt, remaining: Math.round(remaining), done: remaining <= 0 });
  }

  // ── NEW: signed remaining, reachedZero, segment-summed elapsed, timer-derived step state ──
  const liveTimers = [];
  const liveStates = {}; // targetRef → 'active' | 'done' (steps with NO timer are absent → 'waiting')
  for (const [ref, c] of Object.entries(seg)) {
    const running = c.runningSince != null;
    const elapsed = c.accumulated + (running ? (now - c.runningSince) / 1000 : 0);
    const remaining = Math.round(c.duration - elapsed); // SIGNED — negative = overrun, keeps counting
    const reachedZero = remaining <= 0;
    liveTimers.push({ targetRef: ref, durationSeconds: c.duration, elapsed: Math.round(elapsed), remaining, running, reachedZero });
    // running & within → active; stopped, or running past zero → done. No timer → waiting (absent).
    liveStates[ref] = running && !reachedZero ? "active" : "done";
  }

  const tickedIngredients = new Set();
  for (const [ref, ticked] of Object.entries(ingredientTicks)) if (ticked) tickedIngredients.add(ref);
  const usedIngredients = new Set();
  for (const [ref, used] of Object.entries(ingredientUsed)) if (used) usedIngredients.add(ref);

  return { stepStates, tickedIngredients, usedIngredients, timers, finished, liveStates, liveTimers };
}
