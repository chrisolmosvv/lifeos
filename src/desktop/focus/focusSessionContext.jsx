import { createContext, useContext } from "react";
import { useFocusSession } from "./useFocusSession.js";

// FocusSessionProvider — hosts the ONE running-session engine at app level (piece 5),
// so the header live-marker, the global save-card overlay, and the ▶ block-nudge all
// read the same state as the Focus pillar. Previously useFocusSession lived inside
// FocusPage (fine for pieces 2–4); lifting it here lets the marker ride every screen
// and Stop overlay any screen, and keeps the timer continuous across pillar nav.

const Ctx = createContext(null);
export function useFocusSessionCtx() { return useContext(Ctx); }

export function FocusSessionProvider({ children }) {
  const fs = useFocusSession();
  return <Ctx.Provider value={fs}>{children}</Ctx.Provider>;
}
