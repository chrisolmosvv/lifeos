import { colorHex } from '../../spine/logic/palette'

// TopCategories — a simple ranked list: top 5 categories by expense spend
// in the selected range. Category dot + name + amount. No chart geometry.

function fmtAmt(v) {
  return '€' + Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TopCategories({ data }) {
  if (!data || !data.length) return <p className="fin-trends-empty">No spending data in this range.</p>

  return (
    <div className="fin-top-cats">
      <p className="fin-chart-label">Top categories</p>
      {data.map((c, i) => (
        <div key={c.id} className="fin-top-row">
          <span className="fin-top-rank">{i + 1}.</span>
          <span className="fin-top-dot" style={{ background: colorHex(c.color) || 'var(--ink-muted)' }} />
          <span className="fin-top-name">{c.name}</span>
          <span className="fin-top-amt tnum">{fmtAmt(c.total)}</span>
        </div>
      ))}
    </div>
  )
}
