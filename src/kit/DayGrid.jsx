import { useEffect, useRef, useState } from 'react'
import { HOUR_HEIGHT, formatHour } from '../dateUtils'
import { buildDayItems, layoutEvents } from '../eventLayout'
import { colorHex, INBOX_COLOR } from '../palette'
import TintedBlock from './TintedBlock'
import './todayKit.css'

// DayGrid — "the day" on Today: a 7am–midnight sheet that scrolls inside its
// column (the page never scrolls). Shows today's events + scheduled tasks as
// soft tinted blocks (overlaps split side-by-side, reusing the shared layout
// maths) and a now-line. Read-only this piece: a tap opens the existing editor
// via onOpenEvent / onOpenTask. Sealed kit block; reads no data itself.
const START = 7 // first hour shown (7am); the dead 0–7 hours are hidden
const END = 24 // midnight
const HOURS = Array.from({ length: END - START }, (_, i) => START + i)
const OFFSET = START * HOUR_HEIGHT

export default function DayGrid({ events, scheduledTasks, cats, today, onOpenEvent, onOpenTask }) {
  const scrollRef = useRef(null)
  const [now, setNow] = useState(() => new Date())

  // Tick the now-line once a minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  // Open scrolled so the current time sits a third of the way down.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const h = new Date().getHours() + new Date().getMinutes() / 60
    el.scrollTop = Math.max(0, (h - START) * HOUR_HEIGHT - el.clientHeight / 3)
  }, [])

  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const catById = new Map(cats.map((c) => [c.id, c]))
  const laidOut = layoutEvents(buildDayItems(events, scheduledTasks), dayStart)
    .filter((it) => it.top + it.height > OFFSET) // drop anything fully before 7am

  const nowH = now.getHours() + now.getMinutes() / 60
  const showNow = nowH >= START && nowH < END
  const empty = laidOut.length === 0

  return (
    <div className="tk-grid">
      <div className="tk-grid-scroll" ref={scrollRef}>
        <div className="tk-grid-inner">
          <div className="tk-grid-times">
            {HOURS.map((h) => (
              <div className="tk-grid-time" key={h}>
                <span>{formatHour(h)}</span>
              </div>
            ))}
          </div>

          <div className="tk-grid-lane">
            {HOURS.map((h) => (
              <div className="tk-grid-hour" key={h} />
            ))}

            {empty && <div className="tk-grid-empty">A clear day — nothing on the clock.</div>}

            {laidOut.map((it) => {
              const ev = it.ev
              const cat = ev.category_id ? catById.get(ev.category_id) : null
              const hex = colorHex(cat?.color || INBOX_COLOR) || '#6B7280'
              return (
                <TintedBlock
                  key={ev.kind + ':' + ev.id}
                  title={ev.title}
                  time={timeRange(ev.start_at, ev.end_at)}
                  hex={hex}
                  done={ev.status === 'done'}
                  top={it.top - OFFSET}
                  height={it.height}
                  col={it.col}
                  cols={it.cols}
                  onClick={() =>
                    ev.kind === 'event' ? onOpenEvent(ev.id) : onOpenTask(ev.id)
                  }
                />
              )
            })}

            {showNow && (
              <div className="tk-grid-now" style={{ top: (nowH - START) * HOUR_HEIGHT }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// "9:00–10:30" in local 24-hour time.
function timeRange(startIso, endIso) {
  return clock(startIso) + '–' + clock(endIso)
}
function clock(iso) {
  const d = new Date(iso)
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
}
