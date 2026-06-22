import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import {
  HOURS,
  formatHour,
  isSameDay,
  dayName,
  formatRange,
  nowScrollTop,
} from './dateUtils'
import DayColumn from './DayColumn'
import './calendar.css'

// Desktop week view (read-only): seven day columns Mon–Sun, each a shared
// DayColumn showing that day's events + scheduled tasks (same blocks, dotted
// tasks, overlap split as the day column). The now-line shows on today. The grid
// scrolls through the hours internally; the page itself stays put. Reads only —
// no schema change. Editing on the week is the next piece (4g).
export default function WeekCalendar({ days, today }) {
  const scrollRef = useRef(null)
  const [events, setEvents] = useState([])
  const [scheduled, setScheduled] = useState([])
  const [cats, setCats] = useState([])

  useEffect(() => {
    async function load() {
      const weekStart = new Date(days[0])
      const weekEnd = new Date(days[0])
      weekEnd.setDate(weekEnd.getDate() + 7)
      const inWeek = (q, col) =>
        q.gte(col, weekStart.toISOString()).lt(col, weekEnd.toISOString())

      const [evRes, taskRes, catRes] = await Promise.all([
        inWeek(
          supabase.from('events').select('id, title, start_at, end_at, category_id'),
          'start_at',
        ).order('start_at', { ascending: true }),
        inWeek(
          supabase
            .from('tasks')
            .select('id, title, status, category_id, scheduled_start, scheduled_end'),
          'scheduled_start',
        ),
        supabase.from('categories').select('id, name, color'),
      ])
      setEvents(evRes.data || [])
      setScheduled(taskRes.data || [])
      setCats(catRes.data || [])
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Open around now / 7am, like the day column.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = nowScrollTop(el.clientHeight)
  }, [])

  return (
    <div className="cal-scroll" ref={scrollRef}>
      <div className="cal-head">
        <div className="cal-corner">
          <span className="cal-range">{formatRange(days)}</span>
        </div>
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={'cal-dayhead' + (isSameDay(d, today) ? ' is-today' : '')}
          >
            <span className="dh-name">{dayName(d)}</span>
            <span className="dh-num">{d.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="cal-body">
        <div className="cal-times">
          {HOURS.map((h) => (
            <div className="cal-time-cell" key={h}>
              <span>{formatHour(h)}</span>
            </div>
          ))}
        </div>

        {days.map((d) => {
          const isToday = isSameDay(d, today)
          const dayStart = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate(),
          ).getTime()
          return (
            <DayColumn
              key={d.toISOString()}
              events={events.filter((e) => isSameDay(new Date(e.start_at), d))}
              scheduledTasks={scheduled.filter((t) =>
                isSameDay(new Date(t.scheduled_start), d),
              )}
              cats={cats}
              dayStart={dayStart}
              showNow={isToday}
              className={isToday ? 'is-today' : ''}
            />
          )
        })}
      </div>
    </div>
  )
}
