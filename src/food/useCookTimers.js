import { useCallback, useEffect, useRef, useState } from "react";
import { initAudioContext } from "./cookAlarm";

// useCookTimers — manages live timer state for the Cook Companion.
// Step 3 bridge: local state with a 1-second tick. In step 4 this is
// replaced by the full event-sourced useCookEvents.
//
// Each timer: { startedAt: ms, durationSeconds: number }
// Remaining = durationSeconds - (now - startedAt) / 1000
// A timer is "done" when remaining <= 0 and not dismissed (= alarm fires).

export function useCookTimers() {
  const [timers, setTimers] = useState({});   // stepIndex → { startedAt, durationSeconds }
  const [dismissed, setDismissed] = useState(new Set()); // stepIndices whose alarm was dismissed
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);

  // 1-second tick
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Derive remaining for each timer
  const liveTimers = {};
  for (const [idx, t] of Object.entries(timers)) {
    const elapsed = (now - t.startedAt) / 1000;
    const remaining = Math.max(0, Math.round(t.durationSeconds - elapsed));
    liveTimers[idx] = { ...t, remaining, done: remaining <= 0 };
  }

  // The first timer that hit zero and hasn't been dismissed = alarm
  const alarmIdx = Object.keys(liveTimers).find(
    (idx) => liveTimers[idx].done && !dismissed.has(idx)
  );

  const startTimer = useCallback((stepIndex, durationSeconds) => {
    initAudioContext(); // satisfy autoplay policy on user gesture
    setTimers((t) => ({ ...t, [stepIndex]: { startedAt: Date.now(), durationSeconds } }));
    setDismissed((s) => { const n = new Set(s); n.delete(String(stepIndex)); return n; });
  }, []);

  // ±N seconds: re-start with the adjusted remaining as the new duration (Option A)
  const adjustTimer = useCallback((stepIndex, deltaSec) => {
    setTimers((t) => {
      const cur = t[stepIndex];
      if (!cur) return t;
      const elapsed = (Date.now() - cur.startedAt) / 1000;
      const curRemaining = Math.max(0, cur.durationSeconds - elapsed);
      const newDur = Math.max(1, curRemaining + deltaSec);
      return { ...t, [stepIndex]: { startedAt: Date.now(), durationSeconds: newDur } };
    });
  }, []);

  const dismissTimer = useCallback((stepIndex) => {
    setDismissed((s) => { const n = new Set(s); n.add(String(stepIndex)); return n; });
  }, []);

  const stopTimer = useCallback((stepIndex) => {
    setTimers((t) => { const n = { ...t }; delete n[stepIndex]; return n; });
    setDismissed((s) => { const n = new Set(s); n.add(String(stepIndex)); return n; });
  }, []);

  return { liveTimers, alarmIdx, startTimer, adjustTimer, dismissTimer, stopTimer };
}
