import { useEffect, useState } from "react";
import { fetchRecipe } from "../../spine/data/recipeLoad";
import { recipeMacros } from "../../spine/logic/recipeCalc";
import { slotForHour, NUTRIENTS } from "../../spine/logic/foodCalc";
import { amsTodayYMD, amsClockMinutes } from "../../spine/logic/gymDates";
import { useCookEvents } from "../../spine/data/useCookEvents";
import { useCookLog } from "../../spine/data/useCookLog";
import { useWakeLock } from "../../spine/data/useWakeLock";
import { initAudioContext } from "../../spine/logic/cookAlarm";
import CookHero from "./CookHero";
import CookRail from "./CookRail";
import AlarmOverlay from "./AlarmOverlay";
import RecipeOverview from "./RecipeOverview";
import LogMealSheet from "./LogMealSheet";
import Toast from "../kit/Toast";
import "./cook.css";

// CookCompanion — the Hero + Rail cook page (replaces CookMode).
// STEP 5: servings scaling + "Log this cook" via the existing logSnapshot.
// The caller FREEZES the macro snapshot at log time (snapshot-not-live).

function shortLabel(text) {
  return (text || "").split(/\s+/).slice(0, 5).join(" ");
}

export default function CookCompanion({ recipeId, onBack, onEdit, onDelete }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("cooking");
  const [staging, setStaging] = useState(null); // null | { cookServings }
  const cl = useCookLog();

  useEffect(() => {
    let alive = true;
    fetchRecipe(recipeId).then((r) => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, [recipeId]);

  const cook = useCookEvents(recipeId);
  useWakeLock(cook.hasSession);

  if (!data || !cook.ready) {
    return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;
  }

  const { recipe, ingredients, steps, itemsById } = data;
  const macros = recipeMacros(ingredients, recipe.servings || 1, itemsById);
  const { stepStates, tickedIngredients, usedIngredients, timers, finished } = cook.state;
  const statusOf = (i) => stepStates[String(i)] || "waiting";
  const timerFor = (i) => timers.find((t) => t.targetRef === String(i));

  // ── Derive buckets (compute-on-read) ──────────────────────────────────────
  const heroIdx = finished ? -1 : steps.findIndex((_, i) => statusOf(i) !== "done");
  const hero = heroIdx >= 0 ? { index: heroIdx, step: steps[heroIdx] } : null;

  const parked = steps
    .map((step, i) => ({ index: i, step, timer: timerFor(i) }))
    .filter(({ index, timer }) => timer && timer.remaining > 0 && !timer.done && index !== heroIdx)
    .map(({ index, step, timer }) => ({ index, step, remaining: timer.remaining }))
    .sort((a, b) => a.remaining - b.remaining);

  const notYet = steps
    .map((step, i) => ({ index: i, step }))
    .filter(({ index }) => index !== heroIdx && statusOf(index) === "waiting");

  const doneCount = steps.filter((_, i) => statusOf(i) === "done").length;
  const hasRail = parked.length > 0;

  // ── Timers + alarm ────────────────────────────────────────────────────────
  const heroTimer = hero ? timerFor(hero.index) : null;
  const alarmTimer = timers.find((t) => t.done);
  const alarmStepIdx = alarmTimer ? parseInt(alarmTimer.targetRef, 10) : null;
  const alarmLabel = alarmStepIdx != null && steps[alarmStepIdx] ? shortLabel(steps[alarmStepIdx].text) : null;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleMarkDone = () => { if (hero) cook.markStep(hero.index, "done"); };
  const handleStartTimer = (idx, dur) => { initAudioContext(); cook.startTimer(idx, dur); };
  const handleAdjustTimer = (idx, delta) => {
    const t = timerFor(idx);
    if (!t) return;
    cook.startTimer(idx, Math.max(1, t.remaining + delta));
  };
  const handleAlarmDismiss = () => { if (alarmTimer) cook.stopTimer(parseInt(alarmTimer.targetRef, 10)); };
  const handleAlarmExtend = (sec) => {
    if (!alarmTimer) return;
    cook.startTimer(parseInt(alarmTimer.targetRef, 10), sec);
  };

  // ── Log this cook ──────────────────────────────────────────────────────
  const handleLogRequest = () => setStaging({ cookServings: recipe.servings || 1 });
  const handleLogMeal = (eaten, slot) => {
    setStaging(null);
    const today = amsTodayYMD(Date.now());
    const snap = {};
    for (const k of NUTRIENTS) snap[k] = (macros.perServing[k] || 0) * eaten;
    cl.logSnapshot({
      entry_date: today, meal_slot: slot, food_item_id: null,
      recipe_id: recipeId, amount: eaten, unit: "serving",
      ...snap, entry_source: "recipe_cook", is_alcohol: false,
    }, {});
  };

  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
  const dateParts = [];
  if (recipe.servings) dateParts.push(`Serves ${recipe.servings}`);
  if (time) dateParts.push(`${time} min`);

  return (
    <div className="cm2">
      <div className="cc-mast">
        <button type="button" className="cc-back" onClick={onBack}>‹ Cookbook</button>
        <div className="cc-mast-center">
          <button type="button" className={`cc-mode-tab${mode === "cooking" ? " is-active" : ""}`} onClick={() => setMode("cooking")}>Cooking</button>
          <button type="button" className={`cc-mode-tab${mode === "recipe" ? " is-active" : ""}`} onClick={() => setMode("recipe")}>Recipe</button>
        </div>
        <div className="cc-mast-right">
          {mode === "cooking" && hero && (
            <span className="cc-mast-status">Step {hero.index + 1} of {steps.length}</span>
          )}
          {mode === "cooking" && finished && (
            <span className="cc-mast-status">Cook finished</span>
          )}
          <button type="button" className="cc-log-btn" onClick={handleLogRequest}>Log</button>
        </div>
      </div>

      <div className="cc-title-row">
        <h1 className="cc-title">{recipe.title}</h1>
        {dateParts.length > 0 && <p className="cc-dateline">{dateParts.join(" · ")}</p>}
      </div>

      {mode === "cooking" ? (
        <>
          <div className={`cc-body${hasRail ? "" : " cc-body--solo"}`}>
            <CookHero
              hero={hero} parked={parked} totalSteps={steps.length}
              heroTimer={heroTimer && !heroTimer.done ? heroTimer : null}
              ingredients={ingredients} tickedSet={usedIngredients}
              onMarkDone={handleMarkDone}
              onStartTimer={handleStartTimer}
              onAdjustTimer={handleAdjustTimer}
              onTickIngredient={(i) => cook.useIngredient(i)}
            />
            {hasRail && <CookRail parked={parked} notYet={notYet} />}
          </div>
          <div className="cc-foot">
            {doneCount > 0 && <span className="cc-done-count">{doneCount} done</span>}
            {finished && <span className="cc-done-count">All {steps.length} steps done</span>}
          </div>
        </>
      ) : (
        <div className="cc-body cc-body--scroll">
          <RecipeOverview
            recipe={recipe} ingredients={ingredients} steps={steps}
            tickedSet={tickedIngredients} onTick={(i) => cook.tickIngredient(i)}
            onLogRequest={handleLogRequest}
          />
        </div>
      )}

      <AlarmOverlay stepLabel={alarmLabel} onDismiss={handleAlarmDismiss} onExtend={handleAlarmExtend} />
      {staging && (
        <LogMealSheet
          perServing={macros.perServing} unestimatedCount={macros.unestimatedCount}
          defaultSlot={slotForHour(Math.floor(amsClockMinutes(Date.now()) / 60))}
          cookedEyebrow
          onLog={handleLogMeal} onClose={() => setStaging(null)}
        />
      )}
      {cl.toast && <Toast text={cl.toast.text} onUndo={cl.toast.undo} onDismiss={cl.dismiss} />}
    </div>
  );
}
