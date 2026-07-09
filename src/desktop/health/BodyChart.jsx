import { humanDayShort } from "../../spine/logic/gymDates";
import { fmtNum, metaFor } from "./bodyFormat";

// BodyChart — a calm, hand-rolled inline-SVG chart for the Body page (no chart
// dependency), mirroring the gym TrendChart in spirit. It ONLY draws the calc
// layer's daily-average series — no fetching, no maths.
//
//   variant "spark" (Latest view): a small axis-less 90-day sparkline, scaled to the
//     series' own min/max, positioned by index. A single reading = a lone dot.
//   variant "full" (range views): a line chart over the selected window, positioned
//     by real DATE (so 2 points in a 90-day window sit honestly near the right edge,
//     not stretched edge-to-edge), with y-ticks + date axis and an optional overlay —
//     a terracotta GOAL line (weight) or a shaded normal-range BAND (vitals).

const SPARK = { w: 160, h: 40, pad: 5 };
const FULL = { w: 340, h: 120, l: 38, r: 12, t: 12, b: 20 };
const DAY = 86400000;
const dayIdx = (ymd, start) => Math.round((Date.parse(ymd) - Date.parse(start)) / DAY);

function Spark({ pts }) {
  const { w, h, pad } = SPARK;
  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const ih = h - pad * 2;
  const n = pts.length;
  const x = (i) => (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v) => pad + ih - ((v - min) / span) * ih;
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg className="body-spark body-spark--spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="90-day trend">
      {n > 1 && <polyline className="body-spark-line" points={line} />}
      <circle className="body-spark-dot" cx={x(n - 1)} cy={y(pts[n - 1].value)} r={2.6} />
    </svg>
  );
}

const FULL_COMPACT = { w: 320, h: 52, l: 4, r: 4, t: 5, b: 5 }; // table-cell thumbnail: line + band + goal, no ticks

function Full({ pts, metric, windowStart, windowEnd, goalValue, band, compact }) {
  const { w, h, l, r, t, b } = compact ? FULL_COMPACT : FULL;
  const iw = w - l - r;
  const ih = h - t - b;
  const total = Math.max(1, dayIdx(windowEnd, windowStart) + 1); // days across the window
  const showBand = band && band.hasEnoughData;

  // Domain spans the data AND any overlay (goal/band) so they're always visible.
  const domVals = pts.map((p) => p.value);
  if (Number.isFinite(goalValue)) domVals.push(goalValue);
  if (showBand) domVals.push(band.lo, band.hi);
  let lo = Math.min(...domVals);
  let hi = Math.max(...domVals);
  if (lo === hi) { lo -= 1; hi += 1; } // flat / single point → give the axis room
  const padY = (hi - lo) * 0.08;
  lo -= padY; hi += padY;

  const x = (ymd) => (total <= 1 ? l + iw / 2 : l + (Math.min(Math.max(dayIdx(ymd, windowStart), 0), total - 1) / (total - 1)) * iw);
  const y = (v) => t + ih - ((v - lo) / (hi - lo)) * ih;
  const unit = metaFor(metric).unit;

  // Split the line on gaps (the daily series is gap-free, but stay honest).
  const segs = [];
  let cur = [];
  pts.forEach((p) => {
    if (Number.isFinite(p.value)) cur.push(`${x(p.ymd).toFixed(1)},${y(p.value).toFixed(1)}`);
    else if (cur.length) { segs.push(cur); cur = []; }
  });
  if (cur.length) segs.push(cur);
  const last = pts[pts.length - 1];

  return (
    <svg className="body-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${metaFor(metric).label} over the range`}>
      {showBand && (
        <rect className="body-chart-band" x={l} y={y(band.hi)} width={iw} height={Math.max(0, y(band.lo) - y(band.hi))} />
      )}
      {!compact && <line className="body-chart-axis" x1={l} y1={t + ih} x2={l + iw} y2={t + ih} />}
      {!compact && <text className="body-chart-ytick" x={l - 6} y={t + 4} textAnchor="end">{fmtNum(metric, hi)}</text>}
      {!compact && <text className="body-chart-ytick" x={l - 6} y={t + ih} textAnchor="end">{fmtNum(metric, lo)}</text>}

      {Number.isFinite(goalValue) && (
        <>
          <line className="body-chart-goal" x1={l} y1={y(goalValue)} x2={l + iw} y2={y(goalValue)} />
          {!compact && (
            <text className="body-chart-goal-label" x={l + iw} y={y(goalValue) - 4} textAnchor="end">goal {fmtNum(metric, goalValue)} {unit}</text>
          )}
        </>
      )}

      {segs.map((seg, i) => (
        <polyline key={i} className="body-chart-line" points={seg.join(" ")} />
      ))}
      {pts.map((p, i) =>
        Number.isFinite(p.value) ? (
          <circle key={i} className={p === last ? "body-chart-dot body-chart-dot--last" : "body-chart-dot"} cx={x(p.ymd)} cy={y(p.value)} r={p === last ? 3 : 2.2} />
        ) : null,
      )}

      {!compact && <text className="body-chart-xtick" x={l} y={h - 6} textAnchor="start">{humanDayShort(windowStart)}</text>}
      {!compact && <text className="body-chart-xtick" x={l + iw} y={h - 6} textAnchor="end">{humanDayShort(windowEnd)}</text>}
    </svg>
  );
}

export default function BodyChart({ series, variant = "spark", metric, windowStart, windowEnd, goalValue, band, compact }) {
  const pts = (series || []).filter((p) => Number.isFinite(p?.value));
  if (variant === "full") {
    // A full chart still frames the window (axis, goal line, band) even with no data.
    if (pts.length === 0 && !(band && band.hasEnoughData) && !Number.isFinite(goalValue)) return null;
    return <Full pts={pts} metric={metric} windowStart={windowStart} windowEnd={windowEnd} goalValue={goalValue} band={band} compact={compact} />;
  }
  if (pts.length === 0) return null;
  return <Spark pts={pts} />;
}
