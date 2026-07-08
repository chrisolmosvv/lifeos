import { humanDayShort } from "../gym/gymDates";
import { fmtNum } from "./foodFormat";

// FoodBarChart (V2 P4, Food-owned — Body's chart code is untouched) — one metric's daily bars over
// the window + a terracotta dashed GOAL line (always drawn when a goal is set, even for 1 bar) + an
// ink AVG line + a native hover tooltip. Each BAR is the per-day drill (tap → that day's ledger).
// SPARSE-SAFE: fixed axes (0 baseline), a day with NO log draws NO bar (a gap is not a 0), so an
// almost-empty chart reads "not much logged yet", never broken. Pure geometry over passed series.
const W = 300, H = 120, L = 34, R = 8, T = 10, B = 18;
const DAY = 86400000;
const dayIdx = (ymd, start) => Math.round((Date.parse(ymd) - Date.parse(start)) / DAY);

export default function FoodBarChart({ label, nutrient, series, windowStart, windowEnd, goalValue, avgValue, onDrillDay }) {
  const total = Math.max(1, dayIdx(windowEnd, windowStart) + 1); // calendar-day slots (bars)
  const byIdx = {};
  for (const p of series || []) if (Number.isFinite(p?.value)) byIdx[dayIdx(p.ymd, windowStart)] = p;

  const vals = Object.values(byIdx).map((p) => p.value);
  if (Number.isFinite(goalValue)) vals.push(goalValue);
  if (Number.isFinite(avgValue)) vals.push(avgValue);
  let hi = Math.max(...vals, 1);
  hi += hi * 0.12; // headroom above the tallest bar/goal/avg

  const iw = W - L - R, ih = H - T - B;
  const bw = iw / total;
  const x = (i) => L + i * bw;
  const y = (v) => T + ih - (v / hi) * ih;

  return (
    <div className="fbar">
      <div className="fbar-head">
        <span className="fbar-label">{label}</span>
        {Number.isFinite(avgValue) && <span className="fbar-avg">avg {fmtNum(nutrient, avgValue)}</span>}
      </div>
      <svg className="fbar-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} over the range`}>
        <line className="fbar-axis" x1={L} y1={T + ih} x2={L + iw} y2={T + ih} />
        <text className="fbar-ytick" x={L - 5} y={T + 4} textAnchor="end">{fmtNum(nutrient, hi)}</text>
        <text className="fbar-ytick" x={L - 5} y={T + ih} textAnchor="end">0</text>

        {Number.isFinite(goalValue) && goalValue > 0 && (
          <line className="fbar-goal" x1={L} y1={y(goalValue)} x2={L + iw} y2={y(goalValue)} />
        )}
        {Number.isFinite(avgValue) && avgValue > 0 && (
          <line className="fbar-avgline" x1={L} y1={y(avgValue)} x2={L + iw} y2={y(avgValue)} />
        )}

        {Array.from({ length: total }).map((_, i) => {
          const p = byIdx[i];
          if (!p) return null;
          return (
            <rect key={i} className="fbar-bar" x={x(i) + bw * 0.18} y={y(p.value)} width={Math.max(1, bw * 0.64)} height={Math.max(0, T + ih - y(p.value))}
              onClick={() => onDrillDay?.(p.ymd)}>
              <title>{`${humanDayShort(p.ymd)}: ${fmtNum(nutrient, p.value)}`}</title>
            </rect>
          );
        })}

        <text className="fbar-xtick" x={L} y={H - 5} textAnchor="start">{humanDayShort(windowStart)}</text>
        <text className="fbar-xtick" x={L + iw} y={H - 5} textAnchor="end">{humanDayShort(windowEnd)}</text>
      </svg>
    </div>
  );
}
