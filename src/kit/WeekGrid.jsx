import { useEffect, useState } from 'react'
import { HOUR_HEIGHT, isSameDay, dayName } from '../dateUtils'
import { useBlockAppearance } from './useBlockAppearance'
import WeekColumn from './WeekColumn'
import AllDayBand from './AllDayBand'
import './weekGrid.css'

// WeekGrid — the Calendar's week sheet (Phase 7, C1 display; C2 makes it
// interactive). A full-24h grid that scrolls inside itself (07:00 defaults to the
// top), a 24h gutter, and 7 day columns (WeekColumn). Interaction is owned by
// useWeekGrid (wired in WeekView); this component just lays out the columns and
// renders the live drag time-label. Sealed kit block — no data access, no writes.
const HOURS = Array.from({ length: 24 }, (_, i) => i) // 00..23
const pad = (n) => String(n).padStart(2, '0')
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export default function WeekGrid({
  days,
  today,
  events,
  scheduled,
  cats,
  selectedId,
  scrollRef,
  bodyRef,
  blockBind,
  backgroundBind,
  blockPreview,
  createDraft,
  dragLabel,
  focusMs,
  focusDay,
  allDayEvents,
  bandRef,
  bandCreateBind,
  bandBarBind,
  bandPreview,
  staggerLoad = false,
}) {
  const [now, setNow] = useState(() => new Date())

  // V2-2: ONE appearance tracker for the whole week (above the 7 columns), so a
  // re-day drag that moves a block across columns shares the same seen-set and
  // never re-fades. Blocks in start order → the stagger reads top-down.
  const appearing = useBlockAppearance(
    [
      ...events.map((e) => ({ id: 'event:' + e.id, ms: +new Date(e.start_at) })),
      ...scheduled.map((t) => ({ id: 'task:' + t.id, ms: +new Date(t.scheduled_start) })),
    ]
      .sort((a, b) => a.ms - b.ms)
      .map((x) => x.id),
    staggerLoad,
  )

  // Tick the now-line as time passes (today's column only).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  // Open with 07:00 at the top; the small hours are a scroll up. When arriving
  // from a Month item-click (focusMs), centre that item's time instead. (C6;
  // focusMs is undefined in all normal Week use → 07:00 exactly as before.)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (focusMs) {
      const d = new Date(focusMs)
      const h = d.getHours() + d.getMinutes() / 60
      el.scrollTop = Math.max(0, h * HOUR_HEIGHT - el.clientHeight / 2)
    } else {
      el.scrollTop = 7 * HOUR_HEIGHT
    }
  }, [scrollRef, focusMs])

  const byId = new Map(cats.map((c) => [c.id, c]))
  const nowH = now.getHours() + now.getMinutes() / 60
  const todayStart = startOfDay(today).getTime()

  return (
    <div className="wk">
      <div className="wk-scroll kit-scroll" ref={scrollRef}>
        <div className="wk-sticky">
          <div className="wk-head">
            <div className="wk-corner" />
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={
                  'wk-dayhead' +
                  (isSameDay(d, today) ? ' is-today' : '') +
                  (focusDay && isSameDay(d, focusDay) ? ' is-focus' : '')
                }
              >
                <span className="wk-dh-name">{dayName(d)}</span>
                <span className="wk-dh-num">{d.getDate()}</span>
              </div>
            ))}
          </div>

          <AllDayBand
            days={days}
            today={today}
            allDayEvents={allDayEvents || []}
            byId={byId}
            bandRef={bandRef}
            createBind={bandCreateBind}
            barBind={bandBarBind}
            preview={bandPreview}
          />
        </div>

        <div className="wk-body" ref={bodyRef}>
          <div className="wk-gutter">
            {HOURS.map((h) => (
              <div className="wk-gutter-cell" key={h}>
                <span>{pad(h)}</span>
              </div>
            ))}
            <span className="wk-gutter-end">00</span>
          </div>

          {days.map((d) => {
            const ds = startOfDay(d).getTime()
            const wd = d.getDay()
            return (
              <WeekColumn
                key={d.toISOString()}
                dayStart={ds}
                isToday={isSameDay(d, today)}
                isPastDay={ds < todayStart}
                isWeekend={wd === 0 || wd === 6}
                events={events.filter((e) => isSameDay(new Date(e.start_at), d))}
                scheduled={scheduled.filter((t) => isSameDay(new Date(t.scheduled_start), d))}
                byId={byId}
                nowH={nowH}
                selectedId={selectedId}
                blockPreview={blockPreview}
                createDraft={createDraft}
                blockBind={blockBind}
                backgroundBind={backgroundBind}
                appearing={appearing}
              />
            )
          })}
        </div>
      </div>

      {dragLabel && (
        <div className="wk-draglabel" style={{ left: dragLabel.x, top: dragLabel.y }}>
          {dragLabel.text}
        </div>
      )}
    </div>
  )
}
