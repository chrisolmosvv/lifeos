// cookReplay — PURE function: cook_event rows (ordered by created_at) → derived live state.
// No fetch, no writes, no Date.now — the caller passes `now` so this is a testable map.
// This is the core of the event-sourced cook: every piece of visible state is computed here.

/**
 * replayCookEvents(events, now)
 *
 * @param {Array} events — cook_event rows, ordered by created_at ASC
 * @param {number} now — current wall-clock time (ms since epoch)
 * @returns {{
 *   stepStates: Object<string, 'waiting'|'active'|'done'>,
 *   tickedIngredients: Set<string>,
 *   usedIngredients: Set<string>,
 *   timers: Array<{ targetRef: string, durationSeconds: number, startedAt: number, remaining: number, done: boolean }>,
 *   finished: boolean
 * }}
 */
export function replayCookEvents(events, now) {
  const stepStates = {};        // targetRef → last status
  const ingredientTicks = {};   // targetRef → true/false (last toggle wins — shopping)
  const ingredientUsed = {};    // targetRef → true/false (last toggle wins — cooking)
  const timerStarts = {};       // targetRef → { durationSeconds, startedAt }
  const timerStops = new Set(); // targetRef values that have been stopped
  let finished = false;

  for (const e of events || []) {
    const ref = e.target_ref;
    const payload = e.payload || {};
    const ts = new Date(e.created_at).getTime();

    switch (e.event_type) {
      case "step_marked":
        stepStates[ref] = payload.status || "waiting";
        break;

      case "ingredient_ticked":
        // Toggle: if already ticked, untick; if not, tick (shopping)
        ingredientTicks[ref] = !ingredientTicks[ref];
        break;

      case "ingredient_used":
        // Toggle: mark used / un-used (cooking)
        ingredientUsed[ref] = !ingredientUsed[ref];
        break;

      case "timer_started":
        timerStarts[ref] = { durationSeconds: payload.duration_seconds || 0, startedAt: ts };
        timerStops.delete(ref); // a new start clears any previous stop
        break;

      case "timer_stopped":
        timerStops.add(ref);
        break;

      case "finished":
        finished = true;
        break;
    }
  }

  // Derive running timers: started and not stopped
  const timers = [];
  for (const [ref, t] of Object.entries(timerStarts)) {
    if (timerStops.has(ref)) continue;
    const elapsed = (now - t.startedAt) / 1000;
    const remaining = Math.max(0, t.durationSeconds - elapsed);
    timers.push({
      targetRef: ref,
      durationSeconds: t.durationSeconds,
      startedAt: t.startedAt,
      remaining: Math.round(remaining),
      done: remaining <= 0,
    });
  }

  // Derive ticked sets (independent: shopping vs cooking)
  const tickedIngredients = new Set();
  for (const [ref, ticked] of Object.entries(ingredientTicks)) {
    if (ticked) tickedIngredients.add(ref);
  }
  const usedIngredients = new Set();
  for (const [ref, used] of Object.entries(ingredientUsed)) {
    if (used) usedIngredients.add(ref);
  }

  return { stepStates, tickedIngredients, usedIngredients, timers, finished };
}
