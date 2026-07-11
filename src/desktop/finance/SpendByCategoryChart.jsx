import { useState } from 'react'
import { colorHex } from '../../spine/logic/palette'

// SpendByCategoryChart — a stacked bar per month, segments = categories.
// CSS div bars (same approach as FocusChart), no SVG. Category colours from
// the palette; hover shows the per-category breakdown.

function fmtAmt(v) {
  return '€' + Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtMonth(m) {
  try { return new Date(m + '-15T12:00:00').toLocaleDateString('en-GB', { month: 'short' }) }
  catch { return m }
}

export default function SpendByCategoryChart({ data }) {
  const [hoverMonth, setHoverMonth] = useState(null)

  if (!data || !data.length) return <p className="fin-trends-empty">No spending data in this range.</p>

  const maxTotal = Math.max(1, ...data.map((m) => m.categories.reduce((s, c) => s + c.total, 0)))

  return (
    <div className="fin-spend-chart">
      <p className="fin-chart-label">Spending by category</p>
      <div className="fin-spend-bars">
        {data.map((m) => {
          const total = m.categories.reduce((s, c) => s + c.total, 0)
          return (
            <div key={m.month} className="fin-spend-col"
              onMouseEnter={() => setHoverMonth(m.month)}
              onMouseLeave={() => setHoverMonth(null)}>
              <div className="fin-spend-bar" style={{ height: `${(total / maxTotal) * 100}%` }}>
                {m.categories.map((c) => (
                  <span key={c.id} className="fin-spend-seg"
                    style={{ height: `${(c.total / total) * 100}%`, background: colorHex(c.color) || 'var(--ink-muted)' }} />
                ))}
              </div>
              <span className="fin-spend-lbl">{fmtMonth(m.month)}</span>
            </div>
          )
        })}
      </div>
      {hoverMonth && (() => {
        const m = data.find((d) => d.month === hoverMonth)
        if (!m) return null
        return (
          <div className="fin-spend-hover">
            {m.categories.map((c) => (
              <div key={c.id} className="fin-spend-hover-row">
                <span className="fin-spend-dot" style={{ background: colorHex(c.color) || 'var(--ink-muted)' }} />
                <span className="fin-spend-hover-name">{c.name}</span>
                <span className="fin-spend-hover-amt tnum">{fmtAmt(c.total)}</span>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
