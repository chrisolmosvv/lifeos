import { useRef, useState } from 'react'
import { formatRange } from './dateUtils'
import { navDays, navNext, navPrev, navToDay, isHome, HOME } from './weekNav'
import WeekView from './WeekView'
import MonthView from './kit/MonthView'
import './calendarWeek.css'

// The Calendar (desktop) container: the today-anchored rolling home + the
// Monday-week navigation (weekNav), the toolbar, and either the Week grid or the
// Month grid. The Week/Month toggle is live (C6); Month is read-only and never
// opens a form — its clicks JUMP into a week via navToDay, carrying a `focus`
// (day + optional item) so the week lands marked / selected / scrolled. Tray +
// "+ Add event" are Week tools (greyed in Month). The week body is keyed per week
// and Month per month, so each reloads on navigation.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

export default function CalendarWeek() {
  const today = new Date()
  const [view, setView] = useState('week') // 'week' | 'month'
  const [nav, setNav] = useState(HOME)
  const [monthAnchor, setMonthAnchor] = useState(() => firstOfMonth(today))
  const [focus, setFocus] = useState(null) // {day, itemId, ms} from a Month click
  const [trayOpen, setTrayOpen] = useState(false)
  const requestAdd = useRef(null)

  const days = navDays(nav, today)
  const home = isHome(nav)
  const isMonth = view === 'month'

  // Week nav — clears any Month-jump focus so a later week never mis-marks.
  const weekPrev = () => { setFocus(null); setNav(navPrev(nav, today)) }
  const weekNext = () => { setFocus(null); setNav(navNext(nav, today)) }
  const backWeek = () => { setFocus(null); setNav(HOME) }
  // Month nav — whole-month steps.
  const monthPrev = () => setMonthAnchor(addMonths(monthAnchor, -1))
  const monthNext = () => setMonthAnchor(addMonths(monthAnchor, 1))
  const backMonth = () => setMonthAnchor(firstOfMonth(today))
  // View switches + the Month → Week jumps.
  const toWeek = () => { setFocus(null); setView('week') }
  const toMonth = () => { setMonthAnchor(firstOfMonth(days[0])); setView('month') }
  const jumpToDay = (day) => { setFocus({ day, itemId: null, ms: null }); setNav(navToDay(day, today)); setView('week') }
  const jumpToItem = (day, item) => { setFocus({ day, itemId: item.id, ms: item.ms }); setNav(navToDay(day, today)); setView('week') }

  return (
    <div className="cw">
      <div className="cw-toolbar">
        <div className="cw-stepper">
          <button className="cw-arrow" aria-label="Previous" onClick={isMonth ? monthPrev : weekPrev}>‹</button>
          <button className="cw-arrow" aria-label="Next" onClick={isMonth ? monthNext : weekNext}>›</button>
        </div>
        <span className="cw-range">
          {isMonth ? `${MONTHS[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}` : formatRange(days)}
        </span>
        {isMonth
          ? !sameMonth(monthAnchor, today) && (
              <button className="cw-back" onClick={backMonth}>Back to this month</button>
            )
          : !home && (
              <button className="cw-back" onClick={backWeek}>Back to this week</button>
            )}

        <div className="cw-toolbar-right">
          <div className="cw-toggle" role="group" aria-label="View">
            <button className={'cw-toggle-seg' + (!isMonth ? ' is-on' : '')} onClick={toWeek}>Week</button>
            <button className={'cw-toggle-seg' + (isMonth ? ' is-on' : '')} onClick={toMonth}>Month</button>
          </div>
          <button
            className={'cw-tool cw-tool-live' + (trayOpen ? ' is-on' : '')}
            aria-pressed={trayOpen}
            disabled={isMonth}
            onClick={() => setTrayOpen((o) => !o)}
          >
            Tray
          </button>
          <button className="cw-tool cw-tool-live" disabled={isMonth} onClick={() => requestAdd.current?.()}>
            + Add event
          </button>
        </div>
      </div>

      {isMonth ? (
        <MonthView
          key={monthAnchor.toISOString()}
          monthAnchor={monthAnchor}
          today={today}
          focusDay={focus?.day}
          onJumpDay={jumpToDay}
          onJumpItem={jumpToItem}
        />
      ) : (
        <WeekView
          key={days[0].toISOString()}
          days={days}
          today={today}
          requestAdd={requestAdd}
          trayOpen={trayOpen}
          focus={focus}
        />
      )}
    </div>
  )
}
