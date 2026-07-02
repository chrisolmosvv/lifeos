// LifeOS — Focus module P2: the timer engine's PURE maths (no React, no clock of
// its own — every function takes `nowMs`). It turns the raw segment record into the
// live display the split-flap shows, and reconstructs the segment timeline on reload
// (spec §4 / §1a). Duration is always real elapsed from timestamps; pauses are GAPS
// between segments, so summing focus-segment time excludes paused time for free.

const ms = (iso) => new Date(iso).getTime();

// Active seconds of one kind: closed segments of that kind + the open one (to now).
export function sumKind(segments, kind, openSeg, nowMs) {
  let t = 0;
  for (const s of segments || []) if (s.kind === kind) t += Math.max(0, (ms(s.end) - ms(s.start)) / 1000);
  if (openSeg && openSeg.kind === kind) t += Math.max(0, (nowMs - ms(openSeg.start)) / 1000);
  return t;
}

// Whether a finished segment list is a SINGLE unbroken focus block (no pauses, no
// breaks) — the count_up/count_down happy path we persist as segments:[] + ended_at
// (matches the calc layer's "no segments → started_at→ended_at" reading).
export function isSingleFocusBlock(mode, segments) {
  return mode !== "intervals" && segments.length === 1 && segments[0].kind === "focus";
}

// Rebuild the interval timeline from started_at → now assuming NO pauses (used on a
// mid-session reload, where client-only pause history is gone — the save card lets
// the owner correct it). Returns { segments:[closed…], open:{kind,start} }.
export function reconstructIntervals(startMs, target, brk, nowMs) {
  const segments = [];
  let cursor = startMs;
  let kind = "focus";
  const phase = (k) => (k === "focus" ? target : brk) * 1000;
  // Guard: a 0-length phase would loop forever — bail to a single open focus block.
  if (!(target > 0) || !(brk > 0)) return { segments, open: { kind: "focus", start: new Date(startMs).toISOString() } };
  while (cursor + phase(kind) <= nowMs) {
    const end = cursor + phase(kind);
    segments.push({ kind, start: new Date(cursor).toISOString(), end: new Date(end).toISOString() });
    cursor = end;
    kind = kind === "focus" ? "break" : "focus";
  }
  return { segments, open: { kind, start: new Date(cursor).toISOString() } };
}

// The live readout for the split-flap:
//   { focusSeconds, breakSeconds, display (seconds to show), register, slim, progress }
// register drives the flap's tone: 'focus' | 'break' (muted) | 'overtime' (terracotta).
export function computeLive(session, segments, openSeg, nowMs) {
  const focusSeconds = sumKind(segments, "focus", openSeg, nowMs);
  const breakSeconds = sumKind(segments, "break", openSeg, nowMs);
  const target = session.target_seconds || 0;
  const brk = session.break_seconds || 0;

  if (session.mode === "count_up") {
    return { focusSeconds, breakSeconds, display: focusSeconds, register: "focus", slim: "Counting up", progress: null };
  }

  if (session.mode === "count_down") {
    const remaining = target - focusSeconds;
    if (remaining > 0)
      return { focusSeconds, breakSeconds, display: remaining, register: "focus", slim: "Counting down", progress: target ? focusSeconds / target : 0 };
    return { focusSeconds, breakSeconds, display: -remaining, register: "overtime", slim: "Overtime — stop when ready", progress: 1 };
  }

  // intervals — the live phase is the OPEN segment's kind + its countdown.
  const kind = openSeg ? openSeg.kind : "focus";
  const openSecs = openSeg ? Math.max(0, (nowMs - ms(openSeg.start)) / 1000) : 0;
  const phaseLen = kind === "focus" ? target : brk;
  const remaining = Math.max(0, phaseLen - openSecs);
  return {
    focusSeconds,
    breakSeconds,
    display: remaining,
    register: kind === "break" ? "break" : "focus",
    slim: kind === "break" ? "Break" : "Focus",
    progress: phaseLen ? Math.min(1, openSecs / phaseLen) : 0,
  };
}

// A short chime when a count-down hits zero / an interval phase flips. Uses WebAudio
// (allowed — the session began on a click). Silently no-ops if audio is unavailable
// or the user prefers reduced motion.
export function chime() {
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.52);
    o.onended = () => ctx.close?.();
  } catch {
    /* no audio — the visual register shift still signals the change */
  }
}
