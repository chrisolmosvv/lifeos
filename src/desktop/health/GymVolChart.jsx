// LifeOS — Gym V2 (Piece 6): the Training Progress volume chart. A compact hand-rolled SVG:
// kg gridlines + axis labels, a SMOOTHED volume line (the trailing-mean series from
// gymTrend.routineVolumeSeries — same smoothing idea as Body's composition chart), faint
// point dots, and terracotta PR dots (reusing Consistency's existing PR flag). The line only
// spans REAL session days — no fabricated flat lead-in before a routine's history starts. x is
// real DATE across [windowStart, windowEnd], so a routine that started later begins mid-chart.

const DIMS = { w: 600, h: 100, l: 38, r: 8, t: 8, b: 16 };
const DAY = 86400000;
const dayIdx = (ymd, start) => Math.round((Date.parse(ymd) - Date.parse(start)) / DAY);
// Compact kg label: 16,240 → "16k", 850 → "850".
const kfmt = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`);

export default function GymVolChart({ points, windowStart, windowEnd }) {
  if (!points || points.length === 0) {
    return <p className="gym-ph">No sessions for this routine in this window.</p>;
  }
  const { w, h, l, r, t, b } = DIMS;
  const total = Math.max(1, dayIdx(windowEnd, windowStart));
  const iw = w - l - r, ih = h - t - b;
  const x = (ymd) => l + (Math.min(Math.max(dayIdx(ymd, windowStart), 0), total) / total) * iw;
  const vals = points.map((p) => p.smoothed).filter(Number.isFinite);
  const max = vals.length ? Math.max(...vals, 1) : 1;
  const y = (v) => t + ih - (v / max) * ih; // volume baseline = 0 (honest floor)
  const ticks = [0, max / 2, max];
  const line = points.map((p) => `${x(p.ymd).toFixed(1)},${y(p.smoothed).toFixed(1)}`).join(" ");
  const prs = points.filter((p) => p.isPR);

  return (
    <svg className="gym-vol" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="volume trend">
      {ticks.map((v, i) => (
        <g key={i}>
          <line className="gym-vol-grid" x1={l} y1={y(v)} x2={w - r} y2={y(v)} />
          <text className="gym-vol-ytick" x={l - 5} y={y(v) + 3} textAnchor="end">{kfmt(v)}</text>
        </g>
      ))}
      {points.length > 1 && <polyline className="gym-vol-line" points={line} />}
      <g className="gym-vol-dots">
        {points.map((p) => (
          <circle key={p.ymd} cx={x(p.ymd)} cy={y(p.smoothed)} r={1.6} />
        ))}
      </g>
      {prs.map((p) => (
        <circle key={`pr-${p.ymd}`} className="gym-vol-pr" cx={x(p.ymd)} cy={y(p.smoothed)} r={2.8} />
      ))}
    </svg>
  );
}
