import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { formatMastheadDate, formatClock } from './dateUtils'
import './masthead.css'

// The edition header: the LifeOS nameplate, today's dateline, a live ticking
// clock (tabular figures so it never jitters), and a hairline rule beneath.
// One quiet strip — the app's single top bar. Log out lives here too.
export default function Masthead() {
  const [now, setNow] = useState(() => new Date())

  // Tick once a second so the clock is genuinely live.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <header className="masthead">
      <span className="mast-name">LifeOS</span>
      <div className="mast-dateline">
        <span className="mast-date">{formatMastheadDate(now)}</span>
        <span className="mast-time tnum">{formatClock(now)}</span>
      </div>
      <div className="mast-spacer" />
      <button className="mast-logout" onClick={handleLogout}>
        Log out
      </button>
    </header>
  )
}
