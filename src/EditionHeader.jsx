import { useEffect, useState } from 'react'
import Masthead from './kit/Masthead'
import { mastTime, mastWeekday, mastDate, personalEdition } from './personalEdition'
import { useWeather } from './useWeather'
import './editionHeader.css'

// The edition header — the personal-broadsheet top frame, shared by every
// logged-in screen (Today / Calendar / Settings). Three columns over a centred,
// ruled nav band:
//   left   — a live two-line dateline: "HH:MM Weekday" / "D Month YYYY"
//   centre — the blackletter "LifeOS" wordmark + "YEAR {age} · DAY {n}"
//   right  — the current city over its weather (temp + short condition)
// The dateline + edition line are pure date math (no network); the city + weather
// come from useWeather (its own sealed fetch). NOTHING here reads/writes app data.
// `view`/`onNavigate` drive which screen shows — nav behaviour is unchanged.

const NAV = [
  { id: 'today', label: 'Today' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'health', label: 'Health' },
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
  const wx = useWeather()

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
          <div className="mast-edition">
            YEAR {age} · DAY {day}
          </div>
        </div>

        <div className="mast-weather">
          {!wx.loading && !wx.error && (
            <>
              <div className="mast-city">{wx.city}</div>
              <div className="mast-temp tnum">{wx.temp}°</div>
              <div className="mast-cond">
                <span className={wx.sunny ? 'mast-dot mast-dot--sun' : 'mast-dot'} />
                {wx.condition}
              </div>
            </>
          )}
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
