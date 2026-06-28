import { useEffect, useState } from "react";
import { parseDuration, fmtClock } from "./cookTimers";
import { useWakeLock } from "./useWakeLock";
import "./cookmode.css";

// CookMode — cooking mode is a REFLOW (a toggle, not a route): bigger steps, ingredients
// collapsed but reachable, timers active. Step timers auto-detected from the step text (lower-end
// on ranges) + a FREE MANUAL timer; all run CONCURRENTLY in a floating summary. Tap a step to mark
// it done (struck). Wake Lock keeps the screen on (graceful fallback note if unsupported). Cook
// progress is EPHEMERAL — it lives in this component's state and resets on exit/reload (no DB).
export default function CookMode({ recipe, steps, ingredients, onExit }) {
  const [done, setDone] = useState({}); // step index → true
  const [timers, setTimers] = useState([]); // { id, label, total, remaining, running }
  const [showIngredients, setShowIngredients] = useState(false);
  const [manualMin, setManualMin] = useState("5");
  const wake = useWakeLock(true);

  // One ticker drives every running timer (concurrent).
  useEffect(() => {
    const id = setInterval(() => {
      setTimers((ts) => ts.map((t) => (t.running && t.remaining > 0 ? { ...t, remaining: t.remaining - 1 } : t)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const addTimer = (label, secs) => setTimers((ts) => [...ts, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, label, total: secs, remaining: secs, running: true }]);
  const dismiss = (id) => setTimers((ts) => ts.filter((t) => t.id !== id));
  const running = timers.filter((t) => t.remaining > 0);

  return (
    <div className="cm">
      <div className="cm-bar">
        <button type="button" className="cm-exit" onClick={onExit}>‹ Done cooking</button>
        <span className={wake === "on" ? "cm-wake is-on" : "cm-wake"}>
          {wake === "on" ? "● screen staying on" : wake === "unsupported" ? "keep your screen on" : "screen lock off"}
        </span>
      </div>

      <h1 className="cm-title">{recipe.title}</h1>

      <button type="button" className="cm-ing-toggle" onClick={() => setShowIngredients((s) => !s)}>
        {showIngredients ? "Hide" : "Show"} ingredients ({ingredients?.length || 0})
      </button>
      {showIngredients && (
        <ul className="cm-ings">
          {(ingredients || []).map((ing, i) => (
            <li key={i}>{ing.raw_text || "ingredient"}</li>
          ))}
        </ul>
      )}

      <ol className="cm-steps">
        {steps.map((s, i) => {
          const secs = parseDuration(s.text);
          return (
            <li key={i} className={done[i] ? "cm-step is-done" : "cm-step"}>
              <button type="button" className="cm-step-text" onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}>
                <span className="cm-step-n">{i + 1}</span>
                <span>{s.text}</span>
              </button>
              {secs != null && (
                <button type="button" className="cm-step-timer" onClick={() => addTimer(`Step ${i + 1}`, secs)}>
                  ⏱ {fmtClock(secs)}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="cm-manual">
        <span>Manual timer</span>
        <input type="number" min="1" value={manualMin} onChange={(e) => setManualMin(e.target.value)} /> min
        <button type="button" onClick={() => Number(manualMin) > 0 && addTimer("Timer", Math.round(Number(manualMin) * 60))}>Start</button>
      </div>

      {running.length > 0 && (
        <div className="cm-summary">
          {running.map((t) => (
            <div key={t.id} className="cm-timer">
              <TimerRing remaining={t.remaining} total={t.total} />
              <span className="cm-timer-label">{t.label}</span>
              <span className="cm-timer-clock">{fmtClock(t.remaining)}</span>
              <button type="button" className="cm-timer-x" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A thin countdown ring — the dashoffset steps each second (a CSS transition smooths it).
function TimerRing({ remaining, total }) {
  const R = 11;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? remaining / total : 0;
  const done = remaining <= 0;
  return (
    <svg className={done ? "cm-ring is-done" : "cm-ring"} viewBox="0 0 28 28" width="28" height="28">
      <circle className="cm-ring-track" cx="14" cy="14" r={R} />
      <circle className="cm-ring-arc" cx="14" cy="14" r={R} style={{ strokeDasharray: C, strokeDashoffset: C * (1 - frac) }} />
    </svg>
  );
}
