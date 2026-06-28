import { humanDayShort } from "../gym/gymDates";
import { fmtNum } from "./foodFormat";

// FoodTrend — a calm inline-SVG calories trend for the Week/Month header. MIRRORS the Body
// chart's "full" structure (axis + line + dots + an optional goal reference) but formats kcal
// via foodFormat — Body's chart is metric-coupled, so we keep Body untouched and reuse the
// proven approach here. Adds a faint area fill under the line; baseline anchored at 0 so
// calories read honestly. Draws nothing if there's no data and no goal. series = [{ymd,value}].

const W = 340, H = 110, L = 40, R = 12, T = 12, B = 20;
const DAY = 86400000;
const dayIdx = (ymd, start) => Math.round((Date.parse(ymd) - Date.parse(start)) / DAY);

export default function FoodTrend({ series, windowStart, windowEnd, goalValue }) {
  const pts = (series || []).filter((p) => Number.isFinite(p?.value));
  const hasGoal = Number.isFinite(goalValue);
  if (pts.length === 0 && !hasGoal) return null;

  const iw = W - L - R, ih = H - T - B;
  const total = Math.max(1, dayIdx(windowEnd, windowStart) + 1);
  const vals = pts.map((p) => p.value);
  if (hasGoal) vals.push(goalValue);
  const lo = 0; //                 calories baseline at 0 reads honestly
  let hi = Math.max(...vals, 1);
  hi += hi * 0.08; //              headroom above the tallest value/goal

  const x = (ymd) =>
    total <= 1 ? L + iw / 2 : L + (Math.min(Math.max(dayIdx(ymd, windowStart), 0), total - 1) / (total - 1)) * iw;
  const y = (v) => T + ih - ((v - lo) / (hi - lo)) * ih;
  const line = pts.map((p) => `${x(p.ymd).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = pts.length
    ? `${x(pts[0].ymd).toFixed(1)},${(T + ih).toFixed(1)} ${line} ${x(last.ymd).toFixed(1)},${(T + ih).toFixed(1)}`
    : "";

  return (
    <svg className="ftrend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="calories over the range">
      <line className="ftrend-axis" x1={L} y1={T + ih} x2={L + iw} y2={T + ih} />
      <text className="ftrend-ytick" x={L - 6} y={T + 4} textAnchor="end">{fmtNum("kcal", hi)}</text>
      <text className="ftrend-ytick" x={L - 6} y={T + ih} textAnchor="end">0</text>

      {hasGoal && (
        <>
          <line className="ftrend-goal" x1={L} y1={y(goalValue)} x2={L + iw} y2={y(goalValue)} />
          <text className="ftrend-goal-label" x={L + iw} y={y(goalValue) - 4} textAnchor="end">goal {fmtNum("kcal", goalValue)}</text>
        </>
      )}

      {pts.length > 1 && <polygon className="ftrend-area" points={area} />}
      {pts.length > 1 && <polyline className="ftrend-line" points={line} />}
      {pts.map((p, i) => (
        <circle
          key={i}
          className={p === last ? "ftrend-dot ftrend-dot--last" : "ftrend-dot"}
          cx={x(p.ymd)}
          cy={y(p.value)}
          r={p === last ? 3 : 2.2}
        />
      ))}

      <text className="ftrend-xtick" x={L} y={H - 6} textAnchor="start">{humanDayShort(windowStart)}</text>
      <text className="ftrend-xtick" x={L + iw} y={H - 6} textAnchor="end">{humanDayShort(windowEnd)}</text>
    </svg>
  );
}
