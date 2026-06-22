import { HOUR_HEIGHT } from './dateUtils'
import { colorHex } from './palette'

// The live preview while dragging a block across the week. The real block stays
// ghosted (invisible but mounted, so the pointer drag keeps its grip); this
// floats over cal-body at the column under the pointer + the snapped time. It
// never intercepts pointer events. Same look as a block (dashed for a task).
const TIMES_W = 56 // matches .cal-times / .cal-corner width in calendar.css

export default function WeekDragPreview({ preview, item, cat, dayIndex }) {
  const hex = cat ? colorHex(cat.color) : null
  const startMin = (preview.top / HOUR_HEIGHT) * 60
  const style = {
    top: preview.top,
    height: preview.height,
    left: `calc(${TIMES_W}px + ${dayIndex} * ((100% - ${TIMES_W}px) / 7) + 2px)`,
    width: `calc((100% - ${TIMES_W}px) / 7 - 6px)`,
    borderLeftColor: hex || 'var(--rule)',
  }
  return (
    <div
      className={'dt-event dt-preview' + (item.kind === 'task' ? ' is-task' : '')}
      style={style}
    >
      <div className="dt-event-kicker">
        {cat && <span className="dt-event-cat">{cat.name}</span>}
        <span className="dt-event-time tnum">{hhmm(startMin)}</span>
      </div>
      <div className="dt-event-title">{item.title}</div>
    </div>
  )
}

function hhmm(min) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(min / 60))}:${p(Math.round(min % 60))}`
}
