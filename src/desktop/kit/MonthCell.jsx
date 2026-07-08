import { resolveColor } from '../colorModel'
import { colorHex, INBOX_COLOR } from '../palette'

// One day cell of the Month grid (Phase 7, C6). Shows up to MAX items (events =
// solid tinted dot, tasks = hollow/ringed dot — visibly marked), then "+N more".
// Empty = blank (just the day number). NEVER opens a form — every click is
// navigational: the cell jumps to that day's week; an item jumps to its week +
// selects/scrolls to it; "+N more" jumps to the week. Colours reuse resolveColor.
const MAX = 3

export default function MonthCell({ day, inMonth, isToday, isFocus, items, stripPad, byId, onJumpDay, onJumpItem }) {
  const rows = [
    ...items.events.map((e) => ({ kind: 'event', item: e })),
    ...items.tasks.map((t) => ({ kind: 'task', item: t })),
  ]
  const shown = rows.slice(0, MAX)
  const more = rows.length - shown.length

  const hexOf = (it) => {
    const cat = it.category_id ? byId.get(it.category_id) : null
    return cat ? resolveColor(cat, byId) : colorHex(INBOX_COLOR) || '#6B7280'
  }
  const msOf = (row) =>
    row.kind === 'event'
      ? new Date(row.item.start_at).getTime()
      : row.item.scheduled_start
        ? new Date(row.item.scheduled_start).getTime()
        : null

  return (
    <div
      className={'mv-cell' + (inMonth ? '' : ' is-out') + (isFocus ? ' is-focus' : '')}
      style={{ paddingTop: stripPad }}
      onClick={() => onJumpDay(day)}
    >
      <span className={'mv-daynum' + (isToday ? ' is-today' : '')}>{day.getDate()}</span>
      <div className="mv-items">
        {shown.map((row) => {
          const hex = hexOf(row.item)
          const done = row.kind === 'task' && row.item.status === 'done'
          return (
            <button
              key={row.kind + ':' + row.item.id}
              className={'mv-item' + (row.kind === 'task' ? ' is-task' : '') + (done ? ' is-done' : '')}
              onClick={(e) => {
                e.stopPropagation()
                onJumpItem(day, { id: row.item.id, ms: msOf(row) })
              }}
            >
              <span
                className="mv-item-dot"
                style={row.kind === 'task' ? { borderColor: hex } : { background: hex }}
              />
              <span className="mv-item-title">{row.item.title}</span>
            </button>
          )
        })}
        {more > 0 && (
          <button className="mv-more" onClick={(e) => { e.stopPropagation(); onJumpDay(day) }}>
            +{more} more
          </button>
        )}
      </div>
    </div>
  )
}
