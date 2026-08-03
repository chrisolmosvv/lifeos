// useCookEvents — the React hook for the event-sourced cook. Loads an active session's
// events, replays them into derived state, provides action dispatchers that INSERT events
// and optimistically append to the local list. A 1-second tick updates timer remaining.
// Resume is FREE: on mount, fetch events + replay = identical to a fresh render.
//
// 3b changes (additive): startTimer is the ONLY session-creating action (the cook begins on the
// first timer); ingredient/stop/resume actions never create a session. Optimistic events are
// RECONCILED to the server row once persisted (clock-skew fix — see commit()). markStep is kept
// as a BRIDGE for the still-live MobileCook and still creates a session on first mark.

import { useCallback, useEffect, useRef, useState } from "react";
import { replayCookEvents } from "../logic/cookReplay.js";
import {
  fetchActiveSession,
  fetchSessionEvents,
  startSession,
  finishSession,
  markStep as markStepAction,
  tickIngredient as tickAction,
  useIngredient as useAction,
  startTimer as startTimerAction,
  stopTimer as stopTimerAction,
  resumeTimer as resumeTimerAction,
  setServeTime as setServeTimeAction,
  adjustEstimate as adjustEstimateAction,
  adjustTimer as adjustTimerAction,
  changeAmount as changeAmountAction,
  omitIngredient as omitIngredientAction,
  abandonSession,
} from "./cookEventStore.js";

export function useCookEvents(recipeId) {
  const [session, setSession] = useState(null);  // the session header row (or null)
  const [events, setEvents] = useState([]);       // cook_event rows, ordered by created_at
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);
  const localIdRef = useRef(0);
  const [localServe, setLocalServe] = useState(null); // serve time set before a session exists
  const pendingServeRef = useRef(null);               // flushed to the session on create

  // 1-second tick for timer countdowns — wall-clock math, not a decrementing counter
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Load on mount: find active session for this recipe, fetch its events
  useEffect(() => {
    let alive = true;
    setReady(false);
    setSession(null);
    setEvents([]);
    fetchActiveSession(recipeId)
      .then(async (s) => {
        if (!alive) return;
        if (s) {
          const evts = await fetchSessionEvents(s.id);
          if (!alive) return;
          setSession(s);
          setEvents(evts);
        }
        setReady(true);
      })
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [recipeId]);

  // Derive state from events — the core replay, recomputed on every event change + tick
  const state = replayCookEvents(events, now);

  // Optimistic append with a local id, so the persisted row can replace it later.
  const appendOptimistic = useCallback((evt) => {
    const _localId = ++localIdRef.current;
    setEvents((cur) => [...cur, { ...evt, _localId }]);
    return _localId;
  }, []);

  // Clock-skew fix (3b): once a row persists, swap the optimistic event (CLIENT created_at) for the
  // server row (authoritative created_at + id), then re-sort so replay ordering matches the server.
  // This makes a live timer read identically before and after a reload — the make-or-break case.
  const commit = useCallback((localId, row) => {
    if (!row) return;
    setEvents((cur) => {
      const next = cur.map((e) => (e._localId === localId ? { ...row } : e));
      next.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return next;
    });
  }, []);

  // Lazy-start: create a session on first TIMER start (or first mark, via the mobile bridge).
  const ensureSession = useCallback(async () => {
    if (session) return session.id;
    const s = await startSession(recipeId);
    setSession(s);
    // Flush a serve time set before the cook began (3c-i).
    if (pendingServeRef.current) { setServeTimeAction(s.id, pendingServeRef.current).catch(() => {}); pendingServeRef.current = null; }
    return s.id;
  }, [session, recipeId]);

  // 3c-i: the serve anchor. Persists to the session when one exists; otherwise held locally and
  // flushed on session create — setting a serve time must NOT begin the cook.
  const serveAt = session?.target_serve_at ?? localServe;
  const setServeTime = useCallback((iso) => {
    setLocalServe(iso);
    if (session) setServeTimeAction(session.id, iso).catch(() => {});
    else pendingServeRef.current = iso;
  }, [session]);

  const nowIso = () => new Date().toISOString();

  // ── Action dispatchers ──────────────────────────────────────────────────────

  // BRIDGE (mobile only): still creates a session on first mark + drives step_marked.
  const markStep = useCallback(async (stepIndex, newStatus) => {
    const sid = await ensureSession();
    const lid = appendOptimistic({ event_type: "step_marked", target_ref: String(stepIndex), payload: { status: newStatus }, created_at: nowIso() });
    try { commit(lid, await markStepAction(sid, stepIndex, newStatus)); } catch { /* optimistic stays */ }
  }, [ensureSession, appendOptimistic, commit]);

  // 3b: ingredient actions must NOT create a session — no-op until a timer has started one.
  const tickIngredient = useCallback(async (ingredientRef) => {
    if (!session) return;
    const lid = appendOptimistic({ event_type: "ingredient_ticked", target_ref: String(ingredientRef), payload: null, created_at: nowIso() });
    try { commit(lid, await tickAction(session.id, ingredientRef)); } catch { /* */ }
  }, [session, appendOptimistic, commit]);

  const useIngredient = useCallback(async (ingredientRef) => {
    if (!session) return;
    const lid = appendOptimistic({ event_type: "ingredient_used", target_ref: String(ingredientRef), payload: null, created_at: nowIso() });
    try { commit(lid, await useAction(session.id, ingredientRef)); } catch { /* */ }
  }, [session, appendOptimistic, commit]);

  // 3b: the cook BEGINS here — the only session-creating action on the desktop plan.
  const startTimer = useCallback(async (stepIndex, durationSeconds) => {
    const sid = await ensureSession();
    const lid = appendOptimistic({ event_type: "timer_started", target_ref: String(stepIndex), payload: { duration_seconds: durationSeconds }, created_at: nowIso() });
    try { commit(lid, await startTimerAction(sid, stepIndex, durationSeconds)); } catch { /* */ }
  }, [ensureSession, appendOptimistic, commit]);

  const stopTimer = useCallback(async (stepIndex) => {
    if (!session) return;
    const lid = appendOptimistic({ event_type: "timer_stopped", target_ref: String(stepIndex), payload: null, created_at: nowIso() });
    try { commit(lid, await stopTimerAction(session.id, stepIndex)); } catch { /* */ }
  }, [session, appendOptimistic, commit]);

  // 3b: resume a stopped timer — continue from accumulated elapsed (segment-summed in replay).
  const resumeTimer = useCallback(async (stepIndex) => {
    if (!session) return;
    const lid = appendOptimistic({ event_type: "timer_resumed", target_ref: String(stepIndex), payload: null, created_at: nowIso() });
    try { commit(lid, await resumeTimerAction(session.id, stepIndex)); } catch { /* */ }
  }, [session, appendOptimistic, commit]);

  // 3e mid-cook edits — proposals, captured as events (require a session; edits happen during a cook).
  const adjustEstimate = useCallback(async (i, seconds) => {
    if (!session) return;
    const lid = appendOptimistic({ event_type: "estimate_adjusted", target_ref: String(i), payload: { seconds }, created_at: nowIso() });
    try { commit(lid, await adjustEstimateAction(session.id, i, seconds)); } catch { /* */ }
  }, [session, appendOptimistic, commit]);
  const adjustTimer = useCallback(async (i, delta) => {
    if (!session) return;
    const lid = appendOptimistic({ event_type: "timer_adjusted", target_ref: String(i), payload: { delta }, created_at: nowIso() });
    try { commit(lid, await adjustTimerAction(session.id, i, delta)); } catch { /* */ }
  }, [session, appendOptimistic, commit]);
  const changeAmount = useCallback(async (i, amount, unit, grams) => {
    if (!session) return;
    const lid = appendOptimistic({ event_type: "amount_changed", target_ref: String(i), payload: { amount, unit, grams }, created_at: nowIso() });
    try { commit(lid, await changeAmountAction(session.id, i, amount, unit, grams)); } catch { /* */ }
  }, [session, appendOptimistic, commit]);
  const omitIngredient = useCallback(async (i) => {
    if (!session) return;
    const lid = appendOptimistic({ event_type: "ingredient_omitted", target_ref: String(i), payload: null, created_at: nowIso() });
    try { commit(lid, await omitIngredientAction(session.id, i)); } catch { /* */ }
  }, [session, appendOptimistic, commit]);

  const finish = useCallback(async () => {
    if (!session) return;
    appendOptimistic({ event_type: "finished", target_ref: null, payload: null, created_at: nowIso() });
    try { await finishSession(session.id); } catch { /* */ }
  }, [session, appendOptimistic]);

  // 3e: ABANDON — silent discard. Marks the session abandoned; nothing is saved to the recipe.
  const abandon = useCallback(async () => {
    if (!session) return;
    try { await abandonSession(session.id); } catch { /* */ }
    setSession(null); setEvents([]);
  }, [session]);

  return {
    session,
    ready,
    state,               // { stepStates, tickedIngredients, usedIngredients, timers, finished, liveStates, liveTimers }
    hasSession: !!session,
    serveAt,             // ISO string | null (3c-i)
    setServeTime,
    markStep,            // BRIDGE (mobile)
    tickIngredient,
    useIngredient,
    startTimer,
    stopTimer,
    resumeTimer,
    adjustEstimate,
    adjustTimer,
    changeAmount,
    omitIngredient,
    finish,
    abandon,
  };
}
