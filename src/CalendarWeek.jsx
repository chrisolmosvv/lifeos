import { useRef, useState } from 'react'
import { formatRange } from './dateUtils'
import { navDays, navNext, navPrev, isHome, HOME } from './weekNav'
import WeekView from './WeekView'
import './calendarWeek.css'

// The Calendar (desktop) container: the today-anchored rolling home + the
// Monday-week navigation (weekNav), the toolbar, and the week grid below. Arrows,
// "Back to this week" and (C3) "+ Add event" are live. The Week/Month toggle and
// the tray button stay inert placeholders (C6 / C5). The grid + the shared form
// live in WeekView, remounted per week (keyed) so each week's data reloads;
// "+ Add event" reaches into the current WeekView through the requestAdd ref.
export default function CalendarWeek() {
  const today = new Date()
  const [nav, setNav] = useState(HOME)
  const days = navDays(nav, today)
  const home = isHome(nav)
  const weekKey = days[0].toISOString()
  const requestAdd = useRef(null)
  const [trayOpen, setTrayOpen] = useState(false)

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
          <button
            className={'cw-tool cw-tool-live' + (trayOpen ? ' is-on' : '')}
            aria-pressed={trayOpen}
            onClick={() => setTrayOpen((o) => !o)}
          >
            Tray
          </button>
          <button className="cw-tool cw-tool-live" onClick={() => requestAdd.current?.()}>
            + Add event
          </button>
        </div>
      </div>

      <WeekView key={weekKey} days={days} today={today} requestAdd={requestAdd} trayOpen={trayOpen} />
    </div>
  )
}
