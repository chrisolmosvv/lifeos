import { HOURS } from './dateUtils'
import NowLine from './NowLine'
import EventBlock from './EventBlock'
import { buildDayItems, layoutEvents } from './eventLayout'
import './dayTimeline.css'

// One day's column of the timeline — the hour-cell backdrop, the events +
// scheduled tasks laid out as blocks (overlaps split side by side), and the
// now-line on today. Shared by the day view (interactive: drag/create) and the
// week view (read-only). Interactive bits are opt-in via props, so the same
// render serves both without duplicating it.
export default function DayColumn({
  events,
  scheduledTasks,
  cats,
  dayStart,
  showNow,
  className = '',
  interactive = false,
  onColClick,
  bind, // (item) => pointer/click handlers, interactive only
  preview, // the active drag preview, interactive only
  onUnscheduleTask, // interactive only
}) {
  const catById = new Map(cats.map((c) => [c.id, c]))
  const laidOut = layoutEvents(buildDayItems(events, scheduledTasks), dayStart)

  return (
    <div className={'cal-col ' + className} onClick={onColClick}>
      {HOURS.map((h) => (
        <div className="cal-hour-cell" key={h} />
      ))}

      {laidOut.map((it) => {
        const dragging = interactive && preview?.id === it.ev.id
        return (
          <EventBlock
            key={it.ev.kind + ':' + it.ev.id}
            ev={it.ev}
            cat={it.ev.category_id ? catById.get(it.ev.category_id) : null}
            top={dragging ? preview.top : it.top}
            height={dragging ? preview.height : it.height}
            col={dragging ? 0 : it.col}
            cols={dragging ? 1 : it.cols}
            dragging={dragging}
            removing={dragging && preview.removing}
            interactive={interactive}
            handlers={interactive ? bind(it.ev) : undefined}
            onUnschedule={
              interactive && it.ev.kind === 'task'
                ? () => onUnscheduleTask(it.ev.id)
                : undefined
            }
          />
        )
      })}

      {showNow && <NowLine />}
    </div>
  )
}
