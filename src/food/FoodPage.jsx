import { useEffect, useState } from "react";
import LogPage from "./LogPage";
import Cookbook from "./Cookbook";
import ResumeCookBanner from "./ResumeCookBanner";
import "./foodPage.css";

// FoodPage (Piece 2) — the Food pillar shell. The Log/Cookbook toggle is now rendered INSIDE
// the log's masthead row (matching the Day/Week/Month text-tab style). FoodPage just holds
// the tab state and passes it down; it no longer renders its own toggle row.

const FOOD_TABS = [
  { id: "log", label: "Log" },
  { id: "cookbook", label: "Cookbook" },
];

export default function FoodPage({ stageRecipeId, onConsumeStage }) {
  const [tab, setTab] = useState("log");
  const [loading] = useState(false);
  const [openRecipeId, setOpenRecipeId] = useState(null);
  const [openCook, setOpenCook] = useState(false);
  const [openStage, setOpenStage] = useState(false);
  const openRecipe = (id, cook = false, stage = false) => { setOpenRecipeId(id); setOpenCook(!!cook); setOpenStage(!!stage); setTab("cookbook"); };

  useEffect(() => { if (stageRecipeId) { openRecipe(stageRecipeId, false, true); onConsumeStage?.(); } }, [stageRecipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="food-page">
      <ResumeCookBanner onResume={(id) => openRecipe(id, true)} refreshKey={tab} />

      {loading ? (
        <div className="food-loading">
          <span className="food-spinner" aria-hidden="true" />
          <span>Reading your food log…</span>
        </div>
      ) : tab === "log" ? (
        <section className="food-pane" role="tabpanel" aria-label="Log">
          <LogPage onOpenRecipe={openRecipe} foodTabs={FOOD_TABS} foodTab={tab} onFoodTab={setTab} />
        </section>
      ) : (
        <section className="food-pane" role="tabpanel" aria-label="Cookbook">
          <Cookbook openRecipeId={openRecipeId} cookOnOpen={openCook} stageOnOpen={openStage}
            onConsumeOpen={() => { setOpenRecipeId(null); setOpenCook(false); setOpenStage(false); }}
            foodTabs={FOOD_TABS} foodTab={tab} onFoodTab={setTab} />
        </section>
      )}
    </div>
  );
}
