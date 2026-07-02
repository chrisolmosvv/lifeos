import { useEffect, useState } from "react";
import { fetchAnyActiveSession } from "./cookSession";

// ResumeCookBanner (session-surfacing B) — a calm one-line bar above the Food tabs when there is an
// ACTIVE, non-dismissed cook_session (across any recipe). Tap → back into that cook via the EXISTING
// deep-link (openRecipe(recipe_id, cook=true) → RecipePage auto-enters cook). NO active session →
// renders nothing (the graceful gone-cook path: a deleted recipe / dismissed session just yields null).
// Dismissable-by-entering — opening the cook is the dismissal; finishing it flips status to 'done'
// (then it's the done-card's job, not this banner's). refreshKey re-checks when the Food tab changes.
export default function ResumeCookBanner({ onResume, refreshKey }) {
  const [session, setSession] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchAnyActiveSession().then((s) => { if (alive) setSession(s); }).catch(() => { if (alive) setSession(null); });
    return () => { alive = false; };
  }, [refreshKey]);

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
