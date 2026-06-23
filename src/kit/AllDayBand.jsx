import { resolveColor } from '../colorModel'
import { colorHex, INBOX_COLOR } from '../palette'
import './allDayBand.css'

// The all-day band (Phase 7, C7) — sits above the timed grid, aligned to the 7
// columns. All-day items render as bars (multi-day stretch across the days they
// cover); the band auto-sizes to the number of lanes and renders NOTHING when
// empty (so it collapses). Click an empty cell to create, drag a bar to move, drag
// an edge to span — all via useBandDrag (day-grained). Past bars grey like other
// past blocks. Colours reuse resolveColor. Sealed kit block.
const DAY = 86400000
const BAR_H = 22
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const pct = (n) => (n / 7) * 100

export default function AllDayBand({ days, today, allDayEvents, byId, bandRef, createBind, barBind, preview }) {
  const weekStart = midnight(days[0])
  const weekEndExcl = weekStart + 7 * DAY
  const todayMs = midnight(today)

  // Visible bars with greedy lane assignment.
  const lanes = []
  const bars = allDayEvents
    .map((ev) => ({ ev, s: midnight(new Date(ev.start_at)), eExcl: midnight(new Date(ev.end_at)) }))
    .filter((b) => b.eExcl > weekStart && b.s < weekEndExcl)
    .sort((a, b) => a.s - b.s || b.eExcl - a.eExcl)
    .map((b) => {
      const startCol = clamp(Math.round((b.s - weekStart) / DAY), 0, 6)
      const endCol = clamp(Math.round((b.eExcl - DAY - weekStart) / DAY), 0, 6)
      let lane = lanes.findIndex((end) => startCol > end)
      if (lane === -1) { lane = lanes.length; lanes.push(endCol) } else { lanes[lane] = endCol }
      return { ev: b.ev, startCol, endCol, lane, past: b.eExcl <= todayMs }
    })

  const dragId = preview && !preview.create ? preview.id : null
  const laneCount = lanes.length + (preview?.create ? 1 : 0)
  if (laneCount === 0) return null // empty band → nothing (collapses)

  return (
    <div className="adb">
      <div className="adb-gutter">all-day</div>
      <div className="adb-cols" ref={bandRef} {...createBind} style={{ height: laneCount * BAR_H }}>
        {bars.map((b) => {
          const sc = dragId === b.ev.id ? preview.startCol : b.startCol
          const ec = dragId === b.ev.id ? preview.endCol : b.endCol
          const cat = b.ev.category_id ? byId.get(b.ev.category_id) : null
          const hex = cat ? resolveColor(cat, byId) : colorHex(INBOX_COLOR) || '#6B7280'
          return (
            <button
              key={b.ev.id}
              className={'adb-bar' + (b.past ? ' is-past' : '') + (dragId === b.ev.id ? ' is-dragging' : '')}
              style={{
                left: `calc(${pct(sc)}% + 2px)`,
                width: `calc(${pct(ec - sc + 1)}% - 4px)`,
                top: b.lane * BAR_H + 1,
                background: `color-mix(in srgb, ${hex} 16%, transparent)`,
                borderLeft: `3px solid ${hex}`,
              }}
              {...barBind(b.ev)}
            >
              <span className="adb-bar-title">{b.ev.title}</span>
            </button>
          )
        })}
        {preview?.create && (
          <div
            className="adb-preview"
            style={{
              left: `calc(${pct(preview.startCol)}% + 2px)`,
              width: `calc(${pct(preview.endCol - preview.startCol + 1)}% - 4px)`,
              top: lanes.length * BAR_H + 1,
            }}
          />
        )}
      </div>
    </div>
  )
}
