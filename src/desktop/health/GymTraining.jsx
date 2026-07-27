import { useMemo } from "react";
import { boxScore } from "../../spine/logic/gymCalc";
import { routineVolumeSeries } from "../../spine/logic/gymTrend";
import { recentSessions } from "../../spine/logic/gymSessions";
import { formatVolume } from "../../spine/logic/gymFormat";
import { ROUTINES, routineWorkouts, liftTable, classifyRoutine } from "../../spine/logic/gymRoutine";
import GymLiftTable from "./GymLiftTable";
import GymVolChart from "./GymVolChart";

// LifeOS — Gym V2 (Piece 3 + Piece 6): the Training Progress zone, TABBED by routine (Push /
// Pull / Legs / Other). Selecting a tab shows THAT routine's own volume chart (scoped to that
// routine only — Push volume is never mixed with Legs) + a per-lift table with window deltas.
// Piece 6: the bare trend line became a charted GymVolChart (gridlines, smoothed line bounded
// to real data, terracotta PR dots reusing Consistency's PR flag). Pages with the time
// switcher. Default tab = the most-recently-trained routine. Keeps the drill-in links.

// Piece 10: `routine` is now LIFTED to Health.jsx (shared with Consistency) — this is a
// controlled tab. Default "all" is set there, replacing the old most-recently-trained default.
export default function GymTraining({ built, routine, onRoutine, windowStart, windowEnd, days, nowForWindow, onMore, onRecords }) {
  const wk = useMemo(() => routineWorkouts(built || [], routine), [built, routine]);
  const box = useMemo(() => boxScore(wk, days, nowForWindow), [wk, days, nowForWindow]);
  const rows = useMemo(() => liftTable(wk, { start: windowStart, end: windowEnd }), [wk, windowStart, windowEnd]);

  // PR days for THIS routine — reuse recentSessions' isPR (all-history flag), same source as
  // the Consistency grid's white dots; never recompute PR logic. Then the chart series.
  const prDays = useMemo(() => {
    const set = new Set();
    for (const s of recentSessions(built || [])) {
      if (s.isPR && (routine === "all" || classifyRoutine(s.title) === routine)) set.add(s.dateYMD);
    }
    return set;
  }, [built, routine]);
  const series = useMemo(
    () => routineVolumeSeries(wk, { start: windowStart, end: windowEnd, prDays }),
    [wk, windowStart, windowEnd, prDays],
  );
  const vol = formatVolume(box?.volume);

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

      <div className="gym-over-stats">
        <span><b>{box?.sessions ?? 0}</b> sessions</span>
        <span><b>{vol.num}</b> kg</span>
      </div>
      <GymVolChart points={series} windowStart={windowStart} windowEnd={windowEnd} />

      <GymLiftTable rows={rows} />

      <div className="gym-more-row">
        <button type="button" className="gym-more" onClick={onMore}>more ›</button>
        <button type="button" className="gym-more" onClick={onRecords}>records ›</button>
      </div>
    </section>
  );
}
