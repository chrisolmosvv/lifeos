import { useEffect, useRef, useState } from 'react'
import { HOURS, HOUR_HEIGHT, formatHour } from './dateUtils'
import NowLine from './NowLine'
import EventBlock from './EventBlock'
import EventPanel from './EventPanel'
import { layoutEvents } from './eventLayout'
import './dayTimeline.css'

// "The Day" column: a 24-hour grid with today's events as blocks and the
// terracotta now-line. Now editable — tap an empty slot to create at that time
// (1-hour default), "+ Add event" to create at the next hour, tap a block to
// edit, delete from the panel. The panel is a calm overlay; the grid stays put
// (the page never scrolls). Writes go through the parent's event handlers.
export default function DayTimeline({
  events,
  cats,
  today,
  pickable,
  busy,
  onSaveEvent,
  onDeleteEvent,
}) {
  const scrollRef = useRef(null)
  const [panel, setPanel] = useState(null) // null | {mode, event?, start?, end?}

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

  // A new event spanning one hour from a given start hour today.
  function openNewAt(hour) {
    const start = new Date(today)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start)
    end.setHours(start.getHours() + 1)
    setPanel({ mode: 'new', start, end })
  }
  // "+ Add event" → the next whole hour.
  const openNewNext = () => openNewAt(Math.min(23, new Date().getHours() + 1))

  // Tap on empty grid → the hour you tapped.
  function onGridClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const hour = Math.floor((e.clientY - rect.top) / HOUR_HEIGHT)
    openNewAt(Math.max(0, Math.min(23, hour)))
  }

  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const laidOut = layoutEvents(events, dayStart)
  const catById = new Map(cats.map((c) => [c.id, c]))

  return (
    <div className="dt">
      <div className="dt-bar">
        <button className="dt-add" onClick={openNewNext}>
          + Add event
        </button>
      </div>

      <div className="dt-scroll" ref={scrollRef}>
        <div className="dt-grid">
          <div className="cal-times">
            {HOURS.map((h) => (
              <div className="cal-time-cell" key={h}>
                <span>{formatHour(h)}</span>
              </div>
            ))}
          </div>

          <div className="cal-col is-today dt-col" onClick={onGridClick}>
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
                onSelect={(ev) => setPanel({ mode: 'edit', event: ev })}
              />
            ))}

            <NowLine />
          </div>
        </div>
      </div>

      {panel && (
        <EventPanel
          mode={panel.mode}
          event={panel.event}
          start={panel.start}
          end={panel.end}
          pickable={pickable}
          busy={busy}
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}
