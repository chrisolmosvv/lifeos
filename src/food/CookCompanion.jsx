import { useState } from "react";
import CookHero from "./CookHero";
import CookRail from "./CookRail";
import AlarmOverlay from "./AlarmOverlay";
import RecipeOverview from "./RecipeOverview";
import { RICH_MOCK, BARE_MOCK } from "./cookMock";
import "./cook.css";

// CookCompanion — the Hero + Rail cook page (replaces CookMode).
// STEP 2: the Cooking↔Recipe mode toggle. Still renders from mock data;
// real data + event writes come in steps 3–4.

export default function CookCompanion({ recipeId, onBack, onEdit, onDelete }) {
  const [useBare, setUseBare] = useState(false);   // dev toggle (temporary)
  const [mode, setMode] = useState("cooking");      // "cooking" | "recipe"
  const [showAlarm, setShowAlarm] = useState(false);
  const mock = useBare ? BARE_MOCK : RICH_MOCK;

  const { recipe, steps, ingredients, hero, parked, notYet, done } = mock;
  const hasRail = parked.length > 0;

  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
  const dateParts = [];
  if (recipe.servings) dateParts.push(`Serves ${recipe.servings}`);
  if (time) dateParts.push(`${time} min`);

  return (
    <div className="cm2">
      {/* Masthead — back, mode toggle, controls */}
      <div className="cc-mast">
        <button type="button" className="cc-back" onClick={onBack}>‹ Cookbook</button>
        <div className="cc-mast-center">
          <button type="button" className={`cc-mode-tab${mode === "cooking" ? " is-active" : ""}`} onClick={() => setMode("cooking")}>Cooking</button>
          <button type="button" className={`cc-mode-tab${mode === "recipe" ? " is-active" : ""}`} onClick={() => setMode("recipe")}>Recipe</button>
        </div>
        <div className="cc-mast-right">
          {mode === "cooking" && (
            <span className="cc-mast-status">
              Step {hero ? hero.index + 1 : "–"} of {steps.length}
            </span>
          )}
          {/* Dev toggles (temporary) */}
          <button type="button" className="cc-dev-toggle" onClick={() => setUseBare((b) => !b)}>
            {useBare ? "Rich" : "Bare"}
          </button>
          <button type="button" className="cc-dev-toggle" onClick={() => setShowAlarm(true)}>
            Alarm
          </button>
        </div>
      </div>

      {/* Title + dateline */}
      <div className="cc-title-row">
        <h1 className="cc-title">{recipe.title}</h1>
        {dateParts.length > 0 && (
          <p className="cc-dateline">{dateParts.join(" · ")}</p>
        )}
      </div>

      {/* Body: cooking mode (hero + rail) or recipe mode (overview) */}
      {mode === "cooking" ? (
        <>
          <div className={`cc-body${hasRail ? "" : " cc-body--solo"}`}>
            <CookHero hero={hero} parked={parked} totalSteps={steps.length} onMarkDone={() => {}} />
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

      {/* Alarm overlay */}
      <AlarmOverlay
        stepLabel={showAlarm ? "Salmon is ready" : null}
        onDismiss={() => setShowAlarm(false)}
      />
    </div>
  );
}
