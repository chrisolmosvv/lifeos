import { useEffect, useMemo, useState } from "react";
import { boxScore } from "../../spine/logic/gymCalc";
import { comboSeries, exerciseComboSeries, exerciseRanking } from "../../spine/logic/gymProgress";
import { formatVolume } from "../../spine/logic/gymFormat";
import { ROUTINES, routineWorkouts } from "../../spine/logic/gymRoutine";
import GymComboChart from "./GymComboChart";
import GymExerciseGrid from "./GymExerciseGrid";

// LifeOS — Gym V2 (Piece 12): Training Progress, rebuilt as a three-screen drill-down INSIDE
// this one component (all view-state is local — nothing lifts to Health.jsx):
//   Screen 1 CHART   — the routine's volume+reps combo chart; hovering reveals a "More →".
//   Screen 2 GRID    — the routine's top-6 exercises, ranked by a Volume/Reps toggle.
//   Screen 3 DETAIL  — one exercise's own combo chart (same treatment as Screen 1).
// The routine tabs stay on top at every screen; SWITCHING the routine returns to Screen 1 for
// that routine (a local effect on the shared `routine` prop — Consistency/Balance are untouched).
// The quiet footer keeps the workout HISTORY + RECORDS pages reachable (they used to hang off
// the old "more ›"/"records ›" links; the drill-down replaced those, so we keep a discreet path).

export default function GymTraining({ built, routine, onRoutine, windowStart, windowEnd, days, nowForWindow, onMore, onRecords }) {
  const [screen, setScreen] = useState("chart"); // 'chart' | 'grid' | 'detail'
  const [metric, setMetric] = useState("volume"); // grid sort
  const [picked, setPicked] = useState(null); // { key, name } for the detail screen

  // Switching the routine tab always returns to Screen 1 for the newly selected routine.
  useEffect(() => { setScreen("chart"); setPicked(null); }, [routine]);

  const wk = useMemo(() => routineWorkouts(built || [], routine), [built, routine]);
  const box = useMemo(() => boxScore(wk, days, nowForWindow), [wk, days, nowForWindow]);
  const win = { start: windowStart, end: windowEnd };
  const series = useMemo(() => comboSeries(wk, win), [wk, windowStart, windowEnd]);
  const ranking = useMemo(() => exerciseRanking(wk, { ...win, metric }), [wk, windowStart, windowEnd, metric]);
  const detail = useMemo(
    () => (picked ? exerciseComboSeries(wk, picked.key, win) : []),
    [wk, picked, windowStart, windowEnd],
  );
  const vol = formatVolume(box?.volume);

  const openDetail = (row) => { setPicked({ key: row.key, name: row.name }); setScreen("detail"); };

  return (
    <section className="gym-zone gym-training">
      <div className="gym-tabs" role="tablist" aria-label="Routine">
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

      {screen === "chart" && (
        <>
          <div className="gym-over-stats">
            <span><b>{box?.sessions ?? 0}</b> sessions</span>
            <span><b>{vol.num}</b> kg</span>
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
          <nav className="gym-trail">
            <button type="button" onClick={() => setScreen("chart")}>‹ Chart</button>
          </nav>
          <GymExerciseGrid rows={ranking} metric={metric} onMetric={setMetric} onPick={openDetail} />
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
          <GymComboChart points={detail} windowStart={windowStart} windowEnd={windowEnd} label="exercise" />
        </>
      )}
    </section>
  );
}
