import { useEffect, useMemo, useState } from "react";
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

export default function GymTraining({ built, routine, onRoutine, windowStart, windowEnd, onMore, onRecords }) {
  const [screen, setScreen] = useState("chart"); // 'chart' | 'grid' | 'detail'
  const [metric, setMetric] = useState("volume"); // grid sort
  const [picked, setPicked] = useState(null); // { key, name } for the detail screen

  // Switching the routine tab always returns to Screen 1 for the newly selected routine.
  useEffect(() => { setScreen("chart"); setPicked(null); }, [routine]);

  const wk = useMemo(() => routineWorkouts(built || [], routine), [built, routine]);
  const win = { start: windowStart, end: windowEnd };
  const totals = useMemo(() => periodTotals(wk, win), [wk, windowStart, windowEnd]);
  const series = useMemo(() => comboSeries(wk, win), [wk, windowStart, windowEnd]);
  const ranking = useMemo(() => exerciseRanking(wk, { ...win, metric }), [wk, windowStart, windowEnd, metric]);
  const detail = useMemo(
    () => (picked ? exerciseDetailSeries(wk, picked.key, win) : []),
    [wk, picked, windowStart, windowEnd],
  );
  const vol = formatVolume(totals.volume);
  const n = (v) => v.toLocaleString("en-GB");

  const openDetail = (row) => { setPicked({ key: row.key, name: row.name }); setScreen("detail"); };

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
              <button type="button" className="gym-more-hint" onClick={() => setScreen("grid")}>More →</button>
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
              <button type="button" className="gym-trail-back" onClick={() => setScreen("chart")}>‹ Chart</button>
              <span className="gym-kicker">Top exercises</span>
            </div>
            <div className="gym-grid-head-z gym-grid-head-r">
              <RoutineTabs routine={routine} onRoutine={onRoutine} small />
              <MetricToggle metric={metric} onMetric={setMetric} />
            </div>
          </div>
          <GymExerciseGrid rows={ranking} onPick={openDetail} />
        </>
      )}

      {screen === "detail" && (
        <>
          <nav className="gym-trail">
            <button type="button" onClick={() => setScreen("chart")}>Chart</button>
            <span className="gym-trail-sep">/</span>
            <button type="button" onClick={() => setScreen("grid")}>Top exercises</button>
            <span className="gym-trail-sep">/</span>
            <span className="gym-trail-here">{picked?.name}</span>
          </nav>
          <GymExerciseChart points={detail} windowStart={windowStart} windowEnd={windowEnd} />
        </>
      )}
    </section>
  );
}
