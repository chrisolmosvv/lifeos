import { useEffect, useState } from "react";
import { parseDuration, fmtClock } from "./cookTimers";
import { useWakeLock } from "./useWakeLock";
import { useCookSession } from "./useCookSession";
import "./cookmode.css";

// CookMode — cooking mode (a REFLOW). V2 P7 (a): cook progress now PERSISTS via cook_session (resume-a-
// cook) — struck steps, ticked ingredients, and running timers survive exit/reload. Timers store an
// ABSOLUTE END timestamp, so a countdown resumes from where it really is (not reset). Step timers are
// parsed from the step text (lower-end on ranges) + a free manual timer, all concurrent. Wake Lock
// keeps the screen on. (This is the interim surface proving persistence; the kanban marquee/layout is
// P7 (c)(d) on the SAME useCookSession hook.)
export default function CookMode({ recipe, steps, ingredients, onExit }) {
  const { state, ready, update } = useCookSession(recipe.id);
  const [showIngredients, setShowIngredients] = useState(false);
  const [manualMin, setManualMin] = useState("5");
  const [now, setNow] = useState(Date.now());
  const wake = useWakeLock(true);

  // One ticker re-renders every second; remaining is computed from each timer's absolute end.
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  if (!ready) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Resuming your cook…</span></div>;

  const isStruck = (i) => state.struck.includes(i);
  const toggleStep = (i) => update({ struck: isStruck(i) ? state.struck.filter((x) => x !== i) : [...state.struck, i] });
  const isTicked = (i) => state.ticked.includes(i);
  const toggleTick = (i) => update({ ticked: isTicked(i) ? state.ticked.filter((x) => x !== i) : [...state.ticked, i] });
  const remainingOf = (t) => Math.max(0, Math.round((t.end - now) / 1000));
  const running = state.timers.filter((t) => remainingOf(t) > 0);
  const addTimer = (label, secs) => update({ timers: [...state.timers, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, label, total: secs, end: Date.now() + secs * 1000 }] });
  const dismiss = (id) => update({ timers: state.timers.filter((t) => t.id !== id) });

  return (
    <div className="cm">
      <div className="cm-bar">
        <button type="button" className="cm-exit" onClick={() => onExit(true)}>‹ Done cooking</button>
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
            <li key={i}>
              <button type="button" className={isTicked(i) ? "cm-ing-tick is-on" : "cm-ing-tick"} onClick={() => toggleTick(i)}>
                <span className="cm-tick-box">{isTicked(i) ? "☑" : "☐"}</span> {ing.raw_text || "ingredient"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ol className="cm-steps">
        {steps.map((s, i) => {
          const secs = parseDuration(s.text);
          return (
            <li key={i} className={isStruck(i) ? "cm-step is-done" : "cm-step"}>
              <button type="button" className="cm-step-text" onClick={() => toggleStep(i)}>
                <span className="cm-step-n">{i + 1}</span>
                <span>{s.text}</span>
              </button>
              {secs != null && (
                <button type="button" className="cm-step-timer" onClick={() => addTimer(`Step ${i + 1}`, secs)}>⏱ {fmtClock(secs)}</button>
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
              <TimerRing remaining={remainingOf(t)} total={t.total} />
              <span className="cm-timer-label">{t.label}</span>
              <span className="cm-timer-clock">{fmtClock(remainingOf(t))}</span>
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
