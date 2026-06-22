import { useState } from 'react'
import { weekDays } from './dateUtils'
import WeekCalendar from './WeekCalendar'
import DayAgenda from './DayAgenda'
import Masthead from './Masthead'
import Categories from './Categories'
import './calendar.css'

// The logged-in app frame: the masthead strip plus the current view.
// Calendar (desktop week / phone day) or the bare-bones Categories view.
export default function LoggedIn() {
  const today = new Date()
  const days = weekDays(today)
  const [view, setView] = useState('calendar')

  return (
    <div className="app">
      <Masthead view={view} onNavigate={setView} />

      {view === 'calendar' ? (
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
          <Categories />
        </div>
      )}
    </div>
  )
}
