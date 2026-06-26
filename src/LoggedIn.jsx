import { useState } from 'react'
import { weekDays } from './dateUtils'
import CalendarWeek from './CalendarWeek'
import DayAgenda from './DayAgenda'
import EditionHeader from './EditionHeader'
import Today from './Today'
import Settings from './Settings'
import AllTasks from './AllTasks'
import ArchiveScreen from './ArchiveScreen'
import HealthHub from './health/HealthHub'
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
      <EditionHeader view={view} onNavigate={setView} />

      {view === 'today' ? (
        <div className="cal-wrap">
          <Today onOpenAllTasks={() => setView('alltasks')} />
        </div>
      ) : view === 'alltasks' ? (
        <div className="cal-wrap">
          <AllTasks onBack={() => setView('today')} />
        </div>
      ) : view === 'archive' ? (
        <div className="cal-wrap">
          <ArchiveScreen onBack={() => setView('settings')} />
        </div>
      ) : view === 'calendar' ? (
        <>
          <div className="cal-wrap desktop-only">
            <CalendarWeek />
          </div>
          <div className="cal-wrap phone-only">
            <DayAgenda today={today} />
          </div>
        </>
      ) : view === 'health' ? (
        <div className="cal-wrap">
          <HealthHub />
        </div>
      ) : (
        <div className="cal-wrap">
          <Settings email={email} onOpenArchive={() => setView('archive')} />
        </div>
      )}
    </div>
  )
}
