// LifeOS — Food → the COOK PLAN page (3a dormant · 3b live · 3c-i deadlines/float/serve). One page:
// the whole plan, always visible, in SCHEDULED order. Each step has its own timer (the cook begins
// on the first start), a latest-start deadline as a clock time, its float ("sets the clock" when
// zero), a blocked-by line while waiting, and a serve-time anchor drives it all. The scheduler is
// pure compute-on-read (cookSchedule + cookDeadlines); nothing here is stored beyond target_serve_at.

import { useEffect, useRef, useState } from "react";
import { fetchRecipe } from "../../../spine/data/recipeLoad";
import { cookSchedule } from "../../../spine/logic/cookSchedule";
import { anchorPlan, deadlineUrgency } from "../../../spine/logic/cookDeadlines";
import { fmtDur, fmtClockTime } from "../../../spine/logic/cookPlanView";
import { useCookEvents } from "../../../spine/data/useCookEvents";
import { useWakeLock } from "../../../spine/data/useWakeLock";
import { initAudioContext, startAlarm, stopAlarm } from "../../../spine/logic/cookAlarm";
import CookBand from "./CookBand";
import CookPlanStep from "./CookPlanStep";
import CookIngredients from "./CookIngredients";
import "../cookPlan.css";

const driftText = (serve) => {
  if (!serve) return null;
  if (serve.state === "on_time") return "on time";
  const m = Math.round(Math.abs(serve.driftSec) / 60);
  return serve.state === "late" ? `${m} min late` : `${m} min early`;
};

export default function CookPlan({ recipeId, onBack }) {
  const [data, setData] = useState(null);
  const [cookServings, setCookServings] = useState(null);
  const cook = useCookEvents(recipeId);
  useWakeLock(cook.hasSession);

  const alarmedRef = useRef(new Set());
  const prevRemRef = useRef({});

  useEffect(() => {
    let alive = true;
    setData(null); setCookServings(null);
    fetchRecipe(recipeId).then((r) => {
      if (!alive) return;
      setData(r);
      setCookServings(r.recipe.default_servings ?? r.recipe.servings ?? 1);
    }).catch(() => {});
    return () => { alive = false; };
  }, [recipeId]);

  // Alarm once when a running timer crosses zero (see 3b). No overlay, no notification.
  useEffect(() => {
    for (const t of cook.state?.liveTimers || []) {
      const prev = prevRemRef.current[t.targetRef];
      if (t.running && prev != null && prev > 0 && t.remaining <= 0 && !alarmedRef.current.has(t.targetRef)) {
        alarmedRef.current.add(t.targetRef); startAlarm(); window.setTimeout(() => stopAlarm(), 4000);
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

  const { schedule, finish, workSeconds } = cookSchedule(steps.map((s) => ({ durationSeconds: s.timer_seconds || 0, deps: s.depends_on, hold: s.hold_tolerance })));
  // 3c-i: read in SCHEDULED-START order (the plan reorders work) — the 3a position stopgap is gone.
  const order = steps.map((_, i) => i).sort((a, b) => (schedule[a].effectiveStart - schedule[b].effectiveStart) || (a - b));
  const linkedFor = (i) => ingredients.map((ing, idx) => ({ ing, idx })).filter(({ ing }) => ing.step_position === i);
  const timerByRef = {};
  for (const t of cook.state.liveTimers) timerByRef[t.targetRef] = t;
  const stateOf = (i) => cook.state.liveStates[String(i)] || "waiting";

  // Anchor the schedule to the clock: serve time (backward) → cook start → now.
  const nowMs = Date.now();
  const serveAtMs = cook.serveAt ? new Date(cook.serveAt).getTime() : null;
  const cookStartMs = cook.session ? new Date(cook.session.started_at || cook.session.created_at).getTime() : null;
  const anchor = anchorPlan({ schedule, finish, serveAtMs, cookStartMs, nowMs });

  const blockedFor = (i) => {
    const preds = (steps[i].depends_on || []).filter((p) => stateOf(p) !== "done");
    if (timerByRef[String(i)] || preds.length === 0) return null; // started, or nothing pending
    const freesUpMs = Math.max(...preds.map((p) => {
      const t = timerByRef[String(p)];
      return t && t.running ? nowMs + Math.max(0, t.remaining) * 1000 : anchor.endClockMs[p];
    }));
    return { nums: preds.map((p) => p + 1), freesUp: fmtClockTime(freesUpMs) };
  };

  const serveVal = cook.serveAt ? fmtClockTime(serveAtMs) : "";
  const onServe = (v) => {
    if (!v) return;
    const [hh, mm] = v.split(":").map(Number);
    const d = new Date(); d.setHours(hh, mm, 0, 0);
    cook.setServeTime(d.toISOString());
  };

  return (
    <div className="cp">
      <div className="cp-mast">
        <button type="button" className="cp-back" onClick={onBack}>‹ Cookbook</button>
        <div className="cp-mast-main">
          <h1 className="cp-title">{recipe.title}</h1>
          <div className="cp-mast-meta">
            {recipe.cuisine && <span className="cp-cuisine">{recipe.cuisine}</span>}
            <span className="cp-total tnum">runs {fmtDur(finish)}</span>
            <span className="cp-total cp-total--work tnum">{fmtDur(workSeconds)} of work</span>
            {cook.hasSession && <span className="cp-cooking">Cooking</span>}
          </div>
          <div className="cp-serve">
            <label className="cp-serve-label">Serve at</label>
            <input type="time" className="cp-serve-input tnum" value={serveVal} onChange={(e) => onServe(e.target.value)} />
            {anchor.serve && <span className={`cp-serve-read cp-serve-read--${anchor.serve.state}`}>{driftText(anchor.serve)}</span>}
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
        {order.map((i) => {
          const started = !!timerByRef[String(i)];
          return (
            <CookPlanStep
              key={i} n={i + 1} step={steps[i]} linked={linkedFor(i)} scale={scale}
              timer={timerByRef[String(i)]} liveState={stateOf(i)} usedSet={cook.state.usedIngredients}
              critical={schedule[i].critical} floatMin={Math.round(schedule[i].float / 60)}
              deadline={!started ? fmtClockTime(anchor.deadlineMs[i]) : null}
              urgency={!started ? deadlineUrgency(anchor.deadlineMs[i], nowMs) : null}
              blocked={blockedFor(i)}
              onStart={() => { initAudioContext(); cook.startTimer(i, steps[i].timer_seconds); }}
              onStop={() => cook.stopTimer(i)}
              onResume={() => cook.resumeTimer(i)}
              onTick={(idx) => cook.useIngredient(idx)}
            />
          );
        })}
      </ol>

      <CookIngredients ingredients={ingredients} scale={scale} />
    </div>
  );
}
