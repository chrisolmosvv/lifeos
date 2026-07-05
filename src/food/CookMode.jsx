import { useCookEvents } from "./useCookEvents";
import { useWakeLock } from "./useWakeLock";
import { fmtClock } from "./cookTimers";
import "./cookMode2.css";

// CookMode — the event-sourced cooking companion (variation C). Two columns: method accordion
// (left, wide) + ingredients rail (right, narrow). Live timer strip at the bottom. All state
// derived from the proven replay engine via useCookEvents. Resume is free.

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

function fmtDur(secs) {
  if (secs == null || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h${String(m % 60).padStart(2, "0")}`; }
  return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

export default function CookMode({ recipe, steps, ingredients, onExit }) {
  const cook = useCookEvents(recipe.id);
  useWakeLock(true);

  if (!cook.ready) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Loading your cook…</span></div>;

  const { stepStates, tickedIngredients, timers, finished } = cook.state;
  const stepList = steps || [];
  const ingList = ingredients || [];

  // Derive current step index: first step that isn't 'done'
  const statusOf = (i) => stepStates[String(i)] || "waiting";
  const currentIdx = stepList.findIndex((_, i) => statusOf(i) !== "done");
  const current = currentIdx >= 0 ? currentIdx : stepList.length; // all done → past end
  const tickedCount = ingList.filter((_, i) => tickedIngredients.has(String(i))).length;

  // Timer lookup by step index
  const timerFor = (i) => timers.find((t) => t.targetRef === String(i));

  const handleMarkDone = (i) => {
    cook.markStep(i, "done");
  };

  const handleFinish = () => {
    cook.finish();
    onExit(false); // no auto-log
  };

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
          {/* Done steps — collapsed summaries */}
          {stepList.map((s, i) => {
            if (i >= current) return null;
            const t = timerFor(i);
            return (
              <div key={i} className="cm2-done-step">
                <span className="cm2-done-num">{i + 1}.</span>
                <span className="cm2-done-text">{(s.text || "").slice(0, 60)}{(s.text || "").length > 60 ? "…" : ""}</span>
                {t && !t.done && <span className="cm2-done-timer">{fmtClock(t.remaining)}</span>}
                {t && t.done && <span className="cm2-done-timer-done">done</span>}
              </div>
            );
          })}

          {/* Current step — full size */}
          {current < stepList.length && (() => {
            const s = stepList[current];
            const dur = s.timer_seconds;
            const t = timerFor(current);
            const tagLabel = s.tag ? TAG_LABEL[s.tag] : null;
            return (
              <div className="cm2-current">
                <div className="cm2-current-head">
                  <span className="cm2-current-num">{current + 1}</span>
                  <div className="cm2-current-meta">
                    {tagLabel && <span className="cm2-current-tag">{tagLabel}</span>}
                    {dur && <span className="cm2-current-dur">{fmtDur(dur)}</span>}
                  </div>
                </div>
                <p className="cm2-current-text">{s.text}</p>
                <div className="cm2-current-actions">
                  {dur && !t && (
                    <button type="button" className="cm2-start-timer" onClick={() => cook.startTimer(current, dur)}>
                      START {fmtDur(dur)} TIMER
                    </button>
                  )}
                  {t && !t.done && (
                    <span className="cm2-timer-running">{fmtClock(t.remaining)}</span>
                  )}
                  {t && t.done && (
                    <span className="cm2-timer-nudge">Timer done</span>
                  )}
                  <button type="button" className="cm2-mark-done" onClick={() => handleMarkDone(current)}>
                    MARK DONE →
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Next step — preview */}
          {current + 1 < stepList.length && (() => {
            const s = stepList[current + 1];
            return (
              <div className="cm2-next">
                <span className="cm2-next-num">{current + 2}</span>
                <p className="cm2-next-text">{s.text}</p>
              </div>
            );
          })()}
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
              return (
                <li key={i} className={ticked ? "cm2-ing is-ticked" : "cm2-ing"}>
                  <button type="button" className="cm2-ing-btn" onClick={() => cook.tickIngredient(i)}>
                    <span className="cm2-ing-check">{ticked ? "■" : "□"}</span>
                    <span className="cm2-ing-text">{ing.raw_text || "ingredient"}</span>
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
