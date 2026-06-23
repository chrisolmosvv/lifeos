import { useRef, useState } from 'react'
import { HOUR_HEIGHT } from '../dateUtils'

// Today-scoped grid interactions (Phase 7, T5). A SEPARATE, sealed twin of the
// calendar's useEventDrag/useScheduleDrag — built Today-side on purpose so it can
// speak Today's own 7am-offset coordinate system and its two module drop-zones
// WITHOUT touching any shared drag code (Calendar is left exactly as it was).
// It reuses only the pure overlap maths (eventLayout) read-only, in DayGrid.
//
// Gestures (mouse only — touch keeps tapping):
//  • background drag on the empty lane  → draw a span → onCreate(startIso,endIso)
//  • drag a block                       → move / resize (15-min snap) → onMove
//  • drag a TASK block onto a module     → onOffTo('today'|'next7', item)
//  • drag a row's grip onto the grid     → onSchedule(taskId, startIso, endIso)
// A press only becomes a drag past THRESHOLD px; a plain tap still selects.
const THRESHOLD = 4
const SNAP = 15
const MIN_DUR = 15 // minimum block length, minutes
const EDGE = 7 // edge zone (px) that means "resize" instead of "move"
const START_MIN = 7 * 60 // the lane's y=0 is 7am
const DAY = 24 * 60

export function useTodayGrid({
  scrollRef,
  laneRef,
  todayModRef,
  weekModRef,
  today,
  onCreate,
  onMove,
  onSchedule,
  onOffTo,
  onSelect,
}) {
  const [blockPreview, setBlockPreview] = useState(null) // {id,startMs,endMs,off}
  const [createDraft, setCreateDraft] = useState(null) // {startMs,endMs}
  const [ghost, setGhost] = useState(null) // {x,y,title}
  const drag = useRef(null)
  const justDragged = useRef(false)

  const dayStartMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const snap = (m) => Math.round(m / SNAP) * SNAP
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const isoAt = (min) => new Date(dayStartMs + min * 60000).toISOString()

  // Minutes-from-midnight at a screen Y, using the lane's live top (it already
  // accounts for the column's scroll). The lane's y=0 is 7am (START_MIN).
  function minutesAt(clientY) {
    const r = laneRef.current.getBoundingClientRect()
    return START_MIN + ((clientY - r.top) / HOUR_HEIGHT) * 60
  }
  function inRect(ref, x, y) {
    const el = ref.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }
  // Which module the pointer is over (for dragging a block off-grid).
  function moduleAt(x, y) {
    if (inRect(todayModRef, x, y)) return 'today'
    if (inRect(weekModRef, x, y)) return 'next7'
    return null
  }

  // --- starting each gesture ------------------------------------------------
  function startBlock(e, item) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.stopPropagation() // don't also start a background "create"
    const rect = e.currentTarget.getBoundingClientRect()
    const localY = e.clientY - rect.top
    const edge = Math.min(EDGE, rect.height / 3)
    const mode = localY <= edge ? 'top' : localY >= rect.height - edge ? 'bottom' : 'move'
    const startMin = (new Date(item.start_at).getTime() - dayStartMs) / 60000
    const endMin = (new Date(item.end_at).getTime() - dayStartMs) / 60000
    const ref = mode === 'bottom' ? endMin : startMin
    drag.current = {
      type: 'block', item, mode, startMin, endMin, dur: endMin - startMin,
      downX: e.clientX, downY: e.clientY, grab: minutesAt(e.clientY) - ref,
      moved: false, cur: null,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function startCreate(e) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    const m = snap(minutesAt(e.clientY))
    drag.current = { type: 'create', startMin: m, downX: e.clientX, downY: e.clientY, moved: false, curMin: m }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function startTray(e, task) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.stopPropagation()
    drag.current = { type: 'tray', task, downX: e.clientX, downY: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  // --- shared move / end ----------------------------------------------------
  function passedThreshold(d, e) {
    if (d.moved) return true
    if (Math.hypot(e.clientX - d.downX, e.clientY - d.downY) < THRESHOLD) return false
    d.moved = true
    return true
  }

  function handleMove(e) {
    const d = drag.current
    if (!d || !passedThreshold(d, e)) return

    if (d.type === 'block') {
      const edgeMin = snap(minutesAt(e.clientY) - d.grab)
      let s = d.startMin
      let en = d.endMin
      if (d.mode === 'move') {
        s = clamp(edgeMin, 0, DAY - d.dur)
        en = s + d.dur
      } else if (d.mode === 'top') {
        s = clamp(edgeMin, 0, d.endMin - MIN_DUR)
      } else {
        en = clamp(edgeMin, d.startMin + MIN_DUR, DAY)
      }
      d.cur = { s, en }
      const off = d.item.kind === 'task' ? moduleAt(e.clientX, e.clientY) : null
      setBlockPreview({ id: d.item.id, startMs: dayStartMs + s * 60000, endMs: dayStartMs + en * 60000, off })
    } else if (d.type === 'create') {
      d.curMin = snap(minutesAt(e.clientY))
      const a = clamp(Math.min(d.startMin, d.curMin), 0, DAY)
      let b = clamp(Math.max(d.startMin, d.curMin), 0, DAY)
      if (b - a < MIN_DUR) b = Math.min(a + MIN_DUR, DAY)
      setCreateDraft({ startMs: dayStartMs + a * 60000, endMs: dayStartMs + b * 60000 })
    } else if (d.type === 'tray') {
      setGhost({ x: e.clientX, y: e.clientY, title: d.task.title })
    }
  }

  function handleEnd(e) {
    const d = drag.current
    if (!d) return
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    drag.current = null
    setBlockPreview(null)
    setCreateDraft(null)
    setGhost(null)

    if (d.type === 'block') {
      justDragged.current = d.moved
      if (!d.moved) return // a tap → the onClick handler opens the editor
      const target = d.item.kind === 'task' ? moduleAt(e.clientX, e.clientY) : null
      if (target) return onOffTo(target, d.item)
      if (d.item.kind === 'event' && moduleAt(e.clientX, e.clientY)) return // events snap back
      const s = dayStartMs + d.cur.s * 60000
      const en = dayStartMs + d.cur.en * 60000
      if (s !== new Date(d.item.start_at).getTime() || en !== new Date(d.item.end_at).getTime()) {
        onMove(d.item, new Date(s).toISOString(), new Date(en).toISOString())
      }
    } else if (d.type === 'create') {
      let a
      let b
      if (d.moved) {
        a = Math.min(d.startMin, d.curMin)
        b = Math.max(d.startMin, d.curMin)
        if (b - a < MIN_DUR) b = a + MIN_DUR
      } else {
        a = d.startMin
        b = d.startMin + 60 // a plain click → a 1-hour block
      }
      a = clamp(a, 0, DAY - MIN_DUR)
      b = clamp(b, a + MIN_DUR, DAY)
      onCreate(isoAt(a), isoAt(b))
    } else if (d.type === 'tray') {
      if (d.moved && inRect(scrollRef, e.clientX, e.clientY)) {
        const min = clamp(snap(minutesAt(e.clientY)), 0, DAY - 60)
        onSchedule(d.task.id, isoAt(min), isoAt(min + 60))
      }
    }
  }

  function handleCancel() {
    drag.current = null
    setBlockPreview(null)
    setCreateDraft(null)
    setGhost(null)
  }

  const moveEnd = {
    onPointerMove: handleMove,
    onPointerUp: handleEnd,
    onPointerCancel: handleCancel,
  }
  const blockBind = (item) => ({
    onPointerDown: (e) => startBlock(e, item),
    ...moveEnd,
    onClick: (e) => {
      e.stopPropagation()
      if (justDragged.current) { justDragged.current = false; return }
      onSelect(item)
    },
  })
  const backgroundBind = { onPointerDown: startCreate, ...moveEnd }
  const trayBind = (task) => ({ onPointerDown: (e) => startTray(e, task), ...moveEnd })

  return { blockPreview, createDraft, ghost, blockBind, backgroundBind, trayBind }
}
