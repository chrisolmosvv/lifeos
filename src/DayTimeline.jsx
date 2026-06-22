import { useEffect, useRef } from 'react'
import { HOURS, HOUR_HEIGHT, formatHour } from './dateUtils'
import NowLine from './NowLine'
import EventBlock from './EventBlock'
import { layoutEvents } from './eventLayout'
import './dayTimeline.css'

// "The Day" column: a 24-hour grid (same hour range/behaviour as the week
// shell), with today's events drawn as positioned blocks and the terracotta
// now-line. Read-only. Scrolls internally and opens centred around now (or ~7am
// if now is outside working hours); the page itself never scrolls.
export default function DayTimeline({ events, cats, today }) {
  const scrollRef = useRef(null)

  // Open centred around now, or at ~7am if now is outside working hours.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const now = new Date()
    const h = now.getHours()
    if (h >= 7 && h < 22) {
      const nowTop = (h + now.getMinutes() / 60) * HOUR_HEIGHT
      el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2)
    } else {
      el.scrollTop = 7 * HOUR_HEIGHT
    }
  }, [])

  // Position today's events (with side-by-side overlap packing).
  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const laidOut = layoutEvents(events, dayStart)
  const catById = new Map(cats.map((c) => [c.id, c]))

  return (
    <div className="dt-scroll" ref={scrollRef}>
      <div className="dt-grid">
        <div className="cal-times">
          {HOURS.map((h) => (
            <div className="cal-time-cell" key={h}>
              <span>{formatHour(h)}</span>
            </div>
          ))}
        </div>

        <div className="cal-col is-today dt-col">
          {HOURS.map((h) => (
            <div className="cal-hour-cell" key={h} />
          ))}

          {laidOut.map((it) => (
            <EventBlock
              key={it.ev.id}
              ev={it.ev}
              cat={it.ev.category_id ? catById.get(it.ev.category_id) : null}
              top={it.top}
              height={it.height}
              col={it.col}
              cols={it.cols}
            />
          ))}

          <NowLine />
        </div>
      </div>
    </div>
  )
}
