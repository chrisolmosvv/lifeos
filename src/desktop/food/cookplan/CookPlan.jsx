// LifeOS — Food → the COOK PLAN page (mock Q, 3d). Composes the five zones — masthead · band ·
// on-now · board · foot — over the live cook (3b), the resource-aware schedule (3c) and the serve
// anchor. Fit-to-hole scales the board to fill the page; only the board scrolls. The serve readout
// is LIVE: it re-times the schedule around what has actually happened. Renders what the scheduler
// and replay produce — it changes neither.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchRecipe } from "../../../spine/data/recipeLoad";
import { cookSchedule } from "../../../spine/logic/cookSchedule";
import { anchorPlan } from "../../../spine/logic/cookDeadlines";
import { recipeMacros } from "../../../spine/logic/recipeCalc";
import { fmtDur, fmtClockTime, startByLabel } from "../../../spine/logic/cookPlanView";
import { useCookEvents } from "../../../spine/data/useCookEvents";
import { useWakeLock } from "../../../spine/data/useWakeLock";
import { initAudioContext, startAlarm, stopAlarm } from "../../../spine/logic/cookAlarm";
import { useFitToHole } from "./useFitToHole";
import CookMasthead from "./CookMasthead";
import CookBand from "./CookBand";
import CookOnNow from "./CookOnNow";
import CookBoard from "./CookBoard";
import CookFoot from "./CookFoot";
import CookIngredients from "./CookIngredients";
import "../cookPlan.css";

const elapsedStr = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 3600) ? Math.floor(s / 3600) + "h " : ""}${Math.floor((s % 3600) / 60)}m`; };

export default function CookPlan({ recipeId, onBack }) {
  const [data, setData] = useState(null);
  const [cookServings, setCookServings] = useState(null);
  const [est, setEst] = useState({});          // index → overridden duration (seconds), session-local
  const [showIngs, setShowIngs] = useState(false);
  const cook = useCookEvents(recipeId);
  useWakeLock(cook.hasSession);

  const alarmedRef = useRef(new Set());
  const prevRemRef = useRef({});
  const boardScrollRef = useRef(null);
  const boardContentRef = useRef(null);

  // The ancestor chain (.food-page/.food-pane) isn't full-height, so give .cpq a MEASURED height
  // (viewport bottom − its own top). This bounds the board so it scrolls internally and fit-to-hole
  // has a real hole to fill — without touching the shared food containers.
  const cpqRef = useRef(null);
  const [pageH, setPageH] = useState(null);
  const measure = useCallback(() => { const el = cpqRef.current; if (el) setPageH(window.innerHeight - el.getBoundingClientRect().top); }, []);
  const setCpq = useCallback((el) => { cpqRef.current = el; measure(); }, [measure]);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [measure]);

  useEffect(() => {
    let alive = true; setData(null); setCookServings(null); setEst({});
    fetchRecipe(recipeId).then((r) => { if (!alive) return; setData(r); setCookServings(r.recipe.default_servings ?? r.recipe.servings ?? 1); }).catch(() => {});
    return () => { alive = false; };
  }, [recipeId]);

  useEffect(() => { // alarm once on a zero-crossing (3b)
    for (const t of cook.state?.liveTimers || []) {
      const prev = prevRemRef.current[t.targetRef];
      if (t.running && prev != null && prev > 0 && t.remaining <= 0 && !alarmedRef.current.has(t.targetRef)) { alarmedRef.current.add(t.targetRef); startAlarm(); window.setTimeout(() => stopAlarm(), 4000); }
      if (t.remaining > 0) alarmedRef.current.delete(t.targetRef);
      prevRemRef.current[t.targetRef] = t.remaining;
    }
  });

  const steps = data?.steps || [];
  const durOf = (i) => est[i] ?? (steps[i]?.timer_seconds || 0);
  const base = useMemo(() => cookSchedule(steps.map((s, i) => ({ durationSeconds: durOf(i), deps: s.depends_on, hold: s.hold_tolerance, tag: s.tag }))), [data, est]); // eslint-disable-line react-hooks/exhaustive-deps

  const fitSig = `${recipeId}:${cookServings}:${steps.length}:${Object.keys(est).length}`;
  const fit = useFitToHole(boardScrollRef, boardContentRef, fitSig);

  useEffect(() => { // keyboard − / + sizing (ignore while typing in an input)
    const h = (e) => { if (e.target.tagName === "INPUT") return; if (e.key === "-") fit.dec(); else if (e.key === "+" || e.key === "=") fit.inc(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [fit]);

  if (!data || cookServings == null || !cook.ready) {
    return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;
  }

  const { recipe, ingredients } = data;
  const { schedule, finish } = base;
  const timerByRef = {}; for (const t of cook.state.liveTimers) timerByRef[t.targetRef] = t;
  const stateOf = (i) => cook.state.liveStates[String(i)] || "waiting";
  const order = steps.map((_, i) => i).sort((a, b) => (schedule[a].effectiveStart - schedule[b].effectiveStart) || (a - b));
  const linkedFor = (i) => ingredients.map((ing, idx) => ({ ing, idx })).filter(({ ing }) => ing.step_position === i);

  const nowMs = Date.now();
  const serveAtMs = cook.serveAt ? new Date(cook.serveAt).getTime() : null;
  const cookStartMs = cook.session ? new Date(cook.session.started_at || cook.session.created_at).getTime() : null;
  const anchor = anchorPlan({ schedule, finish, serveAtMs, cookStartMs, nowMs });

  // LIVE serve projection: re-time the schedule using each step's REMAINING duration given reality.
  const remDur = (i) => { const t = timerByRef[String(i)]; if (!t) return durOf(i); return t.running ? Math.max(0, t.remaining) : 0; };
  const liveFinish = cookStartMs ? cookSchedule(steps.map((s, i) => ({ durationSeconds: remDur(i), deps: s.depends_on, hold: s.hold_tolerance, tag: s.tag }))).finish : finish;
  const projFinishMs = cookStartMs ? nowMs + liveFinish * 1000 : nowMs + finish * 1000;
  let serveDrift = null, serveState = null;
  if (serveAtMs) { const d = Math.round((projFinishMs - serveAtMs) / 1000); serveState = Math.abs(d) <= 60 ? "on_time" : d > 0 ? "late" : "early"; serveDrift = serveState === "on_time" ? "on time" : `${Math.round(Math.abs(d) / 60)} min ${d > 0 ? "late" : "early"}`; }

  const blockedFor = (i) => {
    const preds = (steps[i].depends_on || []).filter((p) => stateOf(p) !== "done");
    if (timerByRef[String(i)] || preds.length === 0) return null;
    const freesUpMs = Math.max(...preds.map((p) => { const t = timerByRef[String(p)]; return t && t.running ? nowMs + Math.max(0, t.remaining) * 1000 : anchor.endClockMs[p]; }));
    return { nums: preds.map((p) => p + 1), freesUp: fmtClockTime(freesUpMs) };
  };

  const macros = recipeMacros(ingredients, cookServings, data.itemsById);
  const onServe = (v) => { if (!v) return; const [hh, mm] = v.split(":").map(Number); const d = new Date(); d.setHours(hh, mm, 0, 0); cook.setServeTime(d.toISOString()); };

  const running = order.filter((i) => timerByRef[String(i)]?.running).map((i) => ({ index: i, step: steps[i], timer: timerByRef[String(i)], linked: linkedFor(i) }));
  const ready = order.filter((i) => !timerByRef[String(i)] && (steps[i].depends_on || []).every((p) => stateOf(p) === "done")).slice(0, 4).map((i) => ({ index: i, step: steps[i] }));

  const boardRows = order.map((i) => {
    const started = !!timerByRef[String(i)];
    return {
      index: i, n: i + 1, step: steps[i], linked: linkedFor(i), liveState: stateOf(i), timer: timerByRef[String(i)],
      deadline: !started ? fmtClockTime(anchor.deadlineMs[i]) : null,
      deadlineLabel: !started ? startByLabel(anchor.deadlineMs[i], nowMs) : null,
      blocked: blockedFor(i), critical: schedule[i].critical, floatMin: Math.round(schedule[i].float / 60),
      usedSet: cook.state.usedIngredients, onTick: (idx) => cook.useIngredient(idx),
      onStart: () => { initAudioContext(); cook.startTimer(i, durOf(i)); }, onStop: () => cook.stopTimer(i), onResume: () => cook.resumeTimer(i),
      onAdjustEst: (delta) => setEst((o) => ({ ...o, [i]: Math.max(60, durOf(i) + delta) })),
    };
  });

  const onAdjustRunning = (i, delta) => { const t = timerByRef[String(i)]; if (t) cook.startTimer(i, Math.max(1, t.remaining + delta)); };

  return (
    <div className="cpq" ref={setCpq} style={{ height: pageH ? `${pageH}px` : "100%" }}>
      <CookMasthead
        title={recipe.title} cuisine={recipe.cuisine}
        metricLabel={cookStartMs ? "elapsed" : "total planned"} metricValue={cookStartMs ? elapsedStr(nowMs - cookStartMs) : fmtDur(finish)}
        serveVal={serveAtMs ? fmtClockTime(serveAtMs) : ""} onServe={onServe} serveDrift={serveDrift} serveState={serveState}
        servings={cookServings} baseServ={recipe.servings || 1} onDec={() => setCookServings((s) => Math.max(1, s - 1))} onInc={() => setCookServings((s) => s + 1)}
        onBack={onBack} onIngredients={() => setShowIngs((v) => !v)}
      />
      {showIngs && <div className="cpq-ings-panel"><CookIngredients ingredients={ingredients} scale={cookServings / (recipe.servings || 1)} /></div>}
      <CookBand steps={steps} schedule={schedule} finish={finish} timerByRef={timerByRef} cookStartMs={cookStartMs} nowMs={nowMs} />
      <CookOnNow running={running} ready={ready} onAdjust={onAdjustRunning} onStart={(i) => { initAudioContext(); cook.startTimer(i, durOf(i)); }} usedSet={cook.state.usedIngredients} onTick={(idx) => cook.useIngredient(idx)} />
      <CookBoard scrollRef={boardScrollRef} contentRef={boardContentRef} onScroll={fit.onScroll} scale={fit.scale} rows={boardRows} />
      <CookFoot perServing={macros.perServing} unestimated={macros.unestimatedCount} fitPct={fit.pct} isManual={fit.isManual} onDec={fit.dec} onInc={fit.inc} onFit={fit.fit} onFinish={() => cook.finish()} hasSession={cook.hasSession} />
    </div>
  );
}
