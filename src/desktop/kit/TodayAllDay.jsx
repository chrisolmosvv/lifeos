import { resolveColor } from '../colorModel'
import { colorHex, INBOX_COLOR } from '../palette'
import './todayAllDay.css'

// Today's all-day strip (T10 P5B) — the single-day counterpart to the Week's
// all-day band. Renders each all-day / multi-day event covering the viewed day as a
// calm tinted bar (same visual language as the week's .adb-bar: soft fill + coloured
// left bar), with the repeat loop when it's a series occurrence. Click opens the
// event. Renders nothing when there are no all-day items (so it collapses).
export default function TodayAllDay({ events, cats, onOpen }) {
  if (!events.length) return null
  const byId = new Map(cats.map((c) => [c.id, c]))
  return (
    <div className="tad">
      {events.map((ev) => {
        const cat = ev.category_id ? byId.get(ev.category_id) : null
        const hex = cat ? resolveColor(cat, byId) : colorHex(INBOX_COLOR) || '#6B7280'
        return (
          <button
            key={ev.id}
            className="tad-bar"
            onClick={() => onOpen(ev.id)}
            style={{ background: `color-mix(in srgb, ${hex} 16%, transparent)`, borderLeft: `3px solid ${hex}` }}
          >
            <span className="tad-title">{ev.title}</span>
            {ev.series_id && <span className="tad-loop" aria-hidden="true">↻</span>}
          </button>
        )
      })}
    </div>
  )
}
