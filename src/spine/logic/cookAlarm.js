// cookAlarm — Web Audio two-tone looping beep for the timer-done alarm.
// Init the AudioContext on a user gesture (first timer start) to satisfy
// browser autoplay policy. The beep loops until stopAlarm() is called.
// Pure module — no React, no state; the component controls start/stop.

let ctx = null;
let loopTimer = null;

// Call on the first user gesture that may later need sound (e.g. starting a timer).
export function initAudioContext() {
  if (ctx) return;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* no audio */ }
}

function beepOnce() {
  if (!ctx) return;
  const now = ctx.currentTime;
  // Two-tone: 880Hz then 1320Hz, each 120ms, gentle fade
  for (const [freq, offset] of [[880, 0], [1320, 0.15]]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.13);
  }
}

export function startAlarm() {
  stopAlarm();
  // Resume context if it was suspended (Safari pauses after inactivity)
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  beepOnce();
  loopTimer = setInterval(beepOnce, 1100);
}

export function stopAlarm() {
  if (loopTimer != null) { clearInterval(loopTimer); loopTimer = null; }
}
