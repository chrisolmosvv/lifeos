// LifeOS — Focus module P4: a tiny cross-pillar nav shim. The ▶ / "add past session"
// controls live in the task form (opened from Today / Calendar / Planning), but Setup
// and the manual form live in the Focus pillar. Rather than drill callbacks through
// every screen, a request parks a payload here and fires an event; LoggedIn hears it
// and switches to the Focus pillar; FocusPage picks up the parked payload on mount.
//
// payload: { mode: 'setup' | 'manual' | 'full', prefill?, taskId? }

let pending = null;

export function requestFocus(payload) {
  pending = payload || null;
  try { window.dispatchEvent(new CustomEvent("lifeos:focus-open")); } catch { /* no window */ }
}

// Read-and-clear the parked request (FocusPage calls this on mount / on the event).
export function takePendingFocus() {
  const p = pending;
  pending = null;
  return p;
}

// Peek at the parked request WITHOUT clearing it. FocusPage reads this while deciding
// its FIRST screen so the right destination paints immediately (no overview flash);
// the mount effect still consumes-and-clears it once (via takePendingFocus), so a
// later plain visit to Focus shows the overview, never a stale Setup. Pure by design
// (no mutation) — safe to call during render, incl. React StrictMode's double pass.
export function peekPendingFocus() {
  return pending;
}
