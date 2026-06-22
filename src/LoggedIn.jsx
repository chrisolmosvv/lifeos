import { supabase } from './supabaseClient'
import { weekDays, formatRange } from './dateUtils'
import WeekCalendar from './WeekCalendar'
import DayAgenda from './DayAgenda'
import './calendar.css'

// The logged-in app frame: a top bar plus the calendar.
// Desktop sees the week grid; phone sees a clean single day.
export default function LoggedIn() {
  const today = new Date()
  const days = weekDays(today)

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app">
      <header className="app-head">
        <span className="app-title">LifeOS</span>
        <span className="app-range">{formatRange(days)}</span>
        <button className="logout" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <div className="cal-wrap desktop-only">
        <WeekCalendar days={days} today={today} />
      </div>
      <div className="cal-wrap phone-only">
        <DayAgenda today={today} />
      </div>
    </div>
  )
}
