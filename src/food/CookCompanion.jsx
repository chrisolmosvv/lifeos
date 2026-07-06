import { useEffect, useState } from "react";
import CookHero from "./CookHero";
import CookRail from "./CookRail";
import AlarmOverlay from "./AlarmOverlay";
import RecipeOverview from "./RecipeOverview";
import { useCookTimers } from "./useCookTimers";
import { RICH_MOCK, BARE_MOCK } from "./cookMock";
import "./cook.css";

// CookCompanion — the Hero + Rail cook page (replaces CookMode).
// STEP 3: live timers, ±1 min, looping alarm. Still mock data.

function shortLabel(text) {
  return (text || "").split(/\s+/).slice(0, 5).join(" ");
}

export default function CookCompanion({ recipeId, onBack, onEdit, onDelete }) {
  const [useBare, setUseBare] = useState(false);
  const [mode, setMode] = useState("cooking");
  const mock = useBare ? BARE_MOCK : RICH_MOCK;
  const { recipe, steps, ingredients, hero, parked: mockParked, notYet, done } = mock;
  const hasRail = mockParked.length > 0;

  const ct = useCookTimers();

  // Auto-start timers for parked items on mount (simulates a mid-cook state)
  const [inited, setInited] = useState(false);
  useEffect(() => {
    if (inited || useBare) return;
    for (const p of mockParked) {
      if (p.remaining != null && p.step.timer_seconds > 0) {
        // Start with remaining as the duration so countdown begins from mock values
        ct.startTimer(p.index, p.remaining);
      }
    }
    setInited(true);
  }, [useBare]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge live timer data into parked items
  const parked = mockParked.map((p) => {
    const live = ct.liveTimers[p.index];
    return live ? { ...p, remaining: live.remaining } : p;
  });

  // Hero timer (if one is running for the hero step)
  const heroTimer = hero ? ct.liveTimers[hero.index] || null : null;

  // Alarm: find the step that triggered it
  const alarmStep = ct.alarmIdx != null ? steps[ct.alarmIdx] : null;
  const alarmLabel = alarmStep ? shortLabel(alarmStep.text) : null;

  const handleAlarmDismiss = () => {
    if (ct.alarmIdx != null) ct.dismissTimer(ct.alarmIdx);
  };
  const handleAlarmExtend = (sec) => {
    if (ct.alarmIdx != null) { ct.adjustTimer(ct.alarmIdx, sec); ct.dismissTimer(ct.alarmIdx); }
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
          {mode === "cooking" && (
            <span className="cc-mast-status">Step {hero ? hero.index + 1 : "–"} of {steps.length}</span>
          )}
          <button type="button" className="cc-dev-toggle" onClick={() => { setUseBare((b) => !b); setInited(false); }}>
            {useBare ? "Rich" : "Bare"}
          </button>
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
              heroTimer={heroTimer}
              onMarkDone={() => {}}
              onStartTimer={(idx, dur) => ct.startTimer(idx, dur)}
              onAdjustTimer={(idx, delta) => ct.adjustTimer(idx, delta)}
            />
            {hasRail && <CookRail parked={parked} notYet={notYet} />}
          </div>
          <div className="cc-foot">
            {done.length > 0 && <span className="cc-done-count">{done.length} done</span>}
          </div>
        </>
      ) : (
        <div className="cc-body cc-body--scroll">
          <RecipeOverview recipe={recipe} ingredients={ingredients} steps={steps} />
        </div>
      )}

      <AlarmOverlay
        stepLabel={alarmLabel}
        onDismiss={handleAlarmDismiss}
        onExtend={handleAlarmExtend}
      />
    </div>
  );
}
