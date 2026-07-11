import { useState } from 'react'

// SpendHeatmap — the genuinely novel Finance chart. A month-grid calendar
// (Mon–Sun columns, weeks as rows), one SVG rect per day, opacity mapped to
// that day's total expense. Max-spend day = full ink, zero-spend = rule-faint.
// All-zero range → neutral empty grid (no divide-by-zero). Hover shows exact
// date + amount. Month labels above each month's block.

const CELL = 14, GAP = 2, LABEL_H = 16
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmtAmt(v) {
  return '€' + Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(ymd) {
  try { return new Date(ymd + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return ymd }
}

// Build a grid of weeks from the date range.
function buildGrid(dailyTotals) {
  const entries = [...dailyTotals.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  if (!entries.length) return { weeks: [], months: [] }

  const weeks = []
  const months = []
  let currentWeek = []
  let lastMonth = ''

  for (const [ymd, total] of entries) {
    const d = new Date(ymd + 'T12:00:00')
    const dow = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6

    // Fill leading empty cells for the first week
    if (weeks.length === 0 && currentWeek.length === 0) {
      for (let i = 0; i < dow; i++) currentWeek.push(null)
    }

    // Track month boundaries
    const month = ymd.slice(0, 7)
    if (month !== lastMonth) {
      months.push({ label: monthLabel(month), weekIdx: weeks.length + (currentWeek.length > 0 ? 0 : 0) })
      lastMonth = month
    }

    currentWeek.push({ ymd, total })
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length) weeks.push(currentWeek)
  return { weeks, months }
}

function monthLabel(m) {
  try { return new Date(m + '-15T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) }
  catch { return m }
}

export default function SpendHeatmap({ dailyTotals }) {
  const [hover, setHover] = useState(null)

  if (!dailyTotals || dailyTotals.size === 0) {
    return <p className="fin-trends-empty">No spending data for the heatmap.</p>
  }

  const { weeks, months } = buildGrid(dailyTotals)
  const allVals = [...dailyTotals.values()]
  const maxSpend = Math.max(...allVals)
  // All-zero guard: if maxSpend is 0, every cell gets the faint treatment.
  const safeMax = maxSpend > 0 ? maxSpend : 1

  const w = (weeks.length * (CELL + GAP)) + 30 // 30 for day labels
  const h = 7 * (CELL + GAP) + LABEL_H

  return (
    <div className="fin-heatmap">
      <p className="fin-chart-label">Spending heatmap</p>
      <div className="fin-heatmap-wrap">
        <svg className="fin-heatmap-svg" viewBox={`0 0 ${w} ${h}`} style={{ width: w, maxWidth: '100%', height: 'auto' }}>
          {/* Day labels */}
          {DAYS.map((d, i) => (
            <text key={d} className="fin-hm-day" x={12} y={LABEL_H + i * (CELL + GAP) + CELL / 2 + 3} textAnchor="middle">{d[0]}</text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) => (
            week.map((cell, di) => {
              if (!cell) return null
              const opacity = maxSpend > 0 ? 0.08 + (cell.total / safeMax) * 0.92 : 0.08
              return (
                <rect key={cell.ymd}
                  x={30 + wi * (CELL + GAP)} y={LABEL_H + di * (CELL + GAP)}
                  width={CELL} height={CELL}
                  className="fin-hm-cell"
                  style={{ opacity }}
                  onMouseEnter={() => setHover(cell)}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })
          ))}
        </svg>
      </div>
      {hover && (
        <p className="fin-hm-tooltip tnum">{fmtDate(hover.ymd)}: {fmtAmt(hover.total)}</p>
      )}
    </div>
  )
}
