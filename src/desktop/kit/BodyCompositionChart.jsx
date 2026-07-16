import { useMemo, useState } from "react";
import { smoothedSeries, goalZone, valueOn } from "../../spine/logic/bodyComposition";
import {
  DIMS, xScale, yScaleFrom, polyPoints, bandPath, nearestIndex, dateTicks, humanDayShort,
} from "./bodyChartScales";
import "./bodyCompositionChart.css";

// LifeOS — Body composition chart (Var 2). A calm, hand-rolled inline-SVG trend chart
// (no chart dependency), the busiest thing on the Body page. It draws, back to front:
//   goal zone (faint terracotta band) → weight spread band → body-fat smoothed line
//   (dashed terracotta, shape-only) → weight smoothed line (solid ink) → faint raw
//   weigh-in dots (weight only) → the terracotta pulsing TODAY dot → the hover crosshair.
// The maths lives in bodyComposition.js (the series) + bodyCompositionChart.js (scales);
// this file only renders and owns the scrub state. onScrub fires the snapped day's real
// values so the page's hero numbers (Piece 4) can follow the crosshair.

export default function BodyCompositionChart({
  weightRows, bodyFatRows, windowStart, windowEnd, weightGoal, today, onScrub, smooth = 7,
}) {
  const weight = useMemo(
    () => smoothedSeries(weightRows, { start: windowStart, end: windowEnd, smooth, withBand: true }),
    [weightRows, windowStart, windowEnd, smooth],
  );
  const fat = useMemo(
    () => smoothedSeries(bodyFatRows, { start: windowStart, end: windowEnd, smooth, withBand: false }),
    [bodyFatRows, windowStart, windowEnd, smooth],
  );
  const zone = goalZone(weightGoal);
  const [hover, setHover] = useState(null);

  const { w, h, l, r, t, b } = DIMS;
  const x = xScale(windowStart, windowEnd);

  // Weight (kg) domain spans dots + smoothed + band + the goal zone, so all stay in view.
  const wVals = [];
  weight.forEach((p) => wVals.push(p.raw, p.smoothed, p.lo, p.hi));
  if (zone) wVals.push(zone.lo, zone.hi);
  const wy = yScaleFrom(wVals);
  // Body fat rides its OWN scale, drawn as the RIGHT axis (terracotta), so its % is
  // directly readable — not just its shape. Derived from the real data, padded.
  const fy = yScaleFrom(fat.map((p) => p.smoothed));

  const hasData = weight.length > 0;
  const todayPt = hasData ? (weight.find((p) => p.ymd === today) || weight[weight.length - 1]) : null;

  function onMove(e) {
    if (!hasData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w; // client px → viewBox px
    const i = nearestIndex(weight, px, windowStart, windowEnd);
    if (i < 0) return;
    setHover(i);
    const wp = weight[i];
    const fp = valueOn(fat, wp.ymd);
    onScrub?.({
      ymd: wp.ymd, weightRaw: wp.raw, weightSmoothed: wp.smoothed,
      bodyFatRaw: fp?.raw ?? null, bodyFatSmoothed: fp?.smoothed ?? null,
    });
  }
  function onLeave() { setHover(null); onScrub?.(null); }

  if (!hasData) {
    return <div className="bcc-empty">Not enough weigh-ins yet to chart the trend.</div>;
  }

  const hp = weight[hover ?? -1] || null;
  const ticks = dateTicks(weight, 4);

  return (
    <div className="bcc" key={`${windowStart}_${windowEnd}`}>
      <svg
        className="bcc-svg" viewBox={`0 0 ${w} ${h}`}
        role="img" aria-label="Weight and body-fat trend over the selected range"
        onMouseMove={onMove} onMouseLeave={onLeave}
      >
        {/* LEFT axis = weight (kg), the PRIMARY axis — it owns the gridlines. Ink/muted,
            matching the solid ink weight line. Top + bottom kg labels. */}
        <line className="bcc-axis" x1={l} y1={t} x2={l} y2={h - b} />
        {[wy.hi, wy.lo].map((v, i) => (
          <g key={i}>
            <line className="bcc-grid" x1={l} y1={wy.y(v)} x2={w - r} y2={wy.y(v)} />
            <text className="bcc-ytick" x={l - 6} y={wy.y(v) + 3} textAnchor="end">{v.toFixed(1)}</text>
          </g>
        ))}

        {/* RIGHT axis = body fat (%), the SECONDARY axis. Terracotta tick VALUES only,
            colour-matched to the dashed body-fat line so you can tell which scale is
            which — but NO gridlines of its own (a second grid would clutter; the grid
            belongs to the primary weight axis). */}
        <line className="bcc-axis" x1={w - r} y1={t} x2={w - r} y2={h - b} />
        {[fy.hi, fy.lo].map((v, i) => (
          <text key={i} className="bcc-ytick bcc-ytick--fat" x={w - r + 6} y={fy.y(v) + 3} textAnchor="start">
            {v.toFixed(1)}%
          </text>
        ))}

        {/* goal zone — faint terracotta band across the width */}
        {zone && (
          <rect
            className="bcc-goalzone" x={l} width={w - l - r}
            y={wy.y(zone.hi)} height={Math.max(0, wy.y(zone.lo) - wy.y(zone.hi))}
          />
        )}

        {/* weight spread band (±1 SD) */}
        <path className="bcc-band bcc-fade-band" d={bandPath(weight, x, wy.y)} />

        {/* body-fat smoothed line — dashed terracotta, its own scale (shape only) */}
        <polyline className="bcc-line bcc-line--fat bcc-draw" pathLength="1"
          points={polyPoints(fat, x, fy.y, "smoothed")} />

        {/* weight smoothed line — solid ink */}
        <polyline className="bcc-line bcc-line--weight bcc-draw" pathLength="1"
          points={polyPoints(weight, x, wy.y, "smoothed")} />

        {/* raw weigh-in dots — weight only, faint, fade in after the lines */}
        <g className="bcc-fade-dots">
          {weight.map((p) => (
            <circle key={p.ymd} className="bcc-dot" cx={x(p.ymd)} cy={wy.y(p.raw)} r={1.8} />
          ))}
        </g>

        {/* hover crosshair — snaps to the nearest real weigh-in */}
        {hp && (
          <g className="bcc-cross">
            <line x1={x(hp.ymd)} y1={t} x2={x(hp.ymd)} y2={h - b} />
            <circle cx={x(hp.ymd)} cy={wy.y(hp.raw)} r={3} className="bcc-cross-dot" />
          </g>
        )}

        {/* TODAY dot — terracotta, ambient pulse (halo + solid) */}
        {todayPt && (
          <g>
            <circle className="bcc-today-halo" cx={x(todayPt.ymd)} cy={wy.y(todayPt.smoothed)} r={4} />
            <circle className="bcc-today-dot" cx={x(todayPt.ymd)} cy={wy.y(todayPt.smoothed)} r={3.4} />
          </g>
        )}

        {/* date axis */}
        {ticks.map((ymd, i) => (
          <text key={ymd} className="bcc-xtick" x={x(ymd)} y={h - 8}
            textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>
            {humanDayShort(ymd)}
          </text>
        ))}
      </svg>
    </div>
  );
}
