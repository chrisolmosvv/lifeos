import { useRef, useState } from 'react'
import { HOUR_HEIGHT } from './dateUtils'

// Direct-manipulation drag for the day column: move a block (duration fixed) or
// resize it by its top/bottom edge. Works for both events and scheduled-task
// blocks — the caller routes the save by the item's `kind`. Dragging a TASK
// block off the right edge of the grid unschedules it. Kept apart from the
// render so the gesture logic is isolated and testable.
//
// Tap-vs-drag: a press only becomes a drag past THRESHOLD px. Selection stays on
// the native click (so taps, incl. touch taps, still work); a real drag swallows
// the click that follows it. Touch never starts a drag.
const THRESHOLD = 4
const SNAP = 15
const MIN_DUR = 15
const EDGE = 7
const DAY = 24 * 60
const EDGE_SCROLL = 24

export function useEventDrag({ today, scrollRef, onDrop, onSelect, onUnschedule }) {
  const [preview, setPreview] = useState(null) // {id, top, height, removing}
  const drag = useRef(null)
  const justDragged = useRef(false)

  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()

  const snap = (min) => Math.round(min / SNAP) * SNAP
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const minToPx = (min) => (min / 60) * HOUR_HEIGHT
  const isoAt = (min) => new Date(dayStart + min * 60000).toISOString()

  function contentY(clientY) {
    const el = scrollRef.current
    const rect = el.getBoundingClientRect()
    return clientY - rect.top + el.scrollTop
  }
  // Dragged a task block out past the grid's right edge → drop onto the list.
  function offGrid(clientX) {
    const el = scrollRef.current
    return clientX > el.getBoundingClientRect().right
  }
  function autoScroll(clientY) {
    const el = scrollRef.current
    const rect = el.getBoundingClientRect()
    if (clientY < rect.top + EDGE_SCROLL) el.scrollTop -= 8
    else if (clientY > rect.bottom - EDGE_SCROLL) el.scrollTop += 8
  }

  function start(e, item) {
    justDragged.current = false
    if (e.pointerType === 'touch') return
    if (e.pointerType === 'mouse' && e.button !== 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const localY = e.clientY - rect.top
    const edge = Math.min(EDGE, rect.height / 3)
    const mode =
      localY <= edge ? 'top' : localY >= rect.height - edge ? 'bottom' : 'move'

    const startMin = (new Date(item.start_at).getTime() - dayStart) / 60000
    const endMin = (new Date(item.end_at).getTime() - dayStart) / 60000
    drag.current = {
      item,
      mode,
      startMin,
      endMin,
      durMin: endMin - startMin,
      downY: e.clientY,
      grabOffset: contentY(e.clientY) - minToPx(mode === 'bottom' ? endMin : startMin),
      moved: false,
      curStart: null,
      curEnd: null,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onMove(e) {
    const d = drag.current
    if (!d) return
    if (!d.moved) {
      if (Math.abs(e.clientY - d.downY) < THRESHOLD) return
      d.moved = true
    }
    autoScroll(e.clientY)

    const edgeMin = snap(((contentY(e.clientY) - d.grabOffset) / HOUR_HEIGHT) * 60)
    let s = d.startMin
    let en = d.endMin
    if (d.mode === 'move') {
      s = clamp(edgeMin, 0, DAY - d.durMin)
      en = s + d.durMin
    } else if (d.mode === 'top') {
      s = clamp(edgeMin, 0, d.endMin - MIN_DUR)
    } else {
      en = clamp(edgeMin, d.startMin + MIN_DUR, DAY)
    }
    d.curStart = s
    d.curEnd = en
    const removing = d.item.kind === 'task' && offGrid(e.clientX)
    setPreview({ id: d.item.id, top: minToPx(s), height: minToPx(en - s), removing })
  }

  function onEnd(e) {
    const d = drag.current
    if (!d) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    drag.current = null
    setPreview(null)
    justDragged.current = d.moved
    if (!d.moved) return
    if (d.item.kind === 'task' && offGrid(e.clientX)) {
      onUnschedule(d.item)
    } else if (d.curStart !== d.startMin || d.curEnd !== d.endMin) {
      onDrop(d.item, isoAt(d.curStart), isoAt(d.curEnd))
    }
  }

  function onCancel() {
    drag.current = null
    setPreview(null)
  }

  function onClickBlock(e, item) {
    e.stopPropagation()
    if (justDragged.current) return
    onSelect(item)
  }

  const bind = (item) => ({
    onPointerDown: (e) => start(e, item),
    onPointerMove: onMove,
    onPointerUp: onEnd,
    onPointerCancel: onCancel,
    onClick: (e) => onClickBlock(e, item),
  })

  return { preview, bind }
}
