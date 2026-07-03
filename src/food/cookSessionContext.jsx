import { createContext, useContext, useEffect, useState } from "react";
import { fetchAnyActiveSession, saveSession } from "./cookSession";

// CookSessionProvider — the global active-cook context (mirrors focusSessionContext for Focus).
// Hosts a single question: "is there an active cook session right now?" Fetches on mount and
// re-fetches on the 'lifeos:cook-session-change' event (fired by useCookSession on session
// creation and on status='done'). The header marker and popover read from this context.

const Ctx = createContext(null);
export function useCookSessionCtx() { return useContext(Ctx); }

export function CookSessionProvider({ children }) {
  const [session, setSession] = useState(null);

  const load = () => {
    fetchAnyActiveSession().then((s) => setSession(s)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  // Re-fetch when useCookSession signals a session was created or finished.
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("lifeos:cook-session-change", handler);
    return () => window.removeEventListener("lifeos:cook-session-change", handler);
  }, []);

  const finish = async () => {
    if (!session) return;
    await saveSession(session.id, { status: "done" });
    setSession(null);
  };

  const value = session
    ? {
        active: true,
        sessionId: session.id,
        recipeId: session.recipe_id,
        title: session.recipes?.title || "a recipe",
        startedAt: session.created_at,
        finish,
      }
    : { active: false, finish: () => {} };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
