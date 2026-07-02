import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchSessions } from "./focusLoad.js";
import { taskTotals } from "./focusCalc.js";

// FocusTotalsProvider — supplies the all-time per-task focus totals (Map<taskId,
// seconds>) to any task row, WITHOUT threading props through Today / Planning. Wrapped
// once around the logged-in app. Refetches when focus data changes (the
// 'lifeos:focus-changed' signal from focusWrite), so a saved/deleted session updates
// the row tags live. A row reads it via useFocusTotals(); with no provider it's null
// (→ no tag), so any caller stays byte-for-byte unless wrapped.

const Ctx = createContext(null);
export function useFocusTotals() { return useContext(Ctx); }

// Wide enough to be "all-time" in practice for a single user's tracker.
const WINDOW_DAYS = 2000;

export function FocusTotalsProvider({ children }) {
  const [map, setMap] = useState(null);

  const load = useCallback(async () => {
    try {
      const t = Date.now();
      const rows = await fetchSessions(
        new Date(t - WINDOW_DAYS * 86400000).toISOString(),
        new Date(t + 86400000).toISOString(),
      );
      setMap(taskTotals(rows));
    } catch {
      /* leave the last-known totals; the tag is a nicety, never a blocker */
    }
  }, []);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("lifeos:focus-changed", h);
    return () => window.removeEventListener("lifeos:focus-changed", h);
  }, [load]);

  return <Ctx.Provider value={map}>{children}</Ctx.Provider>;
}
