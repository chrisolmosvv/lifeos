import { useMemo } from "react";
import { smoothedSeries } from "../../spine/logic/bodyComposition";
import { bodyNetDelta } from "./hubCalc";
import { amsTodayYMD, shiftYMD } from "../../spine/logic/gymDates";
import {
  DIMS, xScale, yScaleFrom, yTicks, polyPoints, bandPath, humanDayShort,
} from "../kit/bodyChartScales";
import "./hubBody.css";

// HubBodySection — the Hub's bottom-RIGHT quarter. One 90-day chart with TWO smoothed
// lines (weight, ink + faint band; body-fat %, terracotta), a single dashed goal LINE
// at the target weight, and a legend stating each line's net change over the window.
// Both lines are smoothedSeries(smooth:7) — the SAME line the Body detail chart draws —
// so the Hub never disagrees with the detail page. Reuses the detail chart's scale math.

const FAT_AXIS_MIN_SPAN = 4; // floor on the body-fat axis span (matches the detail chart)

// The earliest metric_date across the given row-sets, as "YYYY-MM-DD" (null if none).
function earliestReading(rowSets) {
  let min = null;
  for (const rows of rowSets) {
    for (const r of rows || []) {
      const d = r?.metric_date;
      if (d && (min == null || d < min)) min = d;
    }
  }
  return min;
}

export default function HubBodySection({ weightRows, bodyFatRows, goalMap, now, onOpen }) {
  const view = useMemo(() => {
    const today = amsTodayYMD(now);
    const ninety = shiftYMD(today, -89);
    // Window = last 90 days, BUT if fewer than 90 days of readings exist, start at the
    // earliest actual reading so the lines fill the chart (no empty left gutter).
    const earliest = earliestReading([weightRows, bodyFatRows]);
    const start = earliest && earliest > ninety ? earliest : ninety;
    const weight = smoothedSeries(weightRows, { start, end: today, smooth: 7, withBand: true });
    const fat = smoothedSeries(bodyFatRows, { start, end: today, smooth: 7, withBand: false });
    const goal = goalMap?.get?.("weight")?.target_value ?? null;
    const daysShown = Math.round((Date.parse(today) - Date.parse(start)) / 86400000) + 1;
    return {
      today, start, weight, fat, goal, daysShown,
      wDelta: bodyNetDelta(weightRows, { start, end: today }),
      fDelta: bodyNetDelta(bodyFatRows, { start, end: today }),
    };
  }, [weightRows, bodyFatRows, goalMap, now]);

  const { weight, fat, goal, today, start } = view;
  const hasData = weight.length > 0;

  const { w, h, l, r, t, b } = DIMS;
  const x = xScale(start, today);
  const wVals = [];
  weight.forEach((p) => wVals.push(p.raw, p.smoothed, p.lo, p.hi));
  if (Number.isFinite(goal)) wVals.push(goal);
  const wy = yScaleFrom(wVals);
  const fy = yScaleFrom(fat.map((p) => p.smoothed), 0.1, FAT_AXIS_MIN_SPAN);

  const wLast = hasData ? weight[weight.length - 1] : null;
  const fLast = fat.length ? fat[fat.length - 1] : null;

  const deltaMark = (d, unit) => {
    if (!d) return "—";
    const arrow = d.delta < -0.05 ? "↓" : d.delta > 0.05 ? "↑" : "→";
    return `${arrow} ${Math.abs(d.delta).toFixed(1)}${unit}`;
  };

  return (
    <button type="button" className="hbody" onClick={onOpen}>
      <div className="hbody-head">
        <span className="hub-sec-label">Body · {view.daysShown >= 90 ? "90 days" : `${view.daysShown} days`}</span>
        <span className="hbody-hero">
          <span className="hbody-hero-kg">{wLast ? wLast.smoothed.toFixed(1) : "—"}<span className="hbody-u">kg</span></span>
          <span className="hbody-hero-fat">{fLast ? fLast.smoothed.toFixed(1) : "—"}<span className="hbody-u">%</span></span>
        </span>
      </div>

      {hasData ? (
        <svg className="hbody-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
          role="img" aria-label="Weight and body-fat over the last 90 days">
          {/* weight (kg) axis — the primary, owns the gridlines */}
          <line className="hbody-axis" x1={l} y1={t} x2={l} y2={h - b} />
          {yTicks(wy.lo, wy.hi, 4).map((v, i) => (
            <g key={i}>
              <line className="hbody-grid" x1={l} y1={wy.y(v)} x2={w - r} y2={wy.y(v)} />
              <text className="hbody-ytick" x={l - 6} y={wy.y(v) + 4} textAnchor="end">{v.toFixed(0)}</text>
            </g>
          ))}
          {/* body-fat (%) axis — secondary, terracotta values only */}
          {yTicks(fy.lo, fy.hi, 3).map((v, i) => (
            <text key={i} className="hbody-ytick hbody-ytick--fat" x={w - r + 6} y={fy.y(v) + 4} textAnchor="start">{v.toFixed(0)}%</text>
          ))}

          {/* goal LINE — single dashed line at target weight */}
          {Number.isFinite(goal) && (
            <line className="hbody-goal" x1={l} y1={wy.y(goal)} x2={w - r} y2={wy.y(goal)} />
          )}

          {/* weight band + lines */}
          <path className="hbody-band" d={bandPath(weight, x, wy.y)} />
          <polyline className="hbody-line hbody-line--fat" points={polyPoints(fat, x, fy.y, "smoothed")} />
          <polyline className="hbody-line hbody-line--weight" points={polyPoints(weight, x, wy.y, "smoothed")} />

          {/* end dots */}
          {fLast && <circle className="hbody-dot hbody-dot--fat" cx={x(fLast.ymd)} cy={fy.y(fLast.smoothed)} r={3} />}
          {wLast && <circle className="hbody-dot hbody-dot--weight" cx={x(wLast.ymd)} cy={wy.y(wLast.smoothed)} r={3} />}

          {/* date ends */}
          <text className="hbody-xtick" x={l} y={h - 4} textAnchor="start">{humanDayShort(start)}</text>
          <text className="hbody-xtick" x={w - r} y={h - 4} textAnchor="end">{humanDayShort(today)}</text>
        </svg>
      ) : (
        <div className="hbody-none">Not enough weigh-ins yet to chart the trend.</div>
      )}

      <div className="hbody-legend">
        <span className="hbody-leg hbody-leg--weight">Weight {deltaMark(view.wDelta, " kg")}</span>
        <span className="hbody-leg hbody-leg--fat">Body fat {deltaMark(view.fDelta, "%")}</span>
        {Number.isFinite(goal) && <span className="hbody-leg hbody-leg--goal">goal {goal.toFixed(1)} kg</span>}
      </div>

      <span className="hub-detail-cue" aria-hidden="true">detail ›</span>
    </button>
  );
}
