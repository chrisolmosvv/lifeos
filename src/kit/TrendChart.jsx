import { useState } from 'react'
import { formatVolume } from '../gym/gymFormat'
import './formGuide.css'

// TrendChart — a calm, hand-rolled inline-SVG line chart for the Form Guide
// (no chart dependency). Sealed gym-kit block: it ONLY displays the calc layer's
// weekly series (gymTrend.trendSeries) — no fetching, no maths. A small toggle
// switches what it plots: weekly volume (default) / weekly sessions / the
// most-frequent lift's est-1RM over time. A null lift point = not trained that
// week, so the line breaks there (honest, no fake zero).

const W = 720, H = 200
const PAD = { l: 46, r: 14, t: 16, b: 28 }
const IW = W - PAD.l - PAD.r
const IH = H - PAD.t - PAD.b

export default function TrendChart({ series }) {
  const [metric, setMetric] = useState('volume')
  const hasLift = !!series?.lift
  const active = metric === 'lift' && !hasLift ? 'volume' : metric

  const labels = series?.labels || []
  const values =
    active === 'volume' ? series?.volume || []
    : active === 'sessions' ? series?.sessions || []
    : series?.lift?.points || []

  const finite = values.filter((v) => typeof v === 'number' && Number.isFinite(v))
  const hasData = finite.length > 0 && Math.max(...finite) > 0
  const max = hasData ? Math.max(...finite) : 0
  const n = values.length

  const x = (i) => (n <= 1 ? PAD.l + IW / 2 : PAD.l + (i / (n - 1)) * IW)
  const y = (v) => PAD.t + IH - (max > 0 ? (v / max) * IH : 0)

  // Split the line on null gaps (a week the lift wasn't trained).
  const segments = []
  let cur = []
  values.forEach((v, i) => {
    if (typeof v === 'number' && Number.isFinite(v)) cur.push(`${x(i)},${y(v)}`)
    else if (cur.length) { segments.push(cur); cur = [] }
  })
  if (cur.length) segments.push(cur)

  const topLabel =
    active === 'sessions' ? String(max)
    : `${formatVolume(max).num} kg`

  const tabs = [
    { id: 'volume', label: 'Volume / week' },
    { id: 'sessions', label: 'Sessions / week' },
    { id: 'lift', label: hasLift ? `${series.lift.name} · 1RM` : '1RM' },
  ]

  return (
    <div className="fg-trend">
      <div className="fg-trend-toggle">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={active === t.id ? 'is-active' : ''}
            disabled={t.id === 'lift' && !hasLift}
            onClick={() => setMetric(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <p className="fg-band-empty">Not enough history yet to chart this.</p>
      ) : (
        <svg className="fg-trend-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="weekly training trend">
          <line className="fg-axis" x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} />
          <line className="fg-grid" x1={PAD.l} y1={PAD.t} x2={PAD.l + IW} y2={PAD.t} />
          <text className="fg-ytick" x={PAD.l - 8} y={PAD.t + 4} textAnchor="end">{topLabel}</text>
          <text className="fg-ytick" x={PAD.l - 8} y={PAD.t + IH} textAnchor="end">0</text>

          {segments.map((seg, si) => (
            <polyline key={si} className="fg-line" points={seg.join(' ')} />
          ))}
          {values.map((v, i) =>
            typeof v === 'number' && Number.isFinite(v) ? (
              <circle
                key={i}
                className={i === n - 1 ? 'fg-dot fg-dot--last' : 'fg-dot'}
                cx={x(i)}
                cy={y(v)}
                r={i === n - 1 ? 3 : 2.4}
              />
            ) : null,
          )}
          {labels.map((lab, i) =>
            i % 2 === 0 || i === n - 1 ? (
              <text key={i} className="fg-xtick" x={x(i)} y={H - 8} textAnchor="middle">{lab}</text>
            ) : null,
          )}
        </svg>
      )}
    </div>
  )
}
