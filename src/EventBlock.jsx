import { colorHex } from './palette'

// One block on the day timeline. Two kinds share this render:
//  - an EVENT (solid border), and
//  - a scheduled TASK (dashed border — a second view of a task that still lives
//    in its list; it stays a task, this is just its time block).
// Paper background, a category-coloured left rule, a small-caps category kicker +
// the start time, and the title. Uncategorised → neutral rule, no kicker (never
// an "Inbox" tag). Draggable to move/resize (useEventDrag). A task block also
// carries a small "unschedule" control and shows completion struck through.
export default function EventBlock({
  ev,
  cat,
  top,
  height,
  col,
  cols,
  dragging,
  removing,
  handlers,
  onUnschedule, // task blocks only
}) {
  const hex = cat ? colorHex(cat.color) : null
  const widthPct = 100 / cols
  const isTask = ev.kind === 'task'
  const done = isTask && ev.status === 'done'

  const style = {
    top,
    height,
    left: `calc(${col * widthPct}% + 2px)`,
    width: `calc(${widthPct}% - 6px)`,
    borderLeftColor: hex || 'var(--rule)',
  }

  return (
    <div
      className={
        'dt-event' +
        (isTask ? ' is-task' : '') +
        (done ? ' is-done' : '') +
        (dragging ? ' is-dragging' : '') +
        (removing ? ' is-removing' : '')
      }
      style={style}
      title={ev.title}
      {...handlers}
    >
      <div className="dt-handle dt-handle-top" />
      <div className="dt-event-kicker">
        {cat && <span className="dt-event-cat">{cat.name}</span>}
        <span className="dt-event-time tnum">{startTime(ev.start_at)}</span>
        {isTask && (
          <button
            className="dt-unschedule"
            title="Unschedule"
            aria-label="Unschedule"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onUnschedule()
            }}
          >
            ×
          </button>
        )}
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
