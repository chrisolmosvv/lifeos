import { useEffect, useRef, useState } from "react";
import { fetchActiveSession, saveSession } from "./cookSession";

// useCookSession (V2 P7) — load + persist the resume-a-cook session STATE for a recipe: struck steps,
// ticked ingredients, timer END-timestamps (absolute, so a countdown survives reload), board states,
// status/dismissed. Hydrates on mount (a reload restores exactly where you were); writes are optimistic
// + DEBOUNCED. The SCHEDULE is never stored — only this state persists (compute-on-read holds).
const EMPTY = { struck: [], ticked: [], timers: [], board: {}, status: "active", dismissed: false };

export function useCookSession(recipeId) {
  const [state, setState] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const idRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    let alive = true;
    setReady(false);
    idRef.current = null;
    fetchActiveSession(recipeId)
      .then((row) => {
        if (!alive) return;
        if (row) {
          idRef.current = row.id;
          setState({ struck: row.struck_steps || [], ticked: row.ticked_ingredients || [], timers: row.timer_ends || [], board: row.board_states || {}, status: row.status, dismissed: row.dismissed });
        } else setState(EMPTY);
        setReady(true);
      })
      .catch(() => { if (alive) { setState(EMPTY); setReady(true); } });
    return () => { alive = false; clearTimeout(timer.current); };
  }, [recipeId]);

  // Optimistic local change + a debounced upsert of the whole session state.
  const update = (patch) => {
    setState((cur) => {
      const next = { ...cur, ...patch };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        saveSession(idRef.current, { recipe_id: recipeId, struck_steps: next.struck, ticked_ingredients: next.ticked, timer_ends: next.timers, board_states: next.board, status: next.status, dismissed: next.dismissed })
          .then((id) => { idRef.current = id; })
          .catch(() => { /* reload reveals the truth */ });
      }, 500);
      return next;
    });
  };

  return { state, ready, update };
}
