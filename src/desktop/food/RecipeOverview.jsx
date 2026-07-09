import { useState } from "react";
import { assignLanes } from "../../spine/logic/cookLanes";
import { cookSchedule } from "../../spine/logic/cookSchedule";
import "./cookOverview.css";

// RecipeOverview — the "Recipe" mode: servings stepper (scales ingredient
// amounts proportionally), tickable ingredient list (flat), numbered method,
// at-a-glance timing strip, and "Log this cook" trigger.

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

function fmtDur(secs) {
  if (secs == null || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h${String(m % 60).padStart(2, "0")}`; }
  return `${m} min`;
}

export default function RecipeOverview({ recipe, ingredients, steps, tickedSet, onTick, onLogRequest }) {
  const [localTicked, setLocalTicked] = useState(new Set());
  const ticked = tickedSet || localTicked;
  const toggleTick = (i) => {
    if (onTick) { onTick(i); return; }
    setLocalTicked((s) => { const n = new Set(s); n.has(String(i)) ? n.delete(String(i)) : n.add(String(i)); return n; });
  };
  const tickedCount = ingredients.filter((_, i) => ticked.has(String(i))).length;

  // Servings stepper — scales displayed ingredient amounts
  const baseServ = recipe.servings || 1;
  const [cookServings, setCookServings] = useState(baseServ);
  const scale = cookServings / baseServ;

  // Scheduler: compute parallel lanes + critical-path timing from depends_on + durations.
  // Sequential fallback: when no deps exist, everything in one lane (the old strip look).
  const hasDeps = steps.some((s) => Array.isArray(s.depends_on) && s.depends_on.length > 0);
  const { lanes: rawLanes, laneCount: rawLaneCount } = assignLanes(steps); // mergeSteps available if needed
  const laneCount = hasDeps ? rawLaneCount : 1;
  const lanes = hasDeps ? rawLanes : steps.map(() => 0);
  const { schedule, finish } = cookSchedule(steps.map((s) => ({ durationSeconds: s.timer_seconds || 0, deps: s.depends_on })));
  const hasTimingData = finish > 0;

  return (
    <div className="cc-ov">
      <div className="cc-ov-summary">
        <div className="cc-ov-serv-row">
          <button type="button" className="cc-ov-serv-btn" onClick={() => setCookServings((s) => Math.max(1, s - 1))}>−</button>
          <span className="cc-ov-serves tnum">{cookServings}</span>
          <button type="button" className="cc-ov-serv-btn" onClick={() => setCookServings((s) => s + 1)}>+</button>
          <span className="cc-ov-serv-label">serving{cookServings === 1 ? "" : "s"}</span>
          {scale !== 1 && <span className="cc-ov-scaled">scaled from {baseServ}</span>}
        </div>
        {hasTimingData && <span className="cc-ov-time tnum">{fmtDur(finish)} total</span>}
      </div>

      {hasTimingData && (
        <div className="cc-strip">
          {Array.from({ length: laneCount }, (_, lane) => (
            <div key={lane} className="cc-strip-lane">
              {schedule.filter((e) => lanes[e.index] === lane && e.duration > 0).map((e) => {
                const step = steps[e.index];
                const left = (e.startOffset / finish) * 100;
                const width = (e.duration / finish) * 100;
                const isPassive = step.tag === "hands_free";
                return (
                  <div key={e.index}
                    className={`cc-strip-bar${isPassive ? " is-passive" : ""}`}
                    style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                    title={`${e.index + 1}. ${(step.text || "").split(/\s+/).slice(0, 5).join(" ")} — ${fmtDur(e.duration)}`}>
                    <span className="cc-strip-num tnum">{e.index + 1}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="cc-ov-body">
        <div className="cc-ov-col">
          <div className="cc-ov-label">
            Ingredients
            <span className="cc-ov-count tnum">{tickedCount} of {ingredients.length}</span>
          </div>
          <ul className="cc-ov-ings">
            {ingredients.map((ing, i) => {
              const done = ticked.has(String(i));
              return (
                <li key={i} className={`cc-ov-ing${done ? " is-ticked" : ""}`}>
                  <button type="button" className="cc-ov-ing-btn" onClick={() => toggleTick(i)}>
                    <span className="cc-ov-check">{done ? "■" : "□"}</span>
                    <span className="cc-ov-ing-text">{ing.raw_text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {onLogRequest && (
            <button type="button" className="cc-ov-log" onClick={() => onLogRequest(cookServings)}>
              Log this cook
            </button>
          )}
        </div>

        <div className="cc-ov-col cc-ov-col--method">
          <div className="cc-ov-label">Method</div>
          <ol className="cc-ov-method">
            {steps.map((s, i) => {
              const tag = s.tag ? TAG_LABEL[s.tag] : null;
              const dur = fmtDur(s.timer_seconds);
              return (
                <li key={i} className="cc-ov-step">
                  <div className="cc-ov-step-head">
                    <span className="cc-ov-step-num tnum">{i + 1}</span>
                    {tag && <span className="cc-ov-step-tag">{tag}</span>}
                    {dur && <span className="cc-ov-step-dur tnum">{dur}</span>}
                  </div>
                  <p className="cc-ov-step-text">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
