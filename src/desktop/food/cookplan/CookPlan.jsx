// LifeOS — Food → the COOK PLAN page (mock Q; 3a–3e). Composes masthead · band · on-now · board ·
// foot over the live cook, the resource-aware schedule and the serve anchor. Mid-cook edits are
// captured as EVENTS (survive reload). FINISH opens the itemised review (Keep/Drop → updateRecipe
// with WHOLE objects). BACK abandons silently. Renders what the scheduler + replay produce.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRecipe } from "../../../spine/data/recipeLoad";
import { updateRecipe } from "../../../spine/data/recipeWrite";
import { cookSchedule } from "../../../spine/logic/cookSchedule";
import { anchorPlan } from "../../../spine/logic/cookDeadlines";
import { recipeMacros } from "../../../spine/logic/recipeCalc";
import { computeChanges, applyKept } from "../../../spine/logic/cookChanges";
import { fmtDur, fmtClockTime, startByLabel } from "../../../spine/logic/cookPlanView";
import { NUTRIENTS, slotForHour } from "../../../spine/logic/foodCalc";
import { amsTodayYMD, amsClockMinutes } from "../../../spine/logic/gymDates";
import { useCookEvents } from "../../../spine/data/useCookEvents";
import { useWakeLock } from "../../../spine/data/useWakeLock";
import { useCookLog } from "../../../spine/data/useCookLog";
import { initAudioContext, startAlarm, stopAlarm } from "../../../spine/logic/cookAlarm";
import { useFitToHole } from "./useFitToHole";
import CookMasthead from "./CookMasthead";
import CookBand from "./CookBand";
import CookOnNow from "./CookOnNow";
import CookBoard from "./CookBoard";
import CookFoot from "./CookFoot";
import CookIngredients from "./CookIngredients";
import CookReview from "./CookReview";
import FinderPopover from "../importreview/FinderPopover"; // 3f: reused (cook variant) for mid-cook chip edits
import Toast from "../../kit/Toast";
import "../cookPlan.css";
import "../importreview/importReview.css"; // 3f: the popover's iv-* styles (prefixed; no collision with cpq-*)

const elapsedStr = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 3600) ? Math.floor(s / 3600) + "h " : ""}${Math.floor((s % 3600) / 60)}m`; };

export default function CookPlan({ recipeId, onBack }) {
  const [data, setData] = useState(null);
  const [cookServings, setCookServings] = useState(null);
  const [showIngs, setShowIngs] = useState(false);
  const [reviewing, setReviewing] = useState(null); // null | changes object
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [editChip, setEditChip] = useState(null); // 3f: { idx, anchor } | null
  const cook = useCookEvents(recipeId);
  const cl = useCookLog();
  useWakeLock(cook.hasSession);

  const alarmedRef = useRef(new Set());
  const prevRemRef = useRef({});
  const boardScrollRef = useRef(null);
  const boardContentRef = useRef(null);
  const cpqRef = useRef(null);
  const [pageH, setPageH] = useState(null);
  const measure = useCallback(() => { const el = cpqRef.current; if (el) setPageH(window.innerHeight - el.getBoundingClientRect().top); }, []);
  const setCpq = useCallback((el) => { cpqRef.current = el; measure(); }, [measure]);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [measure]);

  useEffect(() => {
    let alive = true; setData(null); setCookServings(null); setReviewing(null);
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
  const durOf = (i) => cook.state.estimates?.[String(i)] ?? (steps[i]?.timer_seconds || 0);
  const base = data ? cookSchedule(steps.map((s, i) => ({ durationSeconds: durOf(i), deps: s.depends_on, hold: s.hold_tolerance, tag: s.tag }))) : null;

  const fitSig = `${recipeId}:${cookServings}:${steps.length}:${Object.keys(cook.state?.estimates || {}).length}`;
  const fit = useFitToHole(boardScrollRef, boardContentRef, fitSig);
  useEffect(() => {
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

  // 3f: the live ledger reflects mid-cook proposals — apply amount_changed / ingredient_omitted from
  // replay before computing macros, so changing an amount or omitting an ingredient moves it at once.
  const amountsOv = cook.state.amounts || {};
  const omittedOv = cook.state.omitted || new Set();
  const effIngredient = (i) => (amountsOv[String(i)] ? { ...ingredients[i], ...amountsOv[String(i)] } : ingredients[i]);
  const effIngs = ingredients.map((_, i) => (omittedOv.has(String(i)) ? null : effIngredient(i))).filter(Boolean);
  const macros = recipeMacros(effIngs, cookServings, data.itemsById);
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
      onAdjustEst: (delta) => cook.adjustEstimate(i, Math.max(60, durOf(i) + delta)),
    };
  });

  const logThisCook = () => {
    const snap = {}; for (const k of NUTRIENTS) snap[k] = (macros.perServing[k] || 0) * cookServings;
    cl.logSnapshot({ entry_date: amsTodayYMD(Date.now()), meal_slot: slotForHour(Math.floor(amsClockMinutes(Date.now()) / 60)), food_item_id: null, recipe_id: recipeId, amount: cookServings, unit: "serving", ...snap, entry_source: "recipe_cook", is_alcohol: false }, {});
  };
  // Navigating away from a LIVE cook is unintentional → confirm (data loss wearing a design
  // principle otherwise). An explicit abandon stays silent. Nothing prompts when nothing's running.
  const handleBack = () => { if (cook.hasSession) setConfirmLeave(true); else onBack(); };
  const leaveAndLose = async () => { await cook.abandon(); onBack(); };
  const openReview = () => setReviewing(computeChanges(data.steps, data.ingredients, cook.state));
  const onReviewSave = async (keptKeys, alsoLog) => {
    setSaving(true);
    try {
      if (reviewing && (reviewing.timing.length || reviewing.amounts.length)) {
        const { steps: kSteps, ingredients: kIngs } = applyKept(data.steps, data.ingredients, reviewing, keptKeys);
        await updateRecipe(recipeId, recipe, kIngs, kSteps);
      }
      await cook.finish();
      if (alsoLog) logThisCook();
    } catch { /* toast below on log; save failure surfaces on reload */ }
    setSaving(false); setReviewing(null); onBack();
  };

  return (
    <div className="cpq" ref={setCpq} style={{ height: pageH ? `${pageH}px` : "100%" }}>
      <CookMasthead
        title={recipe.title} cuisine={recipe.cuisine}
        metricLabel={cookStartMs ? "elapsed" : "total planned"} metricValue={cookStartMs ? elapsedStr(nowMs - cookStartMs) : fmtDur(finish)}
        serveVal={serveAtMs ? fmtClockTime(serveAtMs) : ""} onServe={onServe} serveDrift={serveDrift} serveState={serveState}
        servings={cookServings} baseServ={recipe.servings || 1} onDec={() => setCookServings((s) => Math.max(1, s - 1))} onInc={() => setCookServings((s) => s + 1)}
        onBack={handleBack} onIngredients={() => setShowIngs((v) => !v)}
      />
      {showIngs && <div className="cpq-ings-panel"><CookIngredients ingredients={ingredients} scale={cookServings / (recipe.servings || 1)} editable={cook.hasSession} omitted={cook.state.omitted} amounts={cook.state.amounts} onOmit={cook.omitIngredient} onAmount={cook.changeAmount} /></div>}
      <CookBand steps={steps} schedule={schedule} finish={finish} timerByRef={timerByRef} cookStartMs={cookStartMs} nowMs={nowMs} />
      <CookOnNow running={running} ready={ready} onAdjust={(i, d) => cook.adjustTimer(i, d)} onStop={(i) => cook.stopTimer(i)} onStart={(i) => { initAudioContext(); cook.startTimer(i, durOf(i)); }} usedSet={cook.state.usedIngredients} onEditChip={(idx, e) => setEditChip({ idx, anchor: e.currentTarget.getBoundingClientRect() })} />
      <CookBoard scrollRef={boardScrollRef} contentRef={boardContentRef} onScroll={fit.onScroll} scale={fit.scale} rows={boardRows} />
      <CookFoot perServing={macros.perServing} unestimated={macros.unestimatedCount} fitPct={fit.pct} isManual={fit.isManual} onDec={fit.dec} onInc={fit.inc} onFit={fit.fit} onFinish={openReview} hasSession={cook.hasSession} />
      {reviewing && <CookReview changes={reviewing} kcalPerServing={macros.perServing.kcal} servings={cookServings} onSave={onReviewSave} onCancel={() => setReviewing(null)} saving={saving} />}
      {editChip && (
        <FinderPopover variant="cook" ing={effIngredient(editChip.idx)} itemsById={data.itemsById} anchor={editChip.anchor}
          onPatch={(p) => { const ci = effIngredient(editChip.idx); cook.changeAmount(editChip.idx, p.amount ?? ci.amount, p.unit ?? ci.unit, p.grams ?? ci.grams); }}
          isUsed={cook.state.usedIngredients?.has(String(editChip.idx))}
          onUsed={() => { cook.useIngredient(editChip.idx); setEditChip(null); }}
          onOmit={() => { cook.omitIngredient(editChip.idx); setEditChip(null); }}
          onClose={() => setEditChip(null)} />
      )}
      {confirmLeave && (
        <div className="cpq-review-scrim" role="dialog" aria-modal="true">
          <div className="cpq-confirm">
            <p className="cpq-confirm-msg">This cook is still running — leave and lose it?</p>
            <div className="cpq-confirm-foot">
              <button type="button" className="cpq-review-cancel" onClick={() => setConfirmLeave(false)}>Keep cooking</button>
              <button type="button" className="cpq-confirm-leave" onClick={leaveAndLose}>Leave &amp; lose it</button>
            </div>
          </div>
        </div>
      )}
      {cl.toast && <Toast text={cl.toast.text} onUndo={cl.toast.undo} onDismiss={cl.dismiss} />}
    </div>
  );
}
