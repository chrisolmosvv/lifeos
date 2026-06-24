import { humanDayShort } from '../gym/gymDates'
import './formGuide.css'

// ClimbChart — a quiet hand-rolled SVG line of one lift's top-set weight over time,
// in the broadsheet style of the trend chart (reuses the .fg-* chart classes; no
// chart dependency). Sealed gym-kit block: display only. The PR (max) point is
// picked out in terracotta as a milestone. `points` = [{ ymd, value }] ascending.
const W = 520, H = 170
const PAD = { l: 42, r: 14, t: 14, b: 24 }
const IW = W - PAD.l - PAD.r
const IH = H - PAD.t - PAD.b

export default function ClimbChart({ points }) {
  const pts = (points || []).filter((p) => typeof p.value === 'number' && Number.isFinite(p.value))
  if (pts.length === 0) return null

  const values = pts.map((p) => p.value)
  const hi = Math.max(...values)
  const lo = hi > Math.min(...values) ? Math.min(...values) : 0 // flat series → baseline at 0
  const range = hi - lo || 1
  const n = pts.length

  const x = (i) => (n <= 1 ? PAD.l + IW / 2 : PAD.l + (i / (n - 1)) * IW)
  const y = (v) => PAD.t + IH - ((v - lo) / range) * IH
  const prIndex = values.indexOf(hi)

  return (
    <svg className="fg-trend-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="top-set climb over time">
      <line className="fg-axis" x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} />
      <text className="fg-ytick" x={PAD.l - 8} y={PAD.t + 4} textAnchor="end">{Math.round(hi)} kg</text>
      <text className="fg-ytick" x={PAD.l - 8} y={PAD.t + IH} textAnchor="end">{Math.round(lo)}</text>

      {n > 1 && <polyline className="fg-line" points={pts.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} />}
      {pts.map((p, i) => (
        <circle
          key={i}
          className={i === prIndex ? 'fg-dot fg-dot--last' : 'fg-dot'}
          cx={x(i)}
          cy={y(p.value)}
          r={i === prIndex ? 3.2 : 2.2}
        />
      ))}
      {/* PR milestone label */}
      <text className="fg-xtick" x={x(prIndex)} y={y(hi) - 6} textAnchor="middle">PR</text>

      {/* first + last date labels */}
      <text className="fg-xtick" x={x(0)} y={H - 8} textAnchor="start">{humanDayShort(pts[0].ymd)}</text>
      {n > 1 && (
        <text className="fg-xtick" x={x(n - 1)} y={H - 8} textAnchor="end">{humanDayShort(pts[n - 1].ymd)}</text>
      )}
    </svg>
  )
}
