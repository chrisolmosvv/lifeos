import { useEffect, useRef, useState } from 'react'
import Masthead from './kit/Masthead'
import Popover from './kit/Popover'
import { mastTime, mastWeekday, mastDate, personalEdition } from './personalEdition'
import { useFocusSessionCtx } from './focus/focusSessionContext'
import { elapsedClock } from './focus/focusFormat'
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
  { id: 'focus', label: 'Focus' },
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

  // The global focus live-marker (P5): only rendered while a session runs, pinned
  // far-right of the nav band (absolute → the centred nav never shifts). No session =
  // nothing rendered = the header is byte-for-byte its previous self.
  const fs = useFocusSessionCtx()
  const markerRef = useRef(null)
  const [popOpen, setPopOpen] = useState(false)
  const running = fs && (fs.status === 'running' || fs.status === 'paused') && fs.live

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

        {running && (
          <button
            ref={markerRef}
            className="mast-focus-marker"
            onClick={() => setPopOpen(true)}
            aria-label={`Focus session running · ${elapsedClock(fs.live.focusSeconds)}`}
          >
            <span className="mast-focus-dot" aria-hidden="true" />
            <span className="tnum">{elapsedClock(fs.live.focusSeconds)}</span>
          </button>
        )}
      </nav>

      {popOpen && running && (
        <Popover anchorRef={markerRef} title="Focus session" onClose={() => setPopOpen(false)}>
          <div className="mast-focus-pop">
            <div className="mast-focus-elapsed tnum">{elapsedClock(fs.live.focusSeconds)} focused</div>
            <div className="mast-focus-popacts">
              <button className="mast-focus-open" onClick={() => { setPopOpen(false); onNavigate('focus') }}>Open</button>
              <button className="mast-focus-stop" onClick={() => { setPopOpen(false); fs.stop() }}>Stop</button>
            </div>
          </div>
        </Popover>
      )}
    </header>
  )
}
