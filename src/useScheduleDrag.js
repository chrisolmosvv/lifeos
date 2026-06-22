import { useRef, useState } from 'react'
import { HOUR_HEIGHT } from './dateUtils'

// Drag a task from its list row onto the day grid to schedule it. A small grip
// on the row starts this; a calm ghost chip follows the pointer; on drop over
// the grid the task gets scheduled_start at the drop time and scheduled_end one
// hour later (snapped to 15 min). Mouse only — touch never starts a drag, so the
// phone keeps tapping as before. Separate from the grid-block drag (different
// source and gesture); the move/resize of a placed block reuses useEventDrag.
const THRESHOLD = 4
const SNAP = 15
const DAY = 24 * 60

export function useScheduleDrag({ today, scrollRef, onSchedule }) {
  const [ghost, setGhost] = useState(null) // {x, y, title} | null
  const st = useRef(null)

  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const snap = (min) => Math.round(min / SNAP) * SNAP
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const isoAt = (min) => new Date(dayStart + min * 60000).toISOString()

  function start(e, task) {
    if (e.pointerType === 'touch') return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    st.current = { task, downX: e.clientX, downY: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function move(e) {
    const s = st.current
    if (!s) return
    if (!s.moved) {
      if (Math.hypot(e.clientX - s.downX, e.clientY - s.downY) < THRESHOLD) return
      s.moved = true
    }
    setGhost({ x: e.clientX, y: e.clientY, title: s.task.title })
  }

  function end(e) {
    const s = st.current
    if (!s) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    st.current = null
    setGhost(null)
    if (!s.moved) return // a tap on the grip → nothing to schedule

    const el = scrollRef.current
    const rect = el.getBoundingClientRect()
    const over =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    if (!over) return // dropped off the grid → no change

    const min = clamp(
      snap(((e.clientY - rect.top + el.scrollTop) / HOUR_HEIGHT) * 60),
      0,
      DAY - 60,
    )
    onSchedule(s.task.id, isoAt(min), isoAt(min + 60))
  }

  function cancel() {
    st.current = null
    setGhost(null)
  }

  const bind = (task) => ({
    onPointerDown: (e) => start(e, task),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: cancel,
  })

  return { ghost, bind }
}
