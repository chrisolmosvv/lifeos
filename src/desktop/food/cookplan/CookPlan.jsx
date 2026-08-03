// LifeOS — Food → the COOK PLAN page (Piece 3a dormant → 3b LIVE). One page: the whole plan is
// always visible; each step has its own timer. The cook BEGINS on the first timer start (no global
// start button, no "mark done"). Timers count DOWN then UP past zero; stopping then starting again
// RESUMES from where it left off. Step state is derived from the timers alone.
//
// Reads the recipe via fetchRecipe and the cook via useCookEvents (both unchanged in shape). The
// header's live-cook marker keeps working — startTimer creates the session, which fires the event
// cookSessionContext listens for. The alarm is a brief per-step cue (cookAlarm, kept as-is); there
// is NO full-screen overlay.

import { useEffect, useRef, useState } from "react";
import { fetchRecipe } from "../../../spine/data/recipeLoad";
import { cookSchedule } from "../../../spine/logic/cookSchedule";
import { fmtDur } from "../../../spine/logic/cookPlanView";
import { useCookEvents } from "../../../spine/data/useCookEvents";
import { useWakeLock } from "../../../spine/data/useWakeLock";
import { initAudioContext, startAlarm, stopAlarm } from "../../../spine/logic/cookAlarm";
import CookBand from "./CookBand";
import CookPlanStep from "./CookPlanStep";
import CookIngredients from "./CookIngredients";
import "../cookPlan.css";

export default function CookPlan({ recipeId, onBack }) {
  const [data, setData] = useState(null);
  const [cookServings, setCookServings] = useState(null);
  const cook = useCookEvents(recipeId);
  useWakeLock(cook.hasSession);

  const alarmedRef = useRef(new Set()); // refs that have already alarmed (fire once per crossing)
  const prevRemRef = useRef({});         // last tick's remaining per ref, to detect the zero-crossing

  useEffect(() => {
    let alive = true;
    setData(null);
    setCookServings(null);
    fetchRecipe(recipeId)
      .then((r) => {
        if (!alive) return;
        setData(r);
        setCookServings(r.recipe.default_servings ?? r.recipe.servings ?? 1); // 3a flag: default_servings not loaded → falls back to servings
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [recipeId]);

  // Fire the alarm ONCE when a running timer crosses from >0 to <=0. A timer already past zero on
  // load (prev undefined) does NOT re-alarm; a timer that climbs back above zero re-arms.
  useEffect(() => {
    for (const t of cook.state?.liveTimers || []) {
      const prev = prevRemRef.current[t.targetRef];
      if (t.running && prev != null && prev > 0 && t.remaining <= 0 && !alarmedRef.current.has(t.targetRef)) {
        alarmedRef.current.add(t.targetRef);
        startAlarm();
        window.setTimeout(() => stopAlarm(), 4000); // a brief cue, not a persistent loop or overlay
      }
      if (t.remaining > 0) alarmedRef.current.delete(t.targetRef);
      prevRemRef.current[t.targetRef] = t.remaining;
    }
  });

  if (!data || cookServings == null || !cook.ready) {
    return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;
  }

  const { recipe, ingredients, steps } = data;
  const baseServ = recipe.servings || 1;
  const scale = cookServings / baseServ;

  const { schedule, finish } = cookSchedule(steps.map((s) => ({ durationSeconds: s.timer_seconds || 0, deps: s.depends_on })));
  // ⚠️ STOPGAP (3a) — reversed in 3c: read in source position order, not scheduled start. See CookPlan history.
  const order = steps.map((_, i) => i);
  // ⚠️ STOPGAP (3a) — reversed in 3c: total = sum of durations, not wall-clock.
  const sumSecs = steps.reduce((t, s) => t + (Number(s.timer_seconds) || 0), 0);
  const totalTime = fmtDur(sumSecs) || fmtDur(((recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)) * 60);
  const linkedFor = (i) => ingredients.map((ing, idx) => ({ ing, idx })).filter(({ ing }) => ing.step_position === i);

  const timerByRef = {};
  for (const t of cook.state.liveTimers) timerByRef[t.targetRef] = t;

  return (
    <div className="cp">
      <div className="cp-mast">
        <button type="button" className="cp-back" onClick={onBack}>‹ Cookbook</button>
        <div className="cp-mast-main">
          <h1 className="cp-title">{recipe.title}</h1>
          <div className="cp-mast-meta">
            {recipe.cuisine && <span className="cp-cuisine">{recipe.cuisine}</span>}
            {totalTime && <span className="cp-total tnum">{totalTime}</span>}
            {cook.hasSession && <span className="cp-cooking">Cooking</span>}
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
          <CookPlanStep
            key={i} n={i + 1} step={steps[i]} linked={linkedFor(i)} scale={scale}
            timer={timerByRef[String(i)]} liveState={cook.state.liveStates[String(i)] || "waiting"}
            usedSet={cook.state.usedIngredients}
            onStart={() => { initAudioContext(); cook.startTimer(i, steps[i].timer_seconds); }}
            onStop={() => cook.stopTimer(i)}
            onResume={() => cook.resumeTimer(i)}
            onTick={(idx) => cook.useIngredient(idx)}
          />
        ))}
      </ol>

      <CookIngredients ingredients={ingredients} scale={scale} />
    </div>
  );
}
