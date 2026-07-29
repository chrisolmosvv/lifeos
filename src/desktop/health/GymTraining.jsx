import { useEffect, useMemo, useRef } from "react";
import { periodTotals, comboSeries, exerciseDetailSeries, exerciseRanking } from "../../spine/logic/gymProgress";
import { formatVolume } from "../../spine/logic/gymFormat";
import { ROUTINES, routineWorkouts } from "../../spine/logic/gymRoutine";
import GymComboChart from "./GymComboChart";
import GymExerciseChart from "./GymExerciseChart";
import GymExerciseGrid from "./GymExerciseGrid";

// LifeOS — Gym V2 (Piece 12; Piece 14 tweaks): Training Progress, a three-screen drill-down INSIDE
// this one component (all view-state is local — nothing lifts to Health.jsx):
//   Screen 1 CHART   — the routine's volume+reps combo chart; the stat row reads KG · SETS · REPS
//                      for the selected period (Piece 14: session count dropped). Hover → "More →".
//   Screen 2 GRID    — the routine's top-6 exercises. Piece 14: the back-link, title, routine tabs
//                      and Volume/Reps toggle collapse into ONE two-zone header (context | controls).
//   Screen 3 DETAIL  — one exercise's own combo chart (same treatment as Screen 1).
// Switching the routine returns to Screen 1 for that routine (a local effect on the shared `routine`
// prop). The quiet footer keeps the workout HISTORY + RECORDS pages reachable.

const METRICS = [
  { id: "volume", label: "Volume" },
  { id: "reps", label: "Reps" },
];

function RoutineTabs({ routine, onRoutine, small }) {
  return (
    <div className={small ? "gym-tabs gym-tabs--sm" : "gym-tabs"} role="tablist" aria-label="Routine">
      {ROUTINES.map((r) => (
        <button
          key={r.id}
          type="button"
          role="tab"
          aria-selected={r.id === routine}
          className={r.id === routine ? "gym-tab is-active" : "gym-tab"}
          onClick={() => onRoutine(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function MetricToggle({ metric, onMetric }) {
  return (
    <div className="gym-tabs gym-tabs--sm" role="tablist" aria-label="Rank exercises by">
      {METRICS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={m.id === metric}
          className={m.id === metric ? "gym-tab is-active" : "gym-tab"}
          onClick={() => onMetric(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// Piece 18: screen / picked / metric are LIFTED to Health.jsx (controlled here) so they survive the
// parent's window-change remount — switching the routine tab or the time window no longer snaps back to
// Screen 1. State-shape: screen 'chart'|'grid'|'detail', picked { key, name }|null, metric 'volume'|'reps'.
export default function GymTraining({
  built, routine, onRoutine, windowStart, windowEnd,
  screen, onScreen, picked, onPicked, metric, onMetric, onMore, onRecords,
}) {
  const wk = useMemo(() => routineWorkouts(built || [], routine), [built, routine]);
  const win = { start: windowStart, end: windowEnd };
  const totals = useMemo(() => periodTotals(wk, win), [wk, windowStart, windowEnd]);
  const series = useMemo(() => comboSeries(wk, win), [wk, windowStart, windowEnd]);
  const ranking = useMemo(() => exerciseRanking(wk, { ...win, metric }), [wk, windowStart, windowEnd, metric]);
  const detail = useMemo(
    () => (picked ? exerciseDetailSeries(wk, picked.key, win) : []),
    [wk, picked, windowStart, windowEnd],
  );

  // Screen-3 fallback: when the routine tab changes to one where the picked exercise has NO data,
  // drop to the grid rather than showing an empty detail chart. Only fires on an actual routine
  // switch (the ref guards against the window-remount / metric / screen re-renders).
  const prevRoutine = useRef(routine);
  useEffect(() => {
    const routineChanged = prevRoutine.current !== routine;
    prevRoutine.current = routine;
    if (routineChanged && screen === "detail" && picked && detail.length === 0) onScreen("grid");
  }, [routine, detail, screen, picked, onScreen]);

  const vol = formatVolume(totals.volume);
  const n = (v) => v.toLocaleString("en-GB");

  const openDetail = (row) => { onPicked({ key: row.key, name: row.name }); onScreen("detail"); };

  return (
    <section className="gym-zone gym-training">
      {screen !== "grid" && <RoutineTabs routine={routine} onRoutine={onRoutine} />}

      {screen === "chart" && (
        <>
          <div className="gym-over-stats">
            <span><b>{vol.num}</b> kg</span>
            <span><b>{n(totals.sets)}</b> sets</span>
            <span><b>{n(totals.reps)}</b> reps</span>
          </div>
          <div className="gym-combo-wrap">
            <GymComboChart points={series} windowStart={windowStart} windowEnd={windowEnd} />
            {series.length > 0 && (
              <button type="button" className="gym-more-hint" onClick={() => onScreen("grid")}>More →</button>
            )}
          </div>
          <div className="gym-quiet-links">
            <button type="button" onClick={onMore}>history ›</button>
            <button type="button" onClick={onRecords}>records ›</button>
          </div>
        </>
      )}

      {screen === "grid" && (
        <>
          <div className="gym-grid-head">
            <div className="gym-grid-head-z gym-grid-head-l">
              <button type="button" className="gym-trail-back" onClick={() => onScreen("chart")}>‹ Chart</button>
              <span className="gym-kicker">Top exercises</span>
            </div>
            <div className="gym-grid-head-z gym-grid-head-r">
              <RoutineTabs routine={routine} onRoutine={onRoutine} small />
              <MetricToggle metric={metric} onMetric={onMetric} />
            </div>
          </div>
          <GymExerciseGrid rows={ranking} onPick={openDetail} />
        </>
      )}

      {screen === "detail" && (
        <>
          <nav className="gym-trail">
            <button type="button" onClick={() => onScreen("chart")}>Chart</button>
            <span className="gym-trail-sep">/</span>
            <button type="button" onClick={() => onScreen("grid")}>Top exercises</button>
            <span className="gym-trail-sep">/</span>
            <span className="gym-trail-here">{picked?.name}</span>
          </nav>
          <GymExerciseChart points={detail} windowStart={windowStart} windowEnd={windowEnd} />
        </>
      )}
    </section>
  );
}
