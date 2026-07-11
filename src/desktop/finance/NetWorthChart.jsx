import { useState } from 'react'

// NetWorthChart — hand-rolled SVG line chart for net worth over time. Mirrors
// BodyChart's structure: a line + hairline grid + hover tooltip showing exact
// value + date. Supports combined, per-account, and cash-vs-investment views.

const W = 480, H = 160, L = 55, R = 12, T = 16, B = 24
const IW = W - L - R, IH = H - T - B

function fmtVal(v) {
  return '€' + Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDate(ymd) {
  try { return new Date(ymd + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  catch { return ymd }
}

function buildLine(series, min, max, span) {
  return series
    .map((p, i) => {
      const x = (L + (i / Math.max(1, series.length - 1)) * IW).toFixed(1)
      const y = (T + IH - ((p.value - min) / span) * IH).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')
}

export default function NetWorthChart({ series, splitSeries, label }) {
  const [hover, setHover] = useState(null)

  // Determine which data to draw.
  const isSplit = !!splitSeries
  const allPoints = isSplit
    ? [...(splitSeries.cash || []), ...(splitSeries.investment || [])]
    : (series || [])
  const vals = allPoints.map((p) => p.value).filter(Number.isFinite)

  if (!vals.length) {
    return <p className="fin-trends-empty">No data for this range yet.</p>
  }

  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1

  // Y-axis ticks: top, middle, bottom.
  const yTicks = [max, (min + max) / 2, min]
  const yOf = (v) => T + IH - ((v - min) / span) * IH

  // X-axis: first + last date label.
  const mainSeries = isSplit ? splitSeries.cash : series
  const firstDate = mainSeries?.[0]?.date || ''
  const lastDate = mainSeries?.[mainSeries.length - 1]?.date || ''

  // Hover: find the nearest point.
  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const svgX = (mx / rect.width) * W
    const idx = Math.round(((svgX - L) / IW) * Math.max(1, (mainSeries?.length || 1) - 1))
    const clamped = Math.max(0, Math.min(idx, (mainSeries?.length || 1) - 1))
    const pt = mainSeries?.[clamped]
    if (pt) setHover({ idx: clamped, ...pt })
  }

  return (
    <div className="fin-nw-chart">
      {label && <p className="fin-nw-label">{label}</p>}
      <svg
        className="fin-nw-svg"
        viewBox={`0 0 ${W} ${H}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line className="fin-nw-grid" x1={L} y1={yOf(v)} x2={L + IW} y2={yOf(v)} />
            <text className="fin-nw-ytick" x={L - 6} y={yOf(v) + 3} textAnchor="end">{fmtVal(v)}</text>
          </g>
        ))}

        {/* Lines */}
        {isSplit ? (
          <>
            {splitSeries.cash?.length > 1 && <polyline className="fin-nw-line fin-nw-line--cash" points={buildLine(splitSeries.cash, min, max, span)} />}
            {splitSeries.investment?.length > 1 && <polyline className="fin-nw-line fin-nw-line--invest" points={buildLine(splitSeries.investment, min, max, span)} />}
          </>
        ) : (
          series?.length > 1 && <polyline className="fin-nw-line" points={buildLine(series, min, max, span)} />
        )}

        {/* Hover marker */}
        {hover && (
          <>
            <circle className="fin-nw-dot" cx={L + (hover.idx / Math.max(1, (mainSeries?.length || 1) - 1)) * IW} cy={yOf(hover.value)} r={3} />
            <line className="fin-nw-cross" x1={L + (hover.idx / Math.max(1, (mainSeries?.length || 1) - 1)) * IW} y1={T} x2={L + (hover.idx / Math.max(1, (mainSeries?.length || 1) - 1)) * IW} y2={T + IH} />
          </>
        )}

        {/* X-axis labels */}
        <text className="fin-nw-xtick" x={L} y={H - 4} textAnchor="start">{fmtDate(firstDate)}</text>
        <text className="fin-nw-xtick" x={L + IW} y={H - 4} textAnchor="end">{fmtDate(lastDate)}</text>
      </svg>

      {hover && (
        <p className="fin-nw-tooltip tnum">{fmtDate(hover.date)}: {fmtVal(hover.value)}</p>
      )}
    </div>
  )
}
