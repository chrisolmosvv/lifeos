import { useState } from 'react'
import { weekDays } from './dateUtils'
import WeekCalendar from './WeekCalendar'
import DayAgenda from './DayAgenda'
import Masthead from './Masthead'
import Categories from './Categories'
import Tasks from './Tasks'
import './calendar.css'

// The logged-in app frame: the masthead strip plus the current view.
// Calendar (desktop week / phone day), the Categories view, or the bare-bones
// Tasks view.
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
      ) : view === 'tasks' ? (
        <div className="cal-wrap">
          <Tasks />
        </div>
      ) : (
        <div className="cal-wrap">
          <Categories />
        </div>
      )}
    </div>
  )
}
