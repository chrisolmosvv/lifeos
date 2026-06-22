import { useState } from 'react'
import { weekDays } from './dateUtils'
import WeekCalendar from './WeekCalendar'
import DayAgenda from './DayAgenda'
import Masthead from './Masthead'
import Tasks from './Tasks'
import Settings from './Settings'
import './calendar.css'

// The logged-in app frame: the masthead (nameplate + Today/Calendar/Settings
// nav) over the current screen, with a quiet colophon at the foot. Three
// destinations: Today (the task view for now — the real Today layout is next),
// Calendar (the week/day shell), and Settings (account + Categories).
export default function LoggedIn({ email }) {
  const today = new Date()
  const days = weekDays(today)
  const [view, setView] = useState('today')

  return (
    <div className="app">
      <Masthead view={view} onNavigate={setView} />

      {view === 'today' ? (
        <div className="cal-wrap">
          <Tasks />
        </div>
      ) : view === 'calendar' ? (
        <>
          <div className="cal-wrap desktop-only">
            <WeekCalendar days={days} today={today} />
          </div>
          <div className="cal-wrap phone-only">
            <DayAgenda today={today} />
          </div>
        </>
      ) : (
        <div className="cal-wrap">
          <Settings email={email} />
        </div>
      )}

      {/* Optional edition flourish — the colophon. Easy to drop. */}
      <footer className="app-colophon">
        LifeOS — the newspaper of one life.
      </footer>
    </div>
  )
}
