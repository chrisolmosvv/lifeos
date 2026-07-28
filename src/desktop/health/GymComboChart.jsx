import { useState } from "react";
import { dateTicks, yTicks, humanDayShort } from "../kit/bodyChartScales";
import { humanDayLong } from "../../spine/logic/gymDates";
import "./gymComboChart.css";

// LifeOS — Gym V2 (Piece 12): the Training combo chart. Volume as BARS on a left kg axis;
// total reps as an overlaid LINE on a right axis (terracotta, the single accent). Both axes
// baseline at 0 (honest floor). A full date axis (dateTicks — the same evenly-spread, self-
// thinning labels Body's composition chart uses) runs along the bottom, and hovering snaps a
// crosshair to the nearest session day + shows a tooltip with THAT day's real volume AND reps.
// Reused as-is by Screen 1 (a routine's whole trend) and Screen 3 (one exercise's own trend).
//
// Geometry is inline (its own compact box for the gym panel) but the LABEL conventions —
// date ticks, y-tick levels, kg wording — are the shared bodyChartScales helpers, so it reads
// as the same chart family as Body. Grid belongs to the PRIMARY (volume) axis only; the reps
// axis shows tick VALUES in terracotta, colour-matched to its line (no second grid = no clutter).

const DIMS = { w: 600, h: 208, l: 34, r: 32, t: 10, b: 20 };
const DAY = 86400000;
const dayIdx = (ymd, start) => Math.round((Date.parse(ymd) - Date.parse(start)) / DAY);
const kfmt = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`);
const rfmt = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);

export default function GymComboChart({ points, windowStart, windowEnd, label = "training" }) {
  const [hover, setHover] = useState(null);
  if (!points || points.length === 0) {
    return <p className="gym-ph">No sessions for this {label} in this window.</p>;
  }
  const { w, h, l, r, t, b } = DIMS;
  const iw = w - l - r, ih = h - t - b;
  const total = Math.max(1, dayIdx(windowEnd, windowStart));
  const x = (ymd) => l + (Math.min(Math.max(dayIdx(ymd, windowStart), 0), total) / total) * iw;

  const volMax = Math.max(1, ...points.map((p) => p.volume));
  const repMax = Math.max(1, ...points.map((p) => p.reps));
  const vy = (v) => t + ih - (v / volMax) * ih; // volume baseline 0
  const ry = (v) => t + ih - (v / repMax) * ih; // reps baseline 0
  const barW = Math.max(3, Math.min(13, (iw / Math.max(points.length, 6)) * 0.62));

  const repsLine = points.map((p) => `${x(p.ymd).toFixed(1)},${ry(p.reps).toFixed(1)}`).join(" ");
  const volTicks = yTicks(0, volMax, 4);
  const repTicks = yTicks(0, repMax, 4);
  const xTicks = dateTicks(windowStart, windowEnd, 6);

  // Snap the hover to the nearest session day by pixel-x (never a raw pixel).
  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0, bestD = Infinity;
    points.forEach((p, i) => { const d = Math.abs(x(p.ymd) - px); if (d < bestD) { bestD = d; best = i; } });
    setHover(best);
  }
  const hp = hover == null ? null : points[hover];

  return (
    <div className="gym-combo" key={`${windowStart}_${windowEnd}`}>
      <svg
        className="gym-combo-svg" viewBox={`0 0 ${w} ${h}`}
        role="img" aria-label={`${label} volume and reps trend`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
      >
        {/* volume gridlines + left axis labels (kg) — the primary axis owns the grid */}
        {volTicks.map((v, i) => (
          <g key={`vg${i}`}>
            <line className="gym-combo-grid" x1={l} y1={vy(v)} x2={w - r} y2={vy(v)} />
            <text className="gym-combo-ytick" x={l - 5} y={vy(v) + 3} textAnchor="end">{kfmt(v)}</text>
          </g>
        ))}
        {/* right axis labels (reps) — terracotta values only, no grid */}
        {repTicks.map((v, i) => (
          <text key={`rg${i}`} className="gym-combo-ytick gym-combo-ytick--rep" x={w - r + 5} y={ry(v) + 3} textAnchor="start">{rfmt(v)}</text>
        ))}

        {/* volume bars */}
        <g className="gym-combo-bars">
          {points.map((p) => (
            <rect
              key={p.ymd}
              className={hp && hp.ymd === p.ymd ? "gym-combo-bar is-hot" : "gym-combo-bar"}
              x={x(p.ymd) - barW / 2} y={vy(p.volume)} width={barW} height={Math.max(0, t + ih - vy(p.volume))}
            />
          ))}
        </g>

        {/* reps line + nodes */}
        {points.length > 1 && <polyline className="gym-combo-repline" points={repsLine} />}
        <g className="gym-combo-repdots">
          {points.map((p) => (<circle key={p.ymd} cx={x(p.ymd)} cy={ry(p.reps)} r={1.5} />))}
        </g>

        {/* hover crosshair + highlighted reps node */}
        {hp && (
          <g className="gym-combo-cross">
            <line x1={x(hp.ymd)} y1={t} x2={x(hp.ymd)} y2={t + ih} />
            <circle cx={x(hp.ymd)} cy={ry(hp.reps)} r={2.8} className="gym-combo-cross-dot" />
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
          <span className="gym-combo-tip-row">{Math.round(hp.volume).toLocaleString("en-GB")} kg</span>
          <span className="gym-combo-tip-row gym-combo-tip-reps">{Math.round(hp.reps).toLocaleString("en-GB")} reps</span>
        </div>
      )}
    </div>
  );
}
