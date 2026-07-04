// BroadsheetRecipe (Piece 3) — the new three-column broadsheet recipe surface. STATIC LOOK ONLY:
// no live cooking, no timers, no cook session, no tickable progress. Reuses fetchRecipe from
// recipeLoad. Mounted behind a preview toggle in Cookbook.jsx (temporary until Piece 5 makes it
// the real page). Collapsible side columns with eased transitions.
import { useEffect, useState } from "react";
import { fetchRecipe } from "./recipeLoad";
import BroadsheetMasthead from "./BroadsheetMasthead";
import BroadsheetIngredients from "./BroadsheetIngredients";
import BroadsheetSteps from "./BroadsheetSteps";
import BroadsheetTiming from "./BroadsheetTiming";
import "./broadsheet.css";

export default function BroadsheetRecipe({ recipeId, onBack }) {
  const [data, setData] = useState(null);
  const [groupMode, setGroupMode] = useState("flat");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchRecipe(recipeId).then((r) => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, [recipeId]);

  if (!data) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;

  const { recipe, ingredients, steps } = data;
  const timeToTable = ((recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)) || null;

  return (
    <div className="bs">
      <BroadsheetMasthead recipe={recipe} timeToTable={timeToTable} onBack={onBack} />

      <div className="bs-body">
        <div className={`bs-side bs-side-left${leftOpen ? " is-open" : ""}`}>
          <button type="button" className="bs-collapse-btn" onClick={() => setLeftOpen((v) => !v)}>
            {leftOpen ? "‹" : "›"}
          </button>
          {leftOpen && (
            <BroadsheetIngredients
              ingredients={ingredients}
              steps={steps}
              groupMode={groupMode}
              onToggleGroup={() => setGroupMode((m) => (m === "flat" ? "grouped" : "flat"))}
            />
          )}
        </div>

        <div className="bs-centre">
          <BroadsheetSteps steps={steps} />
        </div>

        <div className={`bs-side bs-side-right${rightOpen ? " is-open" : ""}`}>
          <button type="button" className="bs-collapse-btn" onClick={() => setRightOpen((v) => !v)}>
            {rightOpen ? "›" : "‹"}
          </button>
          {rightOpen && <BroadsheetTiming steps={steps} />}
        </div>
      </div>
    </div>
  );
}
