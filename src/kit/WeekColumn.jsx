import { buildDayItems, layoutEvents } from '../eventLayout'
import { colorHex, INBOX_COLOR } from '../palette'
import { resolveColor } from '../colorModel'
import { HOUR_HEIGHT } from '../dateUtils'
import TintedBlock from './TintedBlock'
import './gridCursor.css'

// One day column of the week sheet (Phase 7, C2). Renders the hour backdrop, the
// day's tinted title-only blocks (even-split via the shared layout maths), the
// past veil, today's now-line, and — while dragging — the live create-draft and
// the re-split that follows the dragged block across columns. Interaction is owned
// by useWeekGrid (wired in WeekView); this column only spreads its binds. Sealed.
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function WeekColumn({
  dayStart,
  isToday,
  isPastDay,
  isWeekend,
  events,
  scheduled,
  byId,
  nowH,
  selectedId,
  blockPreview,
  createDraft,
  blockBind,
  backgroundBind,
  appearing,
}) {
  // This column's own blocks, adjusted live for a drag: the dragged block leaves
  // its source column and joins whichever column it's currently over, so the
  // even-split re-splits in both during the drag.
  let items = buildDayItems(events, scheduled)
  if (blockPreview) {
    items = items.filter((it) => it.id !== blockPreview.id)
    if (blockPreview.dayStartMs === dayStart && !blockPreview.off && blockPreview.item) {
      items.push({
        ...blockPreview.item,
        start_at: new Date(blockPreview.startMs).toISOString(),
        end_at: new Date(blockPreview.endMs).toISOString(),
      })
    }
  }
  const laidOut = layoutEvents(items, dayStart)
  const veilH = isPastDay ? 24 * HOUR_HEIGHT : isToday ? nowH * HOUR_HEIGHT : 0
  const draftHere = createDraft && createDraft.dayStartMs === dayStart

  return (
    <div
      className={'wk-col kit-create-cursor' + (isWeekend ? ' is-weekend' : '') + (isToday ? ' is-today' : '')}
      {...backgroundBind}
    >
      {HOURS.map((h) => (
        <div className="wk-hour" key={h} />
      ))}

      {laidOut.map((it) => {
        const ev = it.ev
        const cat = ev.category_id ? byId.get(ev.category_id) : null
        const hex = cat ? resolveColor(cat, byId) : colorHex(INBOX_COLOR) || '#6B7280'
        const isDone = ev.kind === 'task' && ev.status === 'done'
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
            bind={blockBind(ev, dayStart)}
            dragging={blockPreview?.id === ev.id}
            removing={blockPreview?.id === ev.id && !!blockPreview.off}
            selected={ev.id === selectedId}
            appearDelay={appearing?.get(ev.kind + ':' + ev.id)}
          />
        )
      })}

      {draftHere && (
        <div
          className="wk-draft"
          style={{
            top: ((createDraft.startMs - dayStart) / 3600000) * HOUR_HEIGHT,
            height: ((createDraft.endMs - createDraft.startMs) / 3600000) * HOUR_HEIGHT,
          }}
        />
      )}

      {veilH > 0 && <div className="wk-pastveil" style={{ height: veilH }} />}
      {isToday && nowH >= 0 && nowH < 24 && (
        <div className="wk-now" style={{ top: nowH * HOUR_HEIGHT }} />
      )}
    </div>
  )
}
