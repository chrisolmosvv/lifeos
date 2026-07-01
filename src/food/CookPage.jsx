import { useEffect, useMemo, useState } from "react";
import { parseDuration, fmtClock } from "./cookTimers";
import { cookSchedule } from "./cookSchedule";
import { useWakeLock } from "./useWakeLock";
import { useCookSession } from "./useCookSession";
import KanbanBoard from "./KanbanBoard";
import TimerRing from "./TimerRing";
import "./cookmode.css";

// CookPage (V2 P7) — the marquee cook page. A KANBAN board (waiting/active/done + start-now cues from
// the schedule) across the top; a BALANCED layout below — tickable ingredients left, steps right, both
// open. Progress PERSISTS via useCookSession (struck via board 'done', ticked, timers by END-timestamp
// — resume-a-cook). The SCHEDULE is compute-on-read (cookSchedule over parsed durations; SEQUENTIAL
// since the parse gives no deps — no fabricated overlaps). Reuses parseDuration/useWakeLock/TimerRing.
// "Done cooking" → status='done' + fires the bridge trigger (the staging sheet is P8). Never auto-advances.
export default function CookPage({ recipe, steps, ingredients, onExit }) {
  const { state, ready, update } = useCookSession(recipe.id);
  const [manualMin, setManualMin] = useState("5");
  const [now, setNow] = useState(Date.now());
  const wake = useWakeLock(true);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const schedule = useMemo(() => cookSchedule((steps || []).map((s, i) => ({ index: i, durationSeconds: parseDuration(s.text) }))).schedule, [steps]);

  if (!ready) return <div className="food-loading"><span className="food-spinner" aria-hidden="true" /><span>Resuming your cook…</span></div>;

  const board = state.board || {};
  const stateOf = (i) => board[i] || "waiting";
  const cycle = (i) => {
    const next = stateOf(i) === "waiting" ? "active" : stateOf(i) === "active" ? "done" : "waiting";
    const nb = { ...board, [i]: next };
    const struck = (steps || []).map((_, j) => (nb[j] === "done" ? j : null)).filter((j) => j != null);
    update({ board: nb, struck });
  };
  const isTicked = (i) => state.ticked.includes(i);
  const toggleTick = (i) => update({ ticked: isTicked(i) ? state.ticked.filter((x) => x !== i) : [...state.ticked, i] });
  const remainingOf = (t) => Math.max(0, Math.round((t.end - now) / 1000));
  const running = state.timers.filter((t) => remainingOf(t) > 0);
  const addTimer = (label, secs) => update({ timers: [...state.timers, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, label, total: secs, end: Date.now() + secs * 1000 }] });
  const dismiss = (id) => update({ timers: state.timers.filter((t) => t.id !== id) });
  const doneCooking = () => { update({ status: "done" }); onExit(true); }; // P8 seam: fires the staging trigger

  return (
    <div className="cp">
      <div className="cm-bar">
        <button type="button" className="cm-exit" onClick={doneCooking}>‹ Done cooking</button>
        <span className={wake === "on" ? "cm-wake is-on" : "cm-wake"}>
          {wake === "on" ? "● screen staying on" : wake === "unsupported" ? "keep your screen on" : "screen lock off"}
        </span>
      </div>
      <h1 className="cm-title">{recipe.title}</h1>

      <KanbanBoard steps={steps} schedule={schedule} board={board} onCycle={cycle} />

      <div className="cp-cols">
        <div className="cp-ings">
          <h3 className="cp-h">Ingredients</h3>
          <ul className="cp-ing-list">
            {(ingredients || []).map((ing, i) => (
              <li key={i}>
                <button type="button" className={isTicked(i) ? "cm-ing-tick is-on" : "cm-ing-tick"} onClick={() => toggleTick(i)}>
                  <span className="cm-tick-box">{isTicked(i) ? "☑" : "☐"}</span> {ing.raw_text || "ingredient"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="cp-steps-col">
          <h3 className="cp-h">Steps</h3>
          <ol className="cm-steps">
            {(steps || []).map((s, i) => {
              const secs = parseDuration(s.text);
              return (
                <li key={i} className={stateOf(i) === "done" ? "cm-step is-done" : "cm-step"}>
                  <button type="button" className="cm-step-text" onClick={() => cycle(i)}>
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
        </div>
      </div>

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
