import { colorHex } from '../../spine/logic/palette'

// DeltaList — month-over-month category deltas. One line per category showing
// current total, direction arrow, and the delta from last month. Ink only —
// no colour-coding by direction (consistent with the read-only treatment).

function fmtAmt(v) {
  return '€' + Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function deltaLabel(d) {
  if (d.prior === 0 && d.current > 0) return 'new this month'
  if (d.current === 0 && d.prior > 0) return 'nothing this month'
  const abs = Math.abs(d.delta)
  const arrow = d.delta > 0 ? '↑' : d.delta < 0 ? '↓' : '—'
  return `${arrow} ${fmtAmt(abs)} from last month`
}

export default function DeltaList({ data, currentMonthLabel }) {
  if (!data || !data.length) return <p className="fin-trends-empty">No spending to compare yet.</p>

  return (
    <div className="fin-deltas">
      <p className="fin-chart-label">Month over month{currentMonthLabel ? ` — ${currentMonthLabel}` : ''}</p>
      {data.map((d) => (
        <div key={d.id} className="fin-delta-row">
          <span className="fin-delta-dot" style={{ background: colorHex(d.color) || 'var(--ink-muted)' }} />
          <span className="fin-delta-name">{d.name}</span>
          <span className="fin-delta-cur tnum">{fmtAmt(d.current)}</span>
          <span className="fin-delta-change">{deltaLabel(d)}</span>
        </div>
      ))}
    </div>
  )
}
