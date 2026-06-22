import { useEffect, useRef } from 'react'
import {
  HOURS,
  HOUR_HEIGHT,
  dayNameFull,
  formatLongDate,
  formatHour,
} from './dateUtils'
import NowLine from './NowLine'

// Phone view: a single, readable day column for today — not the squished
// 7-column grid. Empty for now.
export default function DayAgenda({ today }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  return (
    <div className="day">
      <div className="day-head">
        <div className="day-weekday">{dayNameFull(today)}</div>
        <div className="day-date">{formatLongDate(today)}</div>
        <div className="day-note">Nothing scheduled yet.</div>
      </div>

      <div className="day-scroll" ref={scrollRef}>
        <div className="day-grid">
          <div className="cal-times">
            {HOURS.map((h) => (
              <div className="cal-time-cell" key={h}>
                <span>{formatHour(h)}</span>
              </div>
            ))}
          </div>
          <div className="cal-col is-today">
            {HOURS.map((h) => (
              <div className="cal-hour-cell" key={h} />
            ))}
            <NowLine />
          </div>
        </div>
      </div>
    </div>
  )
}
