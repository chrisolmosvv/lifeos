import { useMemo, useState } from "react";
import { boxScore } from "../../spine/logic/gymCalc";
import { dailyVolumeSeries } from "../../spine/logic/gymTrend";
import { formatVolume } from "../../spine/logic/gymFormat";
import { ROUTINES, routineWorkouts, liftTable, classifyRoutine } from "../../spine/logic/gymRoutine";
import GymLiftTable from "./GymLiftTable";

// LifeOS — Gym V2 (Piece 3): the Training Progress zone, now TABBED by routine (Push / Pull
// / Legs / Other — replaces Piece 1's combined box-score+trend). Selecting a tab shows THAT
// routine's own volume trend (scoped to that routine only — Push volume is never mixed with
// Legs) + a per-lift table with window deltas. The whole zone PAGES with the time switcher
// (parent passes the viewed window). Default tab = Push (flagged: could default to the
// most-recently-trained routine instead). Keeps the "more ›"/"records ›" drill-in links.

// A compact volume trend line (stretched to the zone; no axis — the numbers are above).
function VolLine({ pts }) {
  const vals = pts.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const n = pts.length;
  const W = 300, H = 40;
  const x = (i) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v) => H - (v / max) * (H - 3) - 1.5;
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg className="gym-volline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="volume trend">
      <polyline points={line} />
    </svg>
  );
}

export default function GymTraining({ built, windowStart, windowEnd, days, nowForWindow, onMore, onRecords }) {
  // Default tab = the routine of the MOST RECENTLY trained session (built is newest-first),
  // reusing Piece 3's classifier. Falls back to Push if there's somehow no session.
  const [routine, setRoutine] = useState(() => classifyRoutine(built?.[0]?.title) || "push");
  const wk = useMemo(() => routineWorkouts(built || [], routine), [built, routine]);
  const box = useMemo(() => boxScore(wk, days, nowForWindow), [wk, days, nowForWindow]);
  const series = useMemo(() => (wk.length ? dailyVolumeSeries(wk, { days, now: nowForWindow }) : null), [wk, days, nowForWindow]);
  const rows = useMemo(() => liftTable(wk, { start: windowStart, end: windowEnd }), [wk, windowStart, windowEnd]);
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
            onClick={() => setRoutine(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="gym-over-stats">
        <span><b>{box?.sessions ?? 0}</b> sessions</span>
        <span><b>{vol.num}</b> kg</span>
      </div>
      {series?.rolling?.length ? <VolLine pts={series.rolling} /> : null}

      <GymLiftTable rows={rows} />

      <div className="gym-more-row">
        <button type="button" className="gym-more" onClick={onMore}>more ›</button>
        <button type="button" className="gym-more" onClick={onRecords}>records ›</button>
      </div>
    </section>
  );
}
