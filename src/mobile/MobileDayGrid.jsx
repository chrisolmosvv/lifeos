// The mobile day grid: hour lines, category-tinted blocks, terracotta now-line,
// touch-swipe for day paging. View-only in Phase 2 (no drag, no long-press-create).
// Blocks positioned via spine's layoutEvents (pure math). 7am–midnight default,
// expandable to full 24h via "show earlier".

import { useEffect, useRef, useState } from 'react'
import { HOUR_HEIGHT, formatHour } from '../spine/logic/dateUtils'
import { buildDayItems, layoutEvents } from '../spine/logic/eventLayout'
import MobileBlock from './MobileBlock'

const DEFAULT_START = 7
const END = 24

export default function MobileDayGrid({
  events, scheduledTasks, cats, viewed, isToday, onSwipe, onEditBlock,
}) {
  const [showEarly, setShowEarly] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const nowRef = useRef(null)
  const gridRef = useRef(null)
  const touchRef = useRef({})

  const startHour = showEarly ? 0 : DEFAULT_START
  const hours = Array.from({ length: END - startHour }, (_, i) => startHour + i)
  const offset = startHour * HOUR_HEIGHT

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll to the now-line (today) on mount
  useEffect(() => {
    if (isToday && nowRef.current) {
      nowRef.current.scrollIntoView({ block: 'center' })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Touch swipe for day paging (horizontal only)
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const t = touchRef.current
    function onStart(e) {
      t.sx = e.touches[0].clientX
      t.sy = e.touches[0].clientY
      t.lock = null
    }
    function onMove(e) {
      if (t.sx == null) return
      const dx = e.touches[0].clientX - t.sx
      const dy = e.touches[0].clientY - t.sy
      if (t.lock === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        t.lock = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      if (t.lock === 'h') e.preventDefault()
    }
    function onEnd(e) {
      if (t.lock !== 'h') { t.sx = null; return }
      const dx = e.changedTouches[0].clientX - t.sx
      if (Math.abs(dx) > 50) onSwipe(dx < 0 ? 1 : -1)
      t.sx = null
      t.lock = null
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onSwipe])

  // Layout computation
  const dayStartMs = new Date(
    viewed.getFullYear(), viewed.getMonth(), viewed.getDate(),
  ).getTime()
  const catById = new Map(cats.map((c) => [c.id, c]))
  const items = buildDayItems(events, scheduledTasks)
  const laidOut = layoutEvents(items, dayStartMs).filter((it) => it.top + it.height > offset)

  // Cap visible columns at 2; overflow becomes "+N"
  const visible = laidOut.filter((it) => it.cols <= 2 || it.col < 2)
  const hidden = laidOut.filter((it) => it.cols > 2 && it.col >= 2)
  const overflows = []
  if (hidden.length) {
    let grp = [hidden[0]]
    for (let i = 1; i < hidden.length; i++) {
      if (Math.abs(hidden[i].top - grp[0].top) < HOUR_HEIGHT) grp.push(hidden[i])
      else { overflows.push({ top: grp[0].top - offset, n: grp.length }); grp = [hidden[i]] }
    }
    overflows.push({ top: grp[0].top - offset, n: grp.length })
  }

  const nowH = now.getHours() + now.getMinutes() / 60
  const showNow = isToday && nowH >= startHour && nowH < END
  const empty = laidOut.length === 0

  return (
    <div className="m-grid" ref={gridRef}>
      {!showEarly && (
        <button className="m-grid-expand" onClick={() => setShowEarly(true)} type="button">
          Show earlier
        </button>
      )}
      <div className="m-grid-inner" style={{ height: hours.length * HOUR_HEIGHT }}>
        <div className="m-grid-times">
          {hours.map((h) => (
            <div className="m-grid-time" key={h} style={{ height: HOUR_HEIGHT }}>
              {formatHour(h)}
            </div>
          ))}
        </div>
        <div className="m-grid-lane">
          {hours.map((h) => <div className="m-grid-hour" key={h} style={{ height: HOUR_HEIGHT }} />)}

          {visible.map((it) => {
            const ev = it.ev
            const cat = ev.category_id ? catById.get(ev.category_id) : null
            const isPast = isToday && (it.top + it.height) / HOUR_HEIGHT < nowH
            return (
              <MobileBlock
                key={ev.kind + ':' + ev.id}
                item={ev} cat={cat} catById={catById}
                top={it.top - offset} height={it.height}
                col={it.col} cols={Math.min(it.cols, 2)}
                isPast={isPast}
                onEdit={onEditBlock}
              />
            )
          })}

          {overflows.map((m, i) => (
            <div key={'ov' + i} className="m-overflow" style={{ top: m.top }}>+{m.n}</div>
          ))}

          {showNow && (
            <div className="m-now-line" ref={nowRef} style={{ top: nowH * HOUR_HEIGHT - offset }}>
              <div className="m-now-dot" />
            </div>
          )}

          {empty && <p className="m-empty">A clear page today.</p>}
        </div>
      </div>
    </div>
  )
}
