import { useEffect, useState } from "react";
import { fetchAnyActiveSession } from "./cookEventStore";

// ResumeCookBanner — a calm one-line bar above the Food tabs when there is an ACTIVE
// cook_session (across any recipe). Tap → resume. Now reads from the event-sourced engine
// (cookEventStore) instead of the old cookSession.js. Read-only — no writes.
export default function ResumeCookBanner({ onResume, refreshKey }) {
  const [session, setSession] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchAnyActiveSession().then((s) => { if (alive) setSession(s); }).catch(() => { if (alive) setSession(null); });
    return () => { alive = false; };
  }, [refreshKey]);

  // Re-fetch on session changes (the event-sourced engine fires this on create/finish)
  useEffect(() => {
    const handler = () => {
      fetchAnyActiveSession().then(setSession).catch(() => setSession(null));
    };
    window.addEventListener("lifeos:cook-session-change", handler);
    return () => window.removeEventListener("lifeos:cook-session-change", handler);
  }, []);

  if (!session) return null;
  const title = session.recipes?.title || "a recipe";
  return (
    <button type="button" className="rcb" onClick={() => onResume(session.recipe_id)}>
      <span className="rcb-dot" aria-hidden="true">●</span>
      <span className="rcb-text">Cook in progress — <strong>{title}</strong></span>
      <span className="rcb-go">Resume ›</span>
    </button>
  );
}
