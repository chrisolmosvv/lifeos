import { colorHex } from './palette'

// One event drawn on the day timeline: paper background, a hairline border, a
// category-coloured left rule, a small-caps category kicker + the start time,
// and the title. Uncategorised events (no category) get a calm neutral rule and
// no category kicker — never an "Inbox" tag (events don't use Inbox).
// Read-only: tapping does nothing this piece (editing is 4c).
export default function EventBlock({ ev, cat, top, height, col, cols }) {
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
    <div className="dt-event" style={style} title={ev.title}>
      <div className="dt-event-kicker">
        {cat && <span className="dt-event-cat">{cat.name}</span>}
        <span className="dt-event-time tnum">{startTime(ev.start_at)}</span>
      </div>
      <div className="dt-event-title">{ev.title}</div>
    </div>
  )
}

function startTime(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}
