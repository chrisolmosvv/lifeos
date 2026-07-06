import { useState } from "react";
import CookHero from "./CookHero";
import CookRail from "./CookRail";
import AlarmOverlay from "./AlarmOverlay";
import RecipeOverview from "./RecipeOverview";
import { RICH_MOCK, BARE_MOCK } from "./cookMock";
import "./cook.css";

// CookCompanion — the Hero + Rail cook page (replaces CookMode).
// STEP 1: static render from mock data. The props + data hooks are declared
// for step 4 to wire; until then we render from the hard-coded mocks.

export default function CookCompanion({ recipeId, onBack, onEdit, onDelete }) {
  // Dev toggle: flip between the rich salmon mock and the bare scrambled-eggs fallback.
  // Removed once real data is wired in step 2.
  const [useBare, setUseBare] = useState(false);
  const mock = useBare ? BARE_MOCK : RICH_MOCK;

  const [overview, setOverview] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);

  const { recipe, steps, ingredients, hero, parked, notYet, done } = mock;
  const hasRail = parked.length > 0;

  const time = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0);
  const dateParts = [];
  if (recipe.servings) dateParts.push(`Serves ${recipe.servings}`);
  if (time) dateParts.push(`${time} min`);

  return (
    <div className="cm2">
      {/* Masthead — back, cooking status, controls */}
      <div className="cc-mast">
        <button type="button" className="cc-back" onClick={onBack}>‹ Cookbook</button>
        <div className="cc-mast-right">
          <span className="cc-mast-status">
            Step {hero ? hero.index + 1 : "–"} of {steps.length}
          </span>
          {/* Dev toggles (temporary — removed after step 1) */}
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

      {/* Main body: hero + rail (or hero full-width for bare fallback) */}
      <div className={`cc-body${hasRail ? "" : " cc-body--solo"}`}>
        <CookHero
          hero={hero}
          parked={parked}
          totalSteps={steps.length}
          onMarkDone={() => {}}
        />
        {hasRail && <CookRail parked={parked} notYet={notYet} />}
      </div>

      {/* Footer: done count + recipe toggle */}
      <div className="cc-foot">
        {done.length > 0 && (
          <span className="cc-done-count">{done.length} done</span>
        )}
        <button type="button" className="cc-recipe-toggle" onClick={() => setOverview(true)}>
          View full recipe
        </button>
      </div>

      {/* Overlays */}
      <RecipeOverview
        recipe={recipe} ingredients={ingredients} steps={steps}
        open={overview} onClose={() => setOverview(false)}
      />
      <AlarmOverlay
        stepLabel={showAlarm ? "Salmon is ready" : null}
        onDismiss={() => setShowAlarm(false)}
      />
    </div>
  );
}
