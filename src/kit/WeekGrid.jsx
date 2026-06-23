import { useEffect, useRef, useState } from 'react'
import { HOUR_HEIGHT, isSameDay, dayName } from '../dateUtils'
import { buildDayItems, layoutEvents } from '../eventLayout'
import { colorHex, INBOX_COLOR } from '../palette'
import { resolveColor } from '../colorModel'
import TintedBlock from './TintedBlock'
import './weekGrid.css'

// WeekGrid — the Calendar's week sheet (Phase 7, C1). DISPLAY ONLY: seven day
// columns over a full-24h grid that scrolls inside itself (07:00 defaults to the
// top). Soft tinted, title-only blocks (reusing Today's TintedBlock), coloured by
// each item's OWN (sub-)category shade; overlaps even-split via the shared layout
// maths. Today's column gets a faint tint + a terracotta date circle and the only
// (ticking) now-line. The past goes quiet under a soft veil. Tapping a block calls
// back to open the existing editor — no create/drag here (that's C2). Sealed kit
// block: no data access, no writes.
const HOURS = Array.from({ length: 24 }, (_, i) => i) // 00..23
const pad = (n) => String(n).padStart(2, '0')

export default function WeekGrid({ days, today, events, scheduled, cats, onOpenEvent, onOpenTask }) {
  const scrollRef = useRef(null)
  const [now, setNow] = useState(() => new Date())

  // Tick the now-line as time passes (today's column only).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  // Open with 07:00 at the top; the small hours are a scroll up.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  const byId = new Map(cats.map((c) => [c.id, c]))
  const nowH = now.getHours() + now.getMinutes() / 60

  return (
    <div className="wk">
      <div className="wk-scroll kit-scroll" ref={scrollRef}>
        <div className="wk-head">
          <div className="wk-corner" />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={'wk-dayhead' + (isSameDay(d, today) ? ' is-today' : '')}
            >
              <span className="wk-dh-name">{dayName(d)}</span>
              <span className="wk-dh-num">{d.getDate()}</span>
            </div>
          ))}
        </div>

        <div className="wk-body">
          <div className="wk-gutter">
            {HOURS.map((h) => (
              <div className="wk-gutter-cell" key={h}>
                <span>{pad(h)}</span>
              </div>
            ))}
            <span className="wk-gutter-end">00</span>
          </div>

          {days.map((d) => {
            const isToday = isSameDay(d, today)
            const isPastDay = startOfDay(d) < startOfDay(today)
            const dayStart = startOfDay(d).getTime()
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start_at), d))
            const dayTasks = scheduled.filter((t) => isSameDay(new Date(t.scheduled_start), d))
            const laidOut = layoutEvents(buildDayItems(dayEvents, dayTasks), dayStart)
            // The past goes quiet: veil the whole past day; today only down to now.
            const veilH = isPastDay ? 24 * HOUR_HEIGHT : isToday ? nowH * HOUR_HEIGHT : 0

            return (
              <div key={d.toISOString()} className={'wk-col' + (isToday ? ' is-today' : '')}>
                {HOURS.map((h) => (
                  <div className="wk-hour" key={h} />
                ))}

                {laidOut.map((it) => {
                  const ev = it.ev
                  const cat = ev.category_id ? byId.get(ev.category_id) : null
                  const hex = cat ? resolveColor(cat, byId) : colorHex(INBOX_COLOR) || '#6B7280'
                  const isDone = ev.kind === 'task' && ev.status === 'done'
                  const open = () => (ev.kind === 'event' ? onOpenEvent(ev.id) : onOpenTask(ev.id))
                  return (
                    <TintedBlock
                      key={ev.kind + ':' + ev.id}
                      title={ev.title}
                      hex={hex}
                      done={isDone}
                      top={it.top}
                      height={it.height}
                      col={it.col}
                      cols={it.cols}
                      bind={{ onClick: open }}
                    />
                  )
                })}

                {veilH > 0 && <div className="wk-pastveil" style={{ height: veilH }} />}
                {isToday && nowH >= 0 && nowH < 24 && (
                  <div className="wk-now" style={{ top: nowH * HOUR_HEIGHT }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
