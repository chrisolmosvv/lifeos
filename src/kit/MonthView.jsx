import { useMonthData } from '../useMonthData'
import { monthLayout, dayKey } from '../monthLayout'
import { resolveColor } from '../colorModel'
import { isSameDay } from '../dateUtils'
import MonthCell from './MonthCell'
import './monthView.css'

// MonthView — the standard-calendar month (Phase 7, C6). A fixed 6×7 grid (no
// page scroll): adjacent-month days greyed, today marked, each cell its day's
// events + marked tasks (~3 then "+N more"), multi-day events as full-width strips
// across a week-row. Read-only via useMonthData (keyed per month → loads + the
// fade-in). Clicks are navigational only (jump to a week) — never a form. Sealed.
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STRIP_H = 18 // px per strip lane — keep in sync with .mv-strip height in CSS

export default function MonthView({ monthAnchor, today, focusDay, onJumpDay, onJumpItem }) {
  const { events, tasks, cats, loading } = useMonthData(monthAnchor)
  const byId = new Map(cats.map((c) => [c.id, c]))
  const { days, itemsByDay, strips, laneCountByRow } = monthLayout(monthAnchor, events, tasks)
  const month = monthAnchor.getMonth()

  return (
    <div className={'mv' + (loading ? ' is-loading' : '')}>
      <div className="mv-head">
        {WD.map((d) => (
          <div key={d} className="mv-head-cell">{d}</div>
        ))}
      </div>
      <div className="mv-grid">
        {[0, 1, 2, 3, 4, 5].map((r) => {
          const pad = 4 + laneCountByRow[r] * STRIP_H
          return (
            <div className="mv-row" key={r}>
              {strips
                .filter((s) => s.row === r)
                .map((s, i) => {
                  const cat = s.event.category_id ? byId.get(s.event.category_id) : null
                  const hex = cat ? resolveColor(cat, byId) : '#6B7280'
                  return (
                    <button
                      key={'strip' + i}
                      className="mv-strip"
                      style={{
                        left: `calc(${(s.startCol / 7) * 100}% + 2px)`,
                        width: `calc(${((s.endCol - s.startCol + 1) / 7) * 100}% - 4px)`,
                        top: 2 + s.lane * STRIP_H,
                        background: `color-mix(in srgb, ${hex} 16%, transparent)`,
                        borderLeft: `3px solid ${hex}`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onJumpItem(days[r * 7 + s.startCol], { id: s.event.id, ms: new Date(s.event.start_at).getTime() })
                      }}
                    >
                      <span className="mv-strip-title">{s.event.title}</span>
                    </button>
                  )
                })}
              {days.slice(r * 7, r * 7 + 7).map((day) => (
                <MonthCell
                  key={day.toISOString()}
                  day={day}
                  inMonth={day.getMonth() === month}
                  isToday={isSameDay(day, today)}
                  isFocus={focusDay ? isSameDay(day, focusDay) : false}
                  items={itemsByDay.get(dayKey(day)) || { events: [], tasks: [] }}
                  stripPad={pad}
                  byId={byId}
                  onJumpDay={onJumpDay}
                  onJumpItem={onJumpItem}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
