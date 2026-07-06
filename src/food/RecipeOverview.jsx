import { useState } from "react";
import "./cookOverview.css";

// RecipeOverview — the "Recipe" mode: tickable ingredient list (flat),
// servings display, numbered method, and an at-a-glance timing strip.
// Step 2: static render (tick state is local, servings are read-only).

const TAG_LABEL = { hands_on: "Hands-on", hands_free: "Hands-free", active_heat: "Active heat" };

function fmtDur(secs) {
  if (secs == null || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h${String(m % 60).padStart(2, "0")}`; }
  return `${m} min`;
}

export default function RecipeOverview({ recipe, ingredients, steps, tickedSet, onTick }) {
  // Local tick state for step 2 (replaced by event-sourced state in step 4)
  const [localTicked, setLocalTicked] = useState(new Set());
  const ticked = tickedSet || localTicked;
  const toggleTick = (i) => {
    if (onTick) { onTick(i); return; }
    setLocalTicked((s) => { const n = new Set(s); n.has(String(i)) ? n.delete(String(i)) : n.add(String(i)); return n; });
  };
  const tickedCount = ingredients.filter((_, i) => ticked.has(String(i))).length;

  // Timing strip: sequential bars proportional to duration
  const totalSec = steps.reduce((sum, s) => sum + (s.timer_seconds || 0), 0);
  const hasTimingData = totalSec > 0;

  return (
    <div className="cc-ov">
      {/* ── Servings + summary ──────────────────────────────────────────────── */}
      <div className="cc-ov-summary">
        <span className="cc-ov-serves">
          Serves {recipe.servings || "–"}
        </span>
        {hasTimingData && (
          <span className="cc-ov-time tnum">{fmtDur(totalSec)} total</span>
        )}
      </div>

      {/* ── At-a-glance timing strip ────────────────────────────────────────── */}
      {hasTimingData && (
        <div className="cc-strip">
          {steps.map((s, i) => {
            const dur = s.timer_seconds || 0;
            if (dur <= 0) return null;
            const pct = (dur / totalSec) * 100;
            const isPassive = s.tag === "hands_free";
            return (
              <div
                key={i}
                className={`cc-strip-bar${isPassive ? " is-passive" : ""}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
                title={`${i + 1}. ${(s.text || "").split(/\s+/).slice(0, 5).join(" ")} — ${fmtDur(dur)}`}
              >
                <span className="cc-strip-num tnum">{i + 1}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Two-column body: ingredients + method ───────────────────────────── */}
      <div className="cc-ov-body">
        {/* Ingredients */}
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
        </div>

        {/* Method */}
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
