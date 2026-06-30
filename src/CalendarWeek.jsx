import { useRef, useState } from 'react'
import { formatRange } from './dateUtils'
import { navDays, navNext, navPrev, navToDay, navShift, isHome, HOME } from './weekNav'
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
  // V2-2: the first week shown staggers its blocks in; once you navigate, later
  // weeks load quietly (no re-stagger). Any week-changing action flips this.
  const [navigated, setNavigated] = useState(false)
  // V2-4: a bump-per-week-arrow token + its direction, so WeekGrid can play the
  // content slide when the NEW week's data lands (an edit-reload never bumps the
  // token → never slides). 'next'/'prev' = horizontal slide; 'settle' = a gentle
  // scale (Back-to-this-week). Month↔Week jumps change `view` instead → the zoom.
  const [navToken, setNavToken] = useState(0)
  const [navIntent, setNavIntent] = useState(null)
  // V2-4: arms the Week↔Month zoom — stays false on the first open (no zoom then).
  const [viewZoom, setViewZoom] = useState(false)
  const requestAdd = useRef(null)

  const days = navDays(nav, today)
  const home = isHome(nav)
  const isMonth = view === 'month'

  // Week nav — clears any Month-jump focus so a later week never mis-marks, flips
  // `navigated` (quiet load, no re-stagger), and arms the V2-4 slide with a token
  // + direction so WeekGrid plays it when the new week's data lands.
  const stepWeek = (intent, next) => {
    setNavigated(true)
    setNavIntent(intent)
    setNavToken((t) => t + 1)
    setFocus(null)
    setNav(next)
  }
  const weekPrev = () => stepWeek('prev', navPrev(nav, today))
  const weekNext = () => stepWeek('next', navNext(nav, today))
  const backWeek = () => stepWeek('settle', HOME)
  // V2-5 (free-triggered swipe): on release, shift the window by `dayShift` whole
  // days to ANY day-aligned window, reusing the V2-4 slide (token + direction) and
  // the gate's reload-on-weekKey. dayShift = 0 → no-op (a tiny swipe).
  const swipeWeek = (dayShift) => {
    if (!dayShift) return
    setNavigated(true)
    setNavIntent(dayShift > 0 ? 'next' : 'prev')
    setNavToken((t) => t + 1)
    setFocus(null)
    setNav((n) => navShift(n, today, dayShift))
  }
  // Month nav — whole-month steps.
  const monthPrev = () => setMonthAnchor(addMonths(monthAnchor, -1))
  const monthNext = () => setMonthAnchor(addMonths(monthAnchor, 1))
  const backMonth = () => setMonthAnchor(firstOfMonth(today))
  // View switches + the Month → Week jumps. setViewZoom(true) arms the V2-4
  // centered scale-zoom for this (and every later) toggle — never the first open.
  const toWeek = () => { setViewZoom(true); setFocus(null); setView('week') }
  const toMonth = () => { setViewZoom(true); setMonthAnchor(firstOfMonth(days[0])); setView('month') }
  const jumpToDay = (day) => { setViewZoom(true); setNavigated(true); setFocus({ day, itemId: null, ms: null }); setNav(navToDay(day, today)); setView('week') }
  const jumpToItem = (day, item) => { setViewZoom(true); setNavigated(true); setFocus({ day, itemId: item.id, ms: item.ms }); setNav(navToDay(day, today)); setView('week') }

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

      {/* V2-4: keyed on `view` so a Week↔Month toggle replays the centered
          scale-zoom (Month grows out of / Week collapses into the week). The key
          is `view`, NOT the week, so arrowing weeks does NOT remount WeekView —
          the gate's stable mount holds. */}
      <div className={'cw-view' + (viewZoom ? ' is-zoom' : '')} key={view}>
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
            days={days}
            today={today}
            requestAdd={requestAdd}
            trayOpen={trayOpen}
            focus={focus}
            staggerLoad={!navigated}
            navToken={navToken}
            navIntent={navIntent}
            onSwipe={swipeWeek}
          />
        )}
      </div>
    </div>
  )
}
