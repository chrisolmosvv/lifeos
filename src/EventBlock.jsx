import { colorHex } from './palette'

// One event drawn on the day timeline: paper background, a hairline border, a
// category-coloured left rule, a small-caps category kicker + the start time,
// and the title. Uncategorised events (no category) get a calm neutral rule and
// no category kicker — never an "Inbox" tag (events don't use Inbox).
//
// Editable by direct manipulation: the whole block can be dragged to move, and
// the thin top/bottom handles resize it. A plain tap still opens the edit panel
// (the gesture logic lives in useEventDrag). `handlers` carries the pointer/
// click handlers; `dragging` is true while this block is the one being dragged.
export default function EventBlock({
  ev,
  cat,
  top,
  height,
  col,
  cols,
  dragging,
  handlers,
}) {
  const hex = cat ? colorHex(cat.color) : null
  const widthPct = 100 / cols

  const style = {
    top,
    height,
    left: `calc(${col * widthPct}% + 2px)`,
    width: `calc(${widthPct}% - 6px)`,
    // The coloured left rule (neutral hairline when uncategorised).
    borderLeftColor: hex || 'var(--rule)',
  }

  return (
    <div
      className={'dt-event' + (dragging ? ' is-dragging' : '')}
      style={style}
      title={ev.title}
      {...handlers}
    >
      <div className="dt-handle dt-handle-top" />
      <div className="dt-event-kicker">
        {cat && <span className="dt-event-cat">{cat.name}</span>}
        <span className="dt-event-time tnum">{startTime(ev.start_at)}</span>
      </div>
      <div className="dt-event-title">{ev.title}</div>
      <div className="dt-handle dt-handle-bottom" />
    </div>
  )
}

function startTime(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}
