import { useState } from "react";
import { dateTicks, yTicks, humanDayShort } from "../kit/bodyChartScales";
import { humanDayLong } from "../../spine/logic/gymDates";
import "./gymComboChart.css";

// LifeOS — Gym V2 (Piece 15): the single-exercise DETAIL chart (Screen 3). A FORK of GymComboChart so
// Screen 1 (volume bars + reps line) stays byte-for-byte unchanged. Here:
//   BARS = that day's heaviest working-set weight (prWeight). Ink by default; TERRACOTTA when that day
//          set a new all-time PR (strictly-greater, warm-ups excluded — the app's one PR rule).
//   LINE (terracotta) = that day's total volume for this exercise.
//   REPS are gone from the persistent chart — they live ONLY in the hover tooltip (4 values).
// The two y-axes are BOTH kg but at very different magnitudes (weight = tens–hundreds on the LEFT;
// volume = hundreds–thousands on the RIGHT), so each is captioned "kg·set" / "kg·vol" to keep them
// from reading as one unit. Grid belongs to the primary (weight) axis; volume ticks are terracotta.

const DIMS = { w: 600, h: 208, l: 34, r: 40, t: 16, b: 20 };
const DAY = 86400000;
const dayIdx = (ymd, start) => Math.round((Date.parse(ymd) - Date.parse(start)) / DAY);
const wfmt = (v) => `${Math.round(v)}`;                                       // weight: tens–hundreds
const vfmt = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`); // volume: hundreds–thousands
const kg = (n) => `${Number(n.toFixed(1))}`;
const en = (v) => Math.round(v).toLocaleString("en-GB");

export default function GymExerciseChart({ points, windowStart, windowEnd }) {
  const [hover, setHover] = useState(null);
  if (!points || points.length === 0) {
    return <p className="gym-ph">No sessions for this exercise in this window.</p>;
  }
  const { w, h, l, r, t, b } = DIMS;
  const iw = w - l - r, ih = h - t - b;
  const total = Math.max(1, dayIdx(windowEnd, windowStart));
  const x = (ymd) => l + (Math.min(Math.max(dayIdx(ymd, windowStart), 0), total) / total) * iw;

  const wMax = Math.max(1, ...points.map((p) => p.maxWeight || 0)); // weight (bars, left)
  const vMax = Math.max(1, ...points.map((p) => p.volume));         // volume (line, right)
  const wy = (v) => t + ih - (v / wMax) * ih;
  const vy = (v) => t + ih - (v / vMax) * ih;
  const barW = Math.max(3, Math.min(13, (iw / Math.max(points.length, 6)) * 0.62));

  const volLine = points.map((p) => `${x(p.ymd).toFixed(1)},${vy(p.volume).toFixed(1)}`).join(" ");
  const wTicks = yTicks(0, wMax, 4);
  const vTicks = yTicks(0, vMax, 4);
  const xTicks = dateTicks(windowStart, windowEnd, 6);

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0, bestD = Infinity;
    points.forEach((p, i) => { const d = Math.abs(x(p.ymd) - px); if (d < bestD) { bestD = d; best = i; } });
    setHover(best);
  }
  const hp = hover == null ? null : points[hover];
  const dayAvg = hp && hp.reps > 0 ? hp.volume / hp.reps : null; // per-day avg kg/rep (NOT Screen 2's window avg)

  return (
    <div className="gym-combo" key={`${windowStart}_${windowEnd}`}>
      <svg
        className="gym-combo-svg" viewBox={`0 0 ${w} ${h}`}
        role="img" aria-label="exercise weight and volume trend"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
      >
        {/* weight gridlines + left axis labels (the primary/bars axis owns the grid) */}
        {wTicks.map((v, i) => (
          <g key={`wg${i}`}>
            <line className="gym-combo-grid" x1={l} y1={wy(v)} x2={w - r} y2={wy(v)} />
            <text className="gym-combo-ytick" x={l - 5} y={wy(v) + 3} textAnchor="end">{wfmt(v)}</text>
          </g>
        ))}
        {/* right axis labels (volume) — terracotta, colour-matched to the volume line */}
        {vTicks.map((v, i) => (
          <text key={`vg${i}`} className="gym-combo-ytick gym-combo-ytick--rep" x={w - r + 5} y={vy(v) + 3} textAnchor="start">{vfmt(v)}</text>
        ))}
        {/* axis captions — both kg, very different scales, so name each */}
        <text className="gym-combo-axcap" x={l - 5} y={t - 5} textAnchor="end">kg·set</text>
        <text className="gym-combo-axcap gym-combo-axcap--vol" x={w - r + 5} y={t - 5} textAnchor="start">kg·vol</text>

        {/* weight bars — ink by default, terracotta on a new-PR day */}
        <g>
          {points.map((p) => (p.maxWeight != null ? (
            <rect
              key={p.ymd}
              className={`gym-combo-bar${p.isPR ? " gym-combo-bar--pr" : ""}${hp && hp.ymd === p.ymd ? " is-hot" : ""}`}
              x={x(p.ymd) - barW / 2} y={wy(p.maxWeight)} width={barW} height={Math.max(0, t + ih - wy(p.maxWeight))}
            />
          ) : null))}
        </g>

        {/* volume line + nodes (terracotta) */}
        {points.length > 1 && <polyline className="gym-combo-repline" points={volLine} />}
        <g className="gym-combo-repdots">
          {points.map((p) => (<circle key={p.ymd} cx={x(p.ymd)} cy={vy(p.volume)} r={1.5} />))}
        </g>

        {/* hover crosshair + highlighted volume node */}
        {hp && (
          <g className="gym-combo-cross">
            <line x1={x(hp.ymd)} y1={t} x2={x(hp.ymd)} y2={t + ih} />
            <circle cx={x(hp.ymd)} cy={vy(hp.volume)} r={2.8} className="gym-combo-cross-dot" />
          </g>
        )}

        {/* date axis */}
        {xTicks.map((ymd, i) => (
          <text key={ymd} className="gym-combo-xtick" x={x(ymd)} y={h - 6}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}>
            {humanDayShort(ymd)}
          </text>
        ))}
      </svg>

      {hp && (
        <div className="gym-combo-tip" style={{ left: `${(x(hp.ymd) / w) * 100}%` }}>
          <span className="gym-combo-tip-date">{humanDayLong(hp.ymd)}</span>
          <span className="gym-combo-tip-row gym-combo-tip-reps">{en(hp.volume)} kg vol</span>
          <span className="gym-combo-tip-row">{en(hp.reps)} reps</span>
          <span className="gym-combo-tip-row">
            {hp.maxWeight != null ? `${kg(hp.maxWeight)} kg top set` : "—"}{hp.isPR ? " · PR" : ""}
          </span>
          <span className="gym-combo-tip-row">{dayAvg != null ? `${kg(dayAvg)} kg/rep` : "—"}</span>
        </div>
      )}
    </div>
  );
}
