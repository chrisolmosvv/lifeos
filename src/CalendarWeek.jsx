import { useState } from 'react'
import { formatRange } from './dateUtils'
import { navDays, navNext, navPrev, isHome, HOME } from './weekNav'
import WeekView from './WeekView'
import './calendarWeek.css'

// The Calendar (desktop) C1 container: the today-anchored rolling home + the
// Monday-week navigation (weekNav), the toolbar shell, and the week grid below.
// DISPLAY ONLY this piece — only the arrows + "Back to this week" are live. The
// Week/Month toggle, the tray button and "+ Add event" are inert placeholders,
// clearly marked non-functional (their behaviour lands in C6 / C5 / C2). The grid
// + the preserved edit panels live in WeekView, remounted per week (keyed) so
// each week's data reloads.
export default function CalendarWeek() {
  const today = new Date()
  const [nav, setNav] = useState(HOME)
  const days = navDays(nav, today)
  const home = isHome(nav)
  const weekKey = days[0].toISOString()

  return (
    <div className="cw">
      <div className="cw-toolbar">
        <div className="cw-stepper">
          <button className="cw-arrow" aria-label="Previous" onClick={() => setNav(navPrev(nav, today))}>
            ‹
          </button>
          <button className="cw-arrow" aria-label="Next" onClick={() => setNav(navNext(nav, today))}>
            ›
          </button>
        </div>
        <span className="cw-range">{formatRange(days)}</span>
        {!home && (
          <button className="cw-back" onClick={() => setNav(HOME)}>
            Back to this week
          </button>
        )}

        <div className="cw-toolbar-right">
          {/* Inert placeholders this piece — behaviour lands in later pieces. */}
          <div className="cw-toggle" role="group" aria-label="View (coming soon)">
            <span className="cw-toggle-seg is-on">Week</span>
            <span className="cw-toggle-seg is-off" title="Month view — coming soon (C6)">Month</span>
          </div>
          <button className="cw-tool" disabled title="Unscheduled tray — coming soon (C5)">
            Tray
          </button>
          <button className="cw-tool" disabled title="Create — coming soon (C2)">
            + Add event
          </button>
        </div>
      </div>

      <WeekView key={weekKey} days={days} today={today} />
    </div>
  )
}
