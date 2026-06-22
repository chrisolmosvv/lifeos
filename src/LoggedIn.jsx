import { weekDays } from './dateUtils'
import WeekCalendar from './WeekCalendar'
import DayAgenda from './DayAgenda'
import Masthead from './Masthead'
import './calendar.css'

// The logged-in app frame: the masthead strip plus the calendar.
// Desktop sees the week grid; phone sees a clean single day.
export default function LoggedIn() {
  const today = new Date()
  const days = weekDays(today)

  return (
    <div className="app">
      <Masthead />

      <div className="cal-wrap desktop-only">
        <WeekCalendar days={days} today={today} />
      </div>
      <div className="cal-wrap phone-only">
        <DayAgenda today={today} />
      </div>
    </div>
  )
}
