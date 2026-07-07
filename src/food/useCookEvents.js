// useCookEvents — the React hook for the event-sourced cook. Loads an active session's
// events, replays them into derived state, provides action dispatchers that INSERT events
// and optimistically append to the local list. A 1-second tick updates timer remaining.
// Resume is FREE: on mount, fetch events + replay = identical to a fresh render.

import { useCallback, useEffect, useRef, useState } from "react";
import { replayCookEvents } from "./cookReplay.js";
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
} from "./cookEventStore.js";

export function useCookEvents(recipeId) {
  const [session, setSession] = useState(null);  // the session header row (or null)
  const [events, setEvents] = useState([]);       // cook_event rows, ordered by created_at
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);

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

  // Optimistic append: add event to local list immediately, then persist
  const appendEvent = useCallback((evt) => {
    setEvents((cur) => [...cur, evt]);
  }, []);

  // Lazy-start: create a session on first action if none exists
  const ensureSession = useCallback(async () => {
    if (session) return session.id;
    const s = await startSession(recipeId);
    setSession(s);
    return s.id;
  }, [session, recipeId]);

  // ── Action dispatchers ──────────────────────────────────────────────────────

  const markStep = useCallback(async (stepIndex, newStatus) => {
    const sid = await ensureSession();
    const optimistic = { event_type: "step_marked", target_ref: String(stepIndex), payload: { status: newStatus }, created_at: new Date().toISOString() };
    appendEvent(optimistic);
    try { await markStepAction(sid, stepIndex, newStatus); }
    catch { /* optimistic stays; reload reveals truth */ }
  }, [ensureSession, appendEvent]);

  const tickIngredient = useCallback(async (ingredientRef) => {
    const sid = await ensureSession();
    const optimistic = { event_type: "ingredient_ticked", target_ref: String(ingredientRef), payload: null, created_at: new Date().toISOString() };
    appendEvent(optimistic);
    try { await tickAction(sid, ingredientRef); }
    catch { /* optimistic stays */ }
  }, [ensureSession, appendEvent]);

  const useIngredient = useCallback(async (ingredientRef) => {
    const sid = await ensureSession();
    const optimistic = { event_type: "ingredient_used", target_ref: String(ingredientRef), payload: null, created_at: new Date().toISOString() };
    appendEvent(optimistic);
    try { await useAction(sid, ingredientRef); }
    catch { /* optimistic stays */ }
  }, [ensureSession, appendEvent]);

  const startTimer = useCallback(async (stepIndex, durationSeconds) => {
    const sid = await ensureSession();
    const optimistic = { event_type: "timer_started", target_ref: String(stepIndex), payload: { duration_seconds: durationSeconds }, created_at: new Date().toISOString() };
    appendEvent(optimistic);
    try { await startTimerAction(sid, stepIndex, durationSeconds); }
    catch { /* optimistic stays */ }
  }, [ensureSession, appendEvent]);

  const stopTimer = useCallback(async (stepIndex) => {
    if (!session) return;
    const optimistic = { event_type: "timer_stopped", target_ref: String(stepIndex), payload: null, created_at: new Date().toISOString() };
    appendEvent(optimistic);
    try { await stopTimerAction(session.id, stepIndex); }
    catch { /* optimistic stays */ }
  }, [session, appendEvent]);

  const finish = useCallback(async () => {
    if (!session) return;
    const optimistic = { event_type: "finished", target_ref: null, payload: null, created_at: new Date().toISOString() };
    appendEvent(optimistic);
    try { await finishSession(session.id); }
    catch { /* optimistic stays */ }
  }, [session, appendEvent]);

  return {
    session,
    ready,
    state,               // { stepStates, tickedIngredients, usedIngredients, timers, finished }
    hasSession: !!session,
    markStep,
    tickIngredient,
    useIngredient,
    startTimer,
    stopTimer,
    finish,
  };
}
