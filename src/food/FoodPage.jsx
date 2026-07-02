import { useState } from "react";
import LogPage from "./LogPage";
import Cookbook from "./Cookbook";
import ResumeCookBanner from "./ResumeCookBanner";
import "./foodPage.css";

// FoodPage — the Food pillar shell (F4). Food lands on the Log; a Log | Cookbook toggle
// (Log default) switches the two faces, mirroring the BodyPage tab pattern (its own
// food-tabs class — no cross-coupling to Body's CSS). READ-ONLY: no data, no calc, no
// fetch, no writes. The real Log front page is F5, the real Cookbook is F7; this file just
// makes the frame sound so content lands cleanly later.
//
// The loading branch is here so F5 can flip `loading` true while the day/range data loads
// and reuse it unchanged. F4 has nothing to load, so `loading` stays false and the tab
// content renders directly — no perpetual spinner (one that never resolves would be a lie).

const TABS = [
  { id: "log", label: "Log" },
  { id: "cookbook", label: "Cookbook" },
];

export default function FoodPage() {
  const [tab, setTab] = useState("log"); // 'log' | 'cookbook' — Food lands on the Log
  const [loading] = useState(false); // F5 will drive this during its load; inert in F4
  const [openRecipeId, setOpenRecipeId] = useState(null); // a Log→Cookbook "View recipe" jump (F9)
  const [openCook, setOpenCook] = useState(false); // resume-banner deep-link: open the recipe INTO cook (B)
  const openRecipe = (id, cook = false) => { setOpenRecipeId(id); setOpenCook(!!cook); setTab("cookbook"); };

  return (
    <div className="food-page">
      <ResumeCookBanner onResume={(id) => openRecipe(id, true)} refreshKey={tab} />
      <div className="food-tabs" role="tablist" aria-label="Food">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            className={t.id === tab ? "food-tab is-active" : "food-tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="food-loading">
          <span className="food-spinner" aria-hidden="true" />
          <span>Reading your food log…</span>
        </div>
      ) : tab === "log" ? (
        <section className="food-pane" role="tabpanel" aria-label="Log">
          <LogPage onOpenRecipe={openRecipe} />
        </section>
      ) : (
        <section className="food-pane" role="tabpanel" aria-label="Cookbook">
          <Cookbook openRecipeId={openRecipeId} cookOnOpen={openCook} onConsumeOpen={() => { setOpenRecipeId(null); setOpenCook(false); }} />
        </section>
      )}
    </div>
  );
}
