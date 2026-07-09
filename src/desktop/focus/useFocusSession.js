import { useCallback, useEffect, useRef, useState } from "react";
import { amsYMD, amsTodayYMD } from "../../spine/logic/gymDates";
import { fetchRunning } from "./focusLoad.js";
import { startSession, finalizeSession, discardSession, markTaskDone } from "./focusWrite.js";
import { computeLive, reconstructIntervals, sumKind, isSingleFocusBlock, chime } from "./focusTimer.js";

// useFocusSession — the single running-session engine (spec §4/§5/§1a). Owns the
// live timer, the segment record (pauses = gaps between segments), persistence of the
// running row, and the load-time stale guard. It is the ONE source of "is something
// running" — the header marker (piece 5) will read the same hook.
//
// status: 'loading' | 'idle' | 'stale' | 'running' | 'paused' | 'saving'
const STALE_HOURS = 12; // a running row older than this, or from a past day, is orphaned

// Persist the running row's segments in the background (D2 reload fidelity) — reuses the
// segments-update path, best-effort: a failed write never blocks the phase switch (the
// save card still corrects at Stop, as today). The row stays running (ended_at NULL).
function persistRunning(id, segments) {
  finalizeSession(id, { segments }).catch(() => {});
}

// Split a running row's persisted segments (D2) into closed phases + the open phase (the
// entry with no `end`). null = no persisted split yet (a legacy/empty row → reconstruct).
function splitPersisted(row) {
  const raw = Array.isArray(row.segments) ? row.segments : [];
  if (!raw.length) return null;
  const closed = raw.filter((s) => s && s.end);
  const marker = raw.find((s) => s && !s.end);
  return { closed, open: marker ? { kind: marker.kind, start: marker.start } : { kind: "focus", start: row.started_at } };
}

export function useFocusSession() {
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState(null); // the running/finishing row
  const [segments, setSegments] = useState([]); // closed segments
  const [openSeg, setOpenSeg] = useState(null); // the in-progress segment
  const [staleRow, setStaleRow] = useState(null);
  const [pending, setPending] = useState(null); // stop → the save-card draft
  const [, setTick] = useState(0);
  const chimedRef = useRef(false); // count_down zero-chime fired once
  const phaseChimedRef = useRef(false); // interval: this phase's target-chime fired once
  const pausedKind = useRef("focus");

  const nowMs = () => Date.now();

  const reset = useCallback(() => {
    setSession(null); setSegments([]); setOpenSeg(null); setPending(null);
    chimedRef.current = false; phaseChimedRef.current = false; setStatus("idle");
  }, []);

  // Resume a fresh running row (rebuilds the timeline; pause history is not persisted).
  const resumeRow = useCallback((row) => {
    setSession(row);
    if (row.mode === "intervals") {
      // D2: restore the TRUE hand-set split from the persisted segments; only fall back to
      // the even reconstruction for a legacy pre-D2 row that has none.
      const split = splitPersisted(row);
      if (split) { setSegments(split.closed); setOpenSeg(split.open); }
      else {
        const r = reconstructIntervals(new Date(row.started_at).getTime(), row.target_seconds, row.break_seconds, Date.now());
        setSegments(r.segments); setOpenSeg(r.open);
      }
    } else {
      setSegments([]); setOpenSeg({ kind: "focus", start: row.started_at });
    }
    chimedRef.current =
      row.mode === "count_down" && Date.now() - new Date(row.started_at).getTime() >= (row.target_seconds || 0) * 1000;
    phaseChimedRef.current = false; // the resumed open phase is mid-way; let its target chime once
    setStatus("running");
  }, []);

  // Load-time guard: resume a fresh row; prompt on a stale/orphaned one (§1a).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const row = await fetchRunning();
        if (!live) return;
        if (!row) return setStatus("idle");
        const ageH = (Date.now() - new Date(row.started_at).getTime()) / 3600000;
        if (amsYMD(row.started_at) === amsTodayYMD() && ageH < STALE_HOURS) resumeRow(row);
        else { setStaleRow(row); setStatus("stale"); }
      } catch {
        if (live) setStatus("idle");
      }
    })();
    return () => { live = false; };
  }, [resumeRow]);

  // 1s tick while running: re-render + the target chimes. Intervals are HAND-BOUNDED —
  // NO auto-switch; the tick only chimes ONCE when the open phase hits its target (the
  // phase then holds + counts on until Enter/End break). count_down keeps its zero-chime.
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const t = Date.now();
      setTick((n) => n + 1);
      if (session?.mode === "intervals" && openSeg && !phaseChimedRef.current) {
        const phaseLen = (openSeg.kind === "focus" ? session.target_seconds : session.break_seconds) * 1000;
        if (phaseLen > 0 && t - new Date(openSeg.start).getTime() >= phaseLen) {
          chime(); phaseChimedRef.current = true;
        }
      }
      if (session?.mode === "count_down" && !chimedRef.current) {
        if (t - new Date(session.started_at).getTime() >= (session.target_seconds || 0) * 1000) {
          chime(); chimedRef.current = true;
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [status, session, openSeg]);

  // ── Controls ────────────────────────────────────────────────────────────────
  const start = useCallback(async (fields) => {
    const row = await startSession({ ...fields, started_at: new Date().toISOString() });
    const open = { kind: "focus", start: row.started_at };
    setSession(row); setSegments([]); setOpenSeg(open);
    chimedRef.current = false; phaseChimedRef.current = false; setStatus("running");
    // Mark the open phase on the running row (D2) so a reload restores THIS split, not an
    // even re-guess. Intervals only; single-block modes stay segments:[].
    if (row.mode === "intervals") persistRunning(row.id, [{ ...open, end: null }]);
    return row;
  }, []);

  // Hand-bounded interval phase switch (Enter break / End break) — close the open phase
  // and open the OPPOSITE kind (the pause/resume close-one/open-next move, opposite kind).
  // The recorded segment is the phase's REAL start→end (overage included as plain time).
  const switchPhase = useCallback(() => {
    if (!openSeg) return;
    const now = new Date().toISOString();
    const next = openSeg.kind === "focus" ? "break" : "focus";
    const closed = [...segments, { ...openSeg, end: now }];
    const nextOpen = { kind: next, start: now };
    setSegments(closed);
    setOpenSeg(nextOpen);
    phaseChimedRef.current = false; // the new phase gets its own target chime
    // Persist the true split (closed phases + the new open marker) to the running row so a
    // mid-session reload restores this hand-set boundary. Background / best-effort (D2).
    if (session?.id) persistRunning(session.id, [...closed, { ...nextOpen, end: null }]);
  }, [openSeg, segments, session]);

  const pause = useCallback(() => {
    if (!openSeg) return;
    pausedKind.current = openSeg.kind;
    setSegments((s) => [...s, { ...openSeg, end: new Date().toISOString() }]);
    setOpenSeg(null); setStatus("paused");
  }, [openSeg]);

  const resume = useCallback(() => {
    setOpenSeg({ kind: pausedKind.current || "focus", start: new Date().toISOString() });
    setStatus("running");
  }, []);

  const stop = useCallback(() => {
    const endIso = new Date().toISOString();
    const finalSegs = openSeg ? [...segments, { ...openSeg, end: endIso }] : [...segments];
    setOpenSeg(null);
    const focusSeconds = sumKind(finalSegs, "focus", null, 0);
    const restSeconds = sumKind(finalSegs, "break", null, 0);
    setPending({
      session, segments: finalSegs, focusSeconds, restSeconds,
      simple: isSingleFocusBlock(session.mode, finalSegs),
      startedAt: session.started_at, endedAt: endIso,
    });
    setStatus("saving");
  }, [openSeg, segments, session]);

  // Save the finishing session (throws on failure so the card can show it + retry;
  // the running row stays ended_at NULL = nothing lost until the write lands).
  const save = useCallback(async ({ durationSeconds, rating, note, markDone }) => {
    const p = pending;
    let ended_at, segs;
    if (p.simple) { segs = []; ended_at = new Date(new Date(p.startedAt).getTime() + durationSeconds * 1000).toISOString(); }
    else { segs = p.segments; ended_at = p.endedAt; }
    await finalizeSession(p.session.id, { ended_at, segments: segs, rating: rating ?? null, note: note?.trim() || null });
    if (markDone && p.session.task_id) await markTaskDone(p.session.task_id);
    reset();
  }, [pending, reset]);

  const discard = useCallback(async () => {
    const id = pending?.session?.id || session?.id;
    if (id) await discardSession(id);
    reset();
  }, [pending, session, reset]);

  const resolveStale = useCallback(async (choice) => {
    const row = staleRow;
    if (!row) return;
    if (choice === "discard") { await discardSession(row.id); setStaleRow(null); setStatus("idle"); return; }
    // finalise: reconstruct the timeline to now and hand it to the save card.
    const end = Date.now();
    let finalSegs;
    if (row.mode === "intervals") {
      // Prefer the persisted hand-set split (D2); reconstruct only for a legacy row.
      const split = splitPersisted(row);
      if (split) finalSegs = [...split.closed, { ...split.open, end: new Date(end).toISOString() }];
      else {
        const r = reconstructIntervals(new Date(row.started_at).getTime(), row.target_seconds, row.break_seconds, end);
        finalSegs = [...r.segments, { ...r.open, end: new Date(end).toISOString() }];
      }
    } else {
      finalSegs = [{ kind: "focus", start: row.started_at, end: new Date(end).toISOString() }];
    }
    setSession(row); setStaleRow(null);
    setPending({
      session: row, segments: finalSegs,
      focusSeconds: sumKind(finalSegs, "focus", null, 0), restSeconds: sumKind(finalSegs, "break", null, 0),
      simple: row.mode !== "intervals", startedAt: row.started_at, endedAt: new Date(end).toISOString(),
    });
    setStatus("saving");
  }, [staleRow]);

  const live = session && (status === "running" || status === "paused")
    ? computeLive(session, segments, openSeg, nowMs())
    : null;

  return { status, session, live, pending, staleRow, start, pause, resume, switchPhase, stop, save, discard, resolveStale };
}
