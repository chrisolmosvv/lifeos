import { useEffect, useRef } from 'react'
import { HOURS, HOUR_HEIGHT, isSameDay, dayName, formatHour } from './dateUtils'
import NowLine from './NowLine'

// Desktop week view: 7 day columns (Mon–Sun) with hour rows down the side.
// Empty — just the clean grid. Today's column is subtly marked.
export default function WeekCalendar({ days, today }) {
  const scrollRef = useRef(null)

  // Start the view around the working day instead of midnight.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  return (
    <div className="cal-scroll" ref={scrollRef}>
      <div className="cal-head">
        <div className="cal-corner" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={'cal-dayhead' + (isSameDay(d, today) ? ' is-today' : '')}
          >
            <span className="dh-name">{dayName(d)}</span>
            <span className="dh-num">{d.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="cal-body">
        <div className="cal-times">
          {HOURS.map((h) => (
            <div className="cal-time-cell" key={h}>
              <span>{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {days.map((d) => {
          const todayCol = isSameDay(d, today)
          return (
            <div
              key={d.toISOString()}
              className={'cal-col' + (todayCol ? ' is-today' : '')}
            >
              {HOURS.map((h) => (
                <div className="cal-hour-cell" key={h} />
              ))}
              {todayCol && <NowLine />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
