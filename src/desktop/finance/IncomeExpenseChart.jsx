import { useState } from 'react'

// IncomeExpenseChart — two bars per month (income + expense), side by side.
// CSS div bars, mirroring FoodBarChart's paired-bar structure. Income = ink,
// expense = ink-muted. Hover shows exact values.

function fmtAmt(v) {
  return '€' + Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtMonth(m) {
  try { return new Date(m + '-15T12:00:00').toLocaleDateString('en-GB', { month: 'short' }) }
  catch { return m }
}

export default function IncomeExpenseChart({ data }) {
  const [hoverMonth, setHoverMonth] = useState(null)

  if (!data || !data.length) return <p className="fin-trends-empty">No income or expense data in this range.</p>

  const maxVal = Math.max(1, ...data.flatMap((m) => [m.income, m.expense]))

  return (
    <div className="fin-ie-chart">
      <p className="fin-chart-label">Income vs. expense</p>
      <div className="fin-ie-bars">
        {data.map((m) => (
          <div key={m.month} className="fin-ie-col"
            onMouseEnter={() => setHoverMonth(m.month)}
            onMouseLeave={() => setHoverMonth(null)}>
            <div className="fin-ie-pair">
              <div className="fin-ie-bar fin-ie-bar--income" style={{ height: `${(m.income / maxVal) * 100}%` }} />
              <div className="fin-ie-bar fin-ie-bar--expense" style={{ height: `${(m.expense / maxVal) * 100}%` }} />
            </div>
            <span className="fin-ie-lbl">{fmtMonth(m.month)}</span>
          </div>
        ))}
      </div>
      {hoverMonth && (() => {
        const m = data.find((d) => d.month === hoverMonth)
        if (!m) return null
        return (
          <div className="fin-ie-hover">
            <span className="fin-ie-hover-item"><span className="fin-ie-key fin-ie-key--income" /> Income: {fmtAmt(m.income)}</span>
            <span className="fin-ie-hover-item"><span className="fin-ie-key fin-ie-key--expense" /> Expense: {fmtAmt(m.expense)}</span>
          </div>
        )
      })()}
    </div>
  )
}
