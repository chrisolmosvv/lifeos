import { useCallback, useEffect, useState } from "react";
import { fetchSessions } from "./focusLoad.js";
import { dayFocusTotal } from "./focusCalc.js";
import { amsTodayYMD } from "../gym/gymDates.js";

// useTodayFocus — today's total focus seconds, for the quiet Today glance line (spec
// §13.3). Reuses the piece-1 getter; refreshes on the focus-changed signal so it stays
// current after a session is saved elsewhere. Read-only; 0 while nothing's logged.
export function useTodayFocus() {
  const [seconds, setSeconds] = useState(0);

  const load = useCallback(async () => {
    try {
      const t = Date.now();
      const rows = await fetchSessions(
        new Date(t - 2 * 86400000).toISOString(),
        new Date(t + 86400000).toISOString(),
      );
      setSeconds(dayFocusTotal(rows, amsTodayYMD()));
    } catch {
      /* the glance line is a nicety — never block Today on it */
    }
  }, []);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("lifeos:focus-changed", h);
    return () => window.removeEventListener("lifeos:focus-changed", h);
  }, [load]);

  return seconds;
}
