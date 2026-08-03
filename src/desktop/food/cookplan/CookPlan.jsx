// LifeOS — Food → the COOK PLAN page (Piece 3a). One page, DORMANT. Opening a recipe shows the
// whole plan: every step with full text, duration (not counting down), station colour, tag and its
// ingredients; a to-scale band; a servings stepper; a collapsible ingredient panel. Nothing here
// is live — no timers run, there is no start button. Live behaviour arrives in 3b.
//
// Reads the recipe via fetchRecipe (unchanged) and computes the schedule via cookSchedule
// (unchanged). No sessions, no events — the header's live-cook marker is untouched.

import { useEffect, useState } from "react";
import { fetchRecipe } from "../../../spine/data/recipeLoad";
import { cookSchedule } from "../../../spine/logic/cookSchedule";
import { fmtDur } from "../../../spine/logic/cookPlanView";
import CookBand from "./CookBand";
import CookPlanStep from "./CookPlanStep";
import CookIngredients from "./CookIngredients";
import "../cookPlan.css";

export default function CookPlan({ recipeId, onBack }) {
  const [data, setData] = useState(null);
  const [cookServings, setCookServings] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setCookServings(null);
    fetchRecipe(recipeId)
      .then((r) => {
        if (!alive) return;
        setData(r);
        // Stepper starts at default_servings where set, else the recipe's servings (see 3a flag:
        // default_servings is not yet loaded, so this falls back to servings today).
        setCookServings(r.recipe.default_servings ?? r.recipe.servings ?? 1);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [recipeId]);

  if (!data || cookServings == null) {
    return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;
  }

  const { recipe, ingredients, steps } = data;
  const baseServ = recipe.servings || 1;          // amounts were stored for this many servings
  const scale = cookServings / baseServ;

  const { schedule, finish } = cookSchedule(steps.map((s) => ({ durationSeconds: s.timer_seconds || 0, deps: s.depends_on })));
  // ⚠️ STOPGAP (3a) — MUST be reversed in 3c. Reading order SHOULD be by scheduled start. The plan
  // deliberately reorders work (prep slotted in, hands-free overlapped, just-in-time pushed late),
  // so `position` is the SOURCE's order, NOT the plan's — it only looks right today because a
  // simple recipe's plan happens to match its source order. We hold on position because
  // cookSchedule currently returns LATEST (just-in-time) starts, which scramble a reading list.
  // When 3c exposes earliest/scheduled start, RESTORE sort-by-scheduled-start here.
  const order = steps.map((_, i) => i);
  // ⚠️ STOPGAP (3a) — MUST be reversed in 3c. "Total time" is shown as the SUM of step durations =
  // "total work", NOT "how long the cook takes" (the design specifies BOTH). Once hands-free steps
  // genuinely overlap, a sum OVERSTATES the cook; cookSchedule.finish is the real critical-path
  // wall-clock but can't be trusted until depends_on is fixed and the scheduler is real. Restore in 3c.
  const sumSecs = steps.reduce((t, s) => t + (Number(s.timer_seconds) || 0), 0);
  const totalTime = fmtDur(sumSecs) || fmtDur(((recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)) * 60);
  const linkedFor = (i) => ingredients.map((ing, idx) => ({ ing, idx })).filter(({ ing }) => ing.step_position === i);

  return (
    <div className="cp">
      <div className="cp-mast">
        <button type="button" className="cp-back" onClick={onBack}>‹ Cookbook</button>
        <div className="cp-mast-main">
          <h1 className="cp-title">{recipe.title}</h1>
          <div className="cp-mast-meta">
            {recipe.cuisine && <span className="cp-cuisine">{recipe.cuisine}</span>}
            {totalTime && <span className="cp-total tnum">{totalTime}</span>}
          </div>
        </div>
        <div className="cp-serv">
          <button type="button" className="cp-serv-btn" onClick={() => setCookServings((s) => Math.max(1, s - 1))} aria-label="Fewer servings">−</button>
          <span className="cp-serv-val tnum">{cookServings}</span>
          <button type="button" className="cp-serv-btn" onClick={() => setCookServings((s) => s + 1)} aria-label="More servings">+</button>
          <span className="cp-serv-label">serving{cookServings === 1 ? "" : "s"}{cookServings !== baseServ ? ` · from ${baseServ}` : ""}</span>
        </div>
      </div>

      <CookBand steps={steps} schedule={schedule} finish={finish} />

      <ol className="cp-plan">
        {order.map((i) => (
          <CookPlanStep key={i} n={i + 1} step={steps[i]} linked={linkedFor(i)} scale={scale} />
        ))}
      </ol>

      <CookIngredients ingredients={ingredients} scale={scale} />
    </div>
  );
}
