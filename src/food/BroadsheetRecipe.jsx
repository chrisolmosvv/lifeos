// BroadsheetRecipe (Piece 3) — the new three-column broadsheet recipe surface. STATIC LOOK ONLY:
// no live cooking, no timers, no cook session, no tickable progress. Reuses fetchRecipe from
// recipeLoad. Mounted behind a preview toggle in Cookbook.jsx (temporary until Piece 5 makes it
// the real page). Fixed-frame cockpit: the page doesn't scroll; ingredients + method scroll
// internally with a "more ↓" fade cue that disappears at the end.
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRecipe } from "./recipeLoad";
import { useBroadsheetCook } from "./useBroadsheetCook";
import BroadsheetMasthead from "./BroadsheetMasthead";
import BroadsheetIngredients from "./BroadsheetIngredients";
import BroadsheetSteps from "./BroadsheetSteps";
import BroadsheetTiming from "./BroadsheetTiming";
import "./broadsheet.css";

// Scroll-cue hook: returns a callback ref + a boolean "has more below". Uses a callback ref so
// setup runs when the element ACTUALLY MOUNTS (not on first render when data hasn't loaded yet).
function useScrollCue() {
  const elRef = useRef(null);
  const cleanupRef = useRef(null);
  const [hasMore, setHasMore] = useState(false);

  const ref = useCallback((node) => {
    // Teardown previous
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    elRef.current = node;
    if (!node) { setHasMore(false); return; }

    const check = () => {
      setHasMore(node.scrollHeight - node.scrollTop - node.clientHeight > 4);
    };
    // Initial check after a frame (layout must settle)
    requestAnimationFrame(check);

    node.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(node);
    cleanupRef.current = () => { node.removeEventListener("scroll", check); ro.disconnect(); };
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (cleanupRef.current) cleanupRef.current(); }, []);

  return { ref, hasMore };
}

export default function BroadsheetRecipe({ recipeId, onBack, onEdit, onDelete, onCook, onLog, onToggleFav, isFav }) {
  const [data, setData] = useState(null);
  const [groupMode, setGroupMode] = useState("flat");
  const cook = useBroadsheetCook(recipeId);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [bodyH, setBodyH] = useState(null);
  const bsRef = useRef(null);
  const ingCue = useScrollCue();
  const stepCue = useScrollCue();

  // Measure remaining viewport height from .bs top → set body height dynamically.
  // Adapts to chrome above (with or without resume banner). Re-measures on resize.
  useEffect(() => {
    const measure = () => {
      const el = bsRef.current;
      if (!el) return;
      const masthead = el.querySelector(".bs-mast");
      const mastheadH = masthead ? masthead.getBoundingClientRect().height : 0;
      const top = el.getBoundingClientRect().top;
      const remaining = window.innerHeight - top - mastheadH - 24; // 24px breathing room at bottom
      setBodyH(Math.max(200, remaining));
    };
    measure();
    window.addEventListener("resize", measure);
    // Re-measure after a tick (fonts/layout may settle)
    const t = setTimeout(measure, 100);
    return () => { window.removeEventListener("resize", measure); clearTimeout(t); };
  }, [data]);

  useEffect(() => {
    let alive = true;
    fetchRecipe(recipeId).then((r) => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, [recipeId]);

  if (!data) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading recipe…</span></div>;

  const { recipe, ingredients, steps } = data;
  const timeToTable = ((recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)) || null;

  return (
    <div className="bs" ref={bsRef}>
      <BroadsheetMasthead recipe={recipe} timeToTable={timeToTable} onBack={onBack} onEdit={onEdit} onDelete={onDelete} onCook={onCook} onLog={onLog} onToggleFav={onToggleFav} isFav={isFav} />

      <div className="bs-body" style={bodyH ? { height: `${bodyH}px` } : undefined}>
        <div className={`bs-side bs-side-left${leftOpen ? " is-open" : ""}`}>
          <button type="button" className="bs-collapse-btn" onClick={() => setLeftOpen((v) => !v)}>
            {leftOpen ? "‹" : "›"}
          </button>
          {leftOpen && (
            <div className={`bs-scroll-wrap${ingCue.hasMore ? " has-more" : ""}`}>
              <div className="bs-scroll-inner" ref={ingCue.ref}>
                <BroadsheetIngredients
                  ingredients={ingredients}
                  steps={steps}
                  groupMode={groupMode}
                  onToggleGroup={() => setGroupMode((m) => (m === "flat" ? "grouped" : "flat"))}
                  isTicked={cook.isTicked}
                  onToggleTick={cook.toggleTick}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bs-centre">
          <div className={`bs-scroll-wrap${stepCue.hasMore ? " has-more" : ""}`}>
            <div className="bs-scroll-inner" ref={stepCue.ref}>
              <BroadsheetSteps steps={steps} stepState={cook.stepState} onMarkStep={cook.markStep} />
            </div>
          </div>
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
