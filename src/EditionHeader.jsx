import { useEffect, useState } from 'react'
import Masthead from './kit/Masthead'
import { mastTime, mastWeekday, mastDate, personalEdition } from './personalEdition'
import './editionHeader.css'

// The edition header — the personal-broadsheet top frame, shared by every
// logged-in screen (Today / Calendar / Health / Food / Settings). Three columns over a centred,
// ruled nav band:
//   left   — a live two-line dateline: "HH:MM Weekday" / "D Month YYYY"
//   centre — the blackletter "LifeOS" wordmark
//   right  — the personal edition mark: "Year {age}" / "Day {n}"
// The dateline + edition mark are pure date math (no network, no app data).
// `view`/`onNavigate` drive which screen shows — nav behaviour is unchanged.

const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'health', label: 'Health' },
  { id: 'food', label: 'Food' },
  { id: 'settings', label: 'Settings' },
]

export default function EditionHeader({ view, onNavigate }) {
  // Tick once a second so the dateline clock stays live (device clock only).
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { age, day } = personalEdition(now)

  return (
    <header className="masthead">
      <div className="mast-top">
        <div className="mast-dateline">
          <div className="mast-dateline-1 tnum">
            <span className="mast-time">{mastTime(now)}</span>{' '}
            <span className="mast-weekday">{mastWeekday(now)}</span>
          </div>
          <div className="mast-dateline-2">{mastDate(now)}</div>
        </div>

        <div className="mast-center">
          <Masthead />
        </div>

        <div className="mast-edition-mark" aria-label={`Year ${age}, day ${day}`}>
          <div>Year <span className="tnum">{age}</span></div>
          <div>Day <span className="tnum">{day}</span></div>
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
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
