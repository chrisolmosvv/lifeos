import { useEffect, useRef } from "react";
import { useCookEvents } from "./useCookEvents";
import { useWakeLock } from "./useWakeLock";
import { fmtClock } from "./cookTimers";
import "./cookMode2.css";

// CookMode — the event-sourced cooking companion. Full scrolling method (all steps visible,
// current highlighted) + ingredients rail with per-step highlighting. Built on the proven
// replay engine via useCookEvents. Resume is free.

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

function fmtDur(secs) {
  if (secs == null || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h${String(m % 60).padStart(2, "0")}`; }
  return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

// Compose a readable ingredient label: raw_text + food item name when raw_text is just a quantity.
function ingLabel(ing, itemsById) {
  const raw = (ing.raw_text || "").trim();
  const itemName = ing.food_item_id && itemsById?.[ing.food_item_id]?.name;
  // If raw_text already includes the food name (long enough / has letters beyond qty), use it as-is
  if (raw.length > 6 && /[a-zA-Z]{3,}/.test(raw)) return raw;
  // If we have a matched food name, compose: "raw_text food_name" (e.g. "300 g" + "Chicken breast")
  if (itemName) return raw ? `${raw} ${itemName}` : itemName;
  return raw || "ingredient";
}

export default function CookMode({ recipe, steps, ingredients, itemsById, onExit }) {
  const cook = useCookEvents(recipe.id);
  useWakeLock(true);
  const currentRef = useRef(null);

  const stepList = steps || [];
  const ingList = ingredients || [];
  const items = itemsById || {};

  const { stepStates, tickedIngredients, timers, finished } = cook.state;

  // Derive current step index: first step that isn't 'done'
  const statusOf = (i) => stepStates[String(i)] || "waiting";
  const currentIdx = stepList.findIndex((_, i) => statusOf(i) !== "done");
  const current = currentIdx >= 0 ? currentIdx : stepList.length;
  const tickedCount = ingList.filter((_, i) => tickedIngredients.has(String(i))).length;

  // Timer lookup by step index
  const timerFor = (i) => timers.find((t) => t.targetRef === String(i));

  // Ingredients for a given step (via step_position)
  const ingsForStep = (stepIdx) => {
    const matched = [];
    ingList.forEach((ing, i) => {
      if (ing.step_position === stepIdx) matched.push({ ing, idx: i });
    });
    return matched;
  };

  // Auto-scroll current step into view when it changes
  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [current]);

  const handleMarkDone = (i) => cook.markStep(i, "done");

  const handleGoBack = () => {
    if (current <= 0) return;
    // Mark the current step back to waiting, and mark the previous step back to active
    cook.markStep(current - 1, "waiting");
  };

  const handleFinish = () => {
    cook.finish();
    onExit(false);
  };

  if (!cook.ready) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Loading your cook…</span></div>;

  if (finished) {
    return (
      <div className="cm2">
        <div className="cm2-finished">
          <p className="cm2-finished-title">{recipe.title}</p>
          <p className="cm2-finished-line">Cook finished.</p>
          <button type="button" className="cm2-finished-back" onClick={() => onExit(false)}>← Back to recipe</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cm2">
      {/* Masthead */}
      <div className="cm2-mast">
        <div className="cm2-mast-left">
          <span className="cm2-live-dot">●</span>
          <span className="cm2-live-label">COOKING</span>
          <span className="cm2-mast-title">{recipe.title}</span>
        </div>
        <div className="cm2-mast-right">
          <span className="cm2-step-of">STEP {Math.min(current + 1, stepList.length)} OF {stepList.length}</span>
          <button type="button" className="cm2-finish-btn" onClick={handleFinish}>Finish</button>
        </div>
      </div>

      {/* Main area: method + ingredients */}
      <div className="cm2-body">
        <div className="cm2-method">
          {stepList.map((s, i) => {
            const isCurrent = i === current;
            const isDone = statusOf(i) === "done";
            const isUpcoming = i > current;
            const dur = s.timer_seconds;
            const t = timerFor(i);
            const tagLabel = s.tag ? TAG_LABEL[s.tag] : null;
            const stepIngs = ingsForStep(i);

            return (
              <div
                key={i}
                ref={isCurrent ? currentRef : null}
                className={`cm2-step${isCurrent ? " is-current" : ""}${isDone ? " is-done" : ""}${isUpcoming ? " is-upcoming" : ""}`}
              >
                <div className="cm2-step-head">
                  <span className="cm2-step-num">{i + 1}</span>
                  <div className="cm2-step-meta">
                    {tagLabel && <span className="cm2-step-tag">{tagLabel}</span>}
                    {dur && <span className="cm2-step-dur">{fmtDur(dur)}</span>}
                    {isDone && <span className="cm2-step-done-mark">Done</span>}
                    {t && !t.done && <span className="cm2-step-inline-timer">{fmtClock(t.remaining)}</span>}
                    {t && t.done && <span className="cm2-step-timer-done">Timer done</span>}
                  </div>
                </div>
                <p className="cm2-step-text">{s.text}</p>

                {/* Per-step ingredients (if linkage exists) */}
                {isCurrent && stepIngs.length > 0 && (
                  <div className="cm2-step-ings">
                    {stepIngs.map(({ ing, idx }) => (
                      <span key={idx} className="cm2-step-ing">{ingLabel(ing, items)}</span>
                    ))}
                  </div>
                )}

                {/* Controls — only on current step */}
                {isCurrent && (
                  <div className="cm2-step-actions">
                    {current > 0 && (
                      <button type="button" className="cm2-go-back" onClick={handleGoBack}>‹ Back</button>
                    )}
                    {dur && !t && (
                      <button type="button" className="cm2-start-timer" onClick={() => cook.startTimer(i, dur)}>
                        START {fmtDur(dur)} TIMER
                      </button>
                    )}
                    <button type="button" className="cm2-mark-done" onClick={() => handleMarkDone(i)}>
                      MARK DONE →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ingredients rail */}
        <div className="cm2-ings">
          <div className="cm2-ings-head">
            <span className="cm2-ings-title">INGREDIENTS</span>
            <span className="cm2-ings-count">{tickedCount} of {ingList.length}</span>
          </div>
          <ul className="cm2-ings-list">
            {ingList.map((ing, i) => {
              const ticked = tickedIngredients.has(String(i));
              const highlight = ing.step_position === current;
              return (
                <li key={i} className={`cm2-ing${ticked ? " is-ticked" : ""}${highlight ? " is-highlight" : ""}`}>
                  <button type="button" className="cm2-ing-btn" onClick={() => cook.tickIngredient(i)}>
                    <span className="cm2-ing-check">{ticked ? "■" : "□"}</span>
                    <span className="cm2-ing-text">{ingLabel(ing, items)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Timer strip */}
      {timers.length > 0 && (
        <div className="cm2-timers">
          {timers.map((t) => {
            const stepNum = parseInt(t.targetRef, 10);
            const stepName = stepList[stepNum]?.text?.split(/\s+/).slice(0, 4).join(" ") || "";
            return (
              <div key={t.targetRef} className={t.done ? "cm2-chip is-done" : "cm2-chip"}>
                <span className="cm2-chip-label">STEP {stepNum + 1} · {stepName}</span>
                <span className="cm2-chip-time">{t.done ? "done" : fmtClock(t.remaining)}</span>
                {!t.done && (
                  <button type="button" className="cm2-chip-stop" onClick={() => cook.stopTimer(stepNum)}>STOP</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
