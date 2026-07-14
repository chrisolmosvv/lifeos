import { useRef } from 'react'
import { useMonthData } from '../useMonthData'
import { monthLayout, dayKey } from '../monthLayout'
import { resolveColor } from '../../spine/logic/colorModel'
import { isSameDay } from '../../spine/logic/dateUtils'
import { useSwipe } from './useSwipe'
import MonthCell from './MonthCell'
import './monthView.css'

// MonthView — the standard-calendar month (Phase 7, C6). A fixed 6×7 grid (no
// page scroll): adjacent-month days greyed, today marked, each cell its day's
// events + marked tasks (~3 then "+N more"), multi-day events as full-width strips
// across a week-row. Read-only via useMonthData (keyed per month → loads + the
// fade-in). Clicks are navigational only (jump to a week) — never a form. Sealed.
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STRIP_H = 18 // px per strip lane — keep in sync with .mv-strip height in CSS

export default function MonthView({ monthAnchor, today, focusDay, onJumpDay, onJumpItem, onSwipe, navIntent = null }) {
  const { events, tasks, cats, loading } = useMonthData(monthAnchor)
  const byId = new Map(cats.map((c) => [c.id, c]))
  const { days, itemsByDay, strips, laneCountByRow } = monthLayout(monthAnchor, events, tasks)
  const month = monthAnchor.getMonth()

  // V2-5 (free-triggered): a two-finger horizontal swipe over the month steps
  // EXACTLY one month on release — distance-independent (a big flick still moves
  // only one; big jumps are for arrows / the zoom). Reuses the existing month step
  // + mv-in fade (no live track). Vertical does nothing (Month doesn't scroll);
  // axis-lock + the non-passive preventDefault still kill the history-swipe.
  const mvRef = useRef(null)
  const SWIPE_MIN = 30 // px of accumulated deltaX to count as a swipe
  useSwipe(mvRef, {
    onEnd: (totalDx) => {
      if (Math.abs(totalDx) > SWIPE_MIN) onSwipe?.(totalDx > 0 ? 1 : -1)
    },
  })

  return (
    <div
      className={'mv' + (loading ? ' is-loading' : '') + (navIntent ? ' is-slide-' + navIntent : '')}
      ref={mvRef}
    >
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
