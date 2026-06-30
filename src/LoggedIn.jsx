import { useState } from 'react'
import { weekDays } from './dateUtils'
import CalendarWeek from './CalendarWeek'
import DayAgenda from './DayAgenda'
import EditionHeader from './EditionHeader'
import Today from './Today'
import Settings from './Settings'
import Planning from './Planning'
import ArchiveScreen from './ArchiveScreen'
import HealthHub from './health/HealthHub'
import FoodPage from './food/FoodPage'
import HealthDebugV2 from './health/HealthDebugV2' // THROWAWAY (V2 P0c verify) — delete with the hook below
import './calendar.css'

// The logged-in app frame: the masthead (nameplate + Today/Calendar/Settings
// nav) over the current screen, with a quiet colophon at the foot. Three
// destinations: Today (the task view for now — the real Today layout is next),
// Calendar (the week/day shell), and Settings (account + Categories).
export default function LoggedIn({ email }) {
  const today = new Date()
  const days = weekDays(today)
  const [view, setView] = useState('today')

  // THROWAWAY (V2 P0c verify): open <app>/#health-debug-v2 to read the calc readout. Delete with the import above.
  if (typeof window !== 'undefined' && window.location.hash === '#health-debug-v2') return <HealthDebugV2 />

  return (
    <div className="app">
      <EditionHeader view={view} onNavigate={setView} />

      {view === 'today' ? (
        <div className="cal-wrap">
          <Today onOpenPlanning={() => setView('planning')} />
        </div>
      ) : view === 'planning' ? (
        <div className="cal-wrap">
          <Planning onBack={() => setView('today')} />
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
      ) : view === 'food' ? (
        <div className="cal-wrap">
          <FoodPage />
        </div>
      ) : (
        <div className="cal-wrap">
          <Settings email={email} onOpenArchive={() => setView('archive')} />
        </div>
      )}
    </div>
  )
}
