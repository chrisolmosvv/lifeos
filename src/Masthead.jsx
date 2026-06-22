import { useEffect, useState } from 'react'
import { formatMastheadDate, formatClock } from './dateUtils'
import './masthead.css'

// The three top-level destinations. Settings carries a small subtitle in the
// mock ("categories, account") — an optional flourish, easy to drop.
const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'settings', label: 'Settings', sub: 'categories, account' },
]

// The edition header — a personal broadsheet nameplate. Top tier: the LifeOS
// nameplate (Fraunces), an edition line, today's dateline and a live ticking
// clock (tabular figures so it never jitters). A hairline rule, then the nav
// strip (Today / Calendar / Settings) with the active item marked by a
// terracotta underline. Log out now lives on the Settings page, not here.
// `view`/`onNavigate` drive which screen shows.
export default function Masthead({ view, onNavigate }) {
  const [now, setNow] = useState(() => new Date())

  // Tick once a second so the clock is genuinely live.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="masthead">
      <div className="mast-top">
        <span className="mast-name">LifeOS</span>
        <div className="mast-dateline">
          <span className="mast-edition">Vol. I · No. 142</span>
          <span className="mast-date">{formatMastheadDate(now)}</span>
          <span className="mast-time tnum">{formatClock(now)}</span>
        </div>
      </div>

      <nav className="mast-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={item.id === view ? 'is-active' : ''}
            aria-current={item.id === view ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="mast-navlabel">{item.label}</span>
            {item.sub && <span className="mast-navsub">{item.sub}</span>}
          </button>
        ))}
      </nav>
    </header>
  )
}
