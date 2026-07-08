import { createContext, useContext, useEffect, useState } from "react";
import { fetchAnyActiveSession, finishSession } from "./cookEventStore";

// CookSessionProvider — the global active-cook context. Hosts a single question: "is there
// an active cook session right now?" Now reads from the event-sourced engine (cookEventStore)
// instead of the old cookSession.js. The header marker and popover read from this context.
// Re-fetches on 'lifeos:cook-session-change' (fired by the engine on session create/finish).

const Ctx = createContext(null);
export function useCookSessionCtx() { return useContext(Ctx); }

export function CookSessionProvider({ children }) {
  const [session, setSession] = useState(null);

  const load = () => {
    fetchAnyActiveSession().then((s) => setSession(s)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("lifeos:cook-session-change", handler);
    return () => window.removeEventListener("lifeos:cook-session-change", handler);
  }, []);

  // Finish via the event-sourced engine (inserts 'finished' event + status='done')
  const finish = async () => {
    if (!session) return;
    await finishSession(session.id);
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
