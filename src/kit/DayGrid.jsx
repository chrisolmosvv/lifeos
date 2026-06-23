import { useEffect, useState } from 'react'
import { HOUR_HEIGHT, formatHour } from '../dateUtils'
import { buildDayItems, layoutEvents } from '../eventLayout'
import { colorHex, INBOX_COLOR } from '../palette'
import TintedBlock from './TintedBlock'
import './todayKit.css'

// DayGrid — "the day" on Today: a 7am–midnight sheet that scrolls inside its
// column. Shows today's events + scheduled tasks as soft tinted blocks (overlaps
// split via the shared layout maths) and a now-line. T5 adds interactions, all
// owned by the Today-scoped hook in the parent: the lane carries `backgroundBind`
// (click/drag to create), each block carries `blockBind` (move/resize/off-grid),
// and `blockPreview`/`createDraft` drive the live drag visuals. Sealed kit block.
const START = 7
const END = 24
const HOURS = Array.from({ length: END - START }, (_, i) => START + i)
const OFFSET = START * HOUR_HEIGHT

export default function DayGrid({
  events,
  scheduledTasks,
  cats,
  today,
  isToday = true,
  onOpenEvent,
  onOpenTask,
  scrollRef,
  laneRef,
  backgroundBind,
  blockBind,
  blockPreview,
  createDraft,
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const h = new Date().getHours() + new Date().getMinutes() / 60
    el.scrollTop = Math.max(0, (h - START) * HOUR_HEIGHT - el.clientHeight / 3)
  }, [scrollRef])

  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const catById = new Map(cats.map((c) => [c.id, c]))

  // Feed the live drag position into the layout so overlaps re-split as a block
  // moves (the block follows the pointer; its neighbours re-flow around it).
  let items = buildDayItems(events, scheduledTasks)
  if (blockPreview) {
    items = items.map((it) =>
      it.id === blockPreview.id
        ? { ...it, start_at: new Date(blockPreview.startMs).toISOString(), end_at: new Date(blockPreview.endMs).toISOString() }
        : it,
    )
  }
  const laidOut = layoutEvents(items, dayStart).filter((it) => it.top + it.height > OFFSET)

  const nowH = now.getHours() + now.getMinutes() / 60
  const showNow = isToday && nowH >= START && nowH < END // now-line only on the real today
  const empty = laidOut.length === 0
  const laneTop = (ms) => ((ms - dayStart) / 3600000) * HOUR_HEIGHT - OFFSET

  return (
    <div className="tk-grid">
      <div className="tk-grid-scroll kit-scroll" ref={scrollRef}>
        <div className="tk-grid-inner">
          <div className="tk-grid-times">
            {HOURS.map((h) => (
              <div className="tk-grid-time" key={h}>
                <span>{formatHour(h)}</span>
              </div>
            ))}
          </div>

          <div className="tk-grid-lane" ref={laneRef} {...backgroundBind}>
            {HOURS.map((h) => (
              <div className="tk-grid-hour" key={h} />
            ))}

            {empty && !createDraft && (
              <div className="tk-grid-empty">A clear day — nothing on the clock.</div>
            )}

            {laidOut.map((it) => {
              const ev = it.ev
              const cat = ev.category_id ? catById.get(ev.category_id) : null
              const hex = colorHex(cat?.color || INBOX_COLOR) || '#6B7280'
              const isDone = ev.status === 'done'
              const open = () => (ev.kind === 'event' ? onOpenEvent(ev.id) : onOpenTask(ev.id))
              // Completed blocks are tap-only (not draggable); everything else drags.
              const bind = isDone ? { onClick: open } : blockBind(ev)
              return (
                <TintedBlock
                  key={ev.kind + ':' + ev.id}
                  title={ev.title}
                  time={timeRange(ev.start_at, ev.end_at)}
                  hex={hex}
                  done={isDone}
                  top={it.top - OFFSET}
                  height={it.height}
                  col={it.col}
                  cols={it.cols}
                  bind={bind}
                  dragging={blockPreview?.id === ev.id}
                  removing={blockPreview?.id === ev.id && !!blockPreview.off}
                />
              )
            })}

            {createDraft && (
              <div
                className="tk-grid-draft"
                style={{
                  top: laneTop(createDraft.startMs),
                  height: ((createDraft.endMs - createDraft.startMs) / 3600000) * HOUR_HEIGHT,
                }}
              />
            )}

            {showNow && (
              <div className="tk-grid-now" style={{ top: (nowH - START) * HOUR_HEIGHT }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function timeRange(startIso, endIso) {
  return clock(startIso) + '–' + clock(endIso)
}
function clock(iso) {
  const d = new Date(iso)
  return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
}
