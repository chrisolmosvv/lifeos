import { useRef, useState } from 'react'
import { HOUR_HEIGHT } from './dateUtils'

// Direct-manipulation drag for the day column: move an event (duration fixed) or
// resize it by its top/bottom edge. Kept apart from the render so the gesture
// logic is isolated and testable.
//
// The tap-vs-drag rule is the careful bit: a press only becomes a drag once the
// pointer crosses THRESHOLD px. Selection (open the edit panel) stays on the
// native click — so a plain tap, and a touch tap, still open the panel; a real
// drag sets a flag that swallows the click that follows it. Touch never starts a
// drag, so narrow screens keep tap-to-edit / tap-to-create exactly as before.
const THRESHOLD = 4 // px before a press counts as a drag
const SNAP = 15 // snap to 15-minute steps
const MIN_DUR = 15 // an event can't get shorter than one snap step (no backwards end)
const EDGE = 7 // px hit zone at each edge for resize
const DAY = 24 * 60
const EDGE_SCROLL = 24 // auto-scroll when the pointer is within this of an edge

export function useEventDrag({ today, scrollRef, onSave, onSelect }) {
  const [preview, setPreview] = useState(null) // {id, top, height} while dragging
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

  // Pointer's Y in the scroll content (so auto-scroll stays correct).
  function contentY(clientY) {
    const el = scrollRef.current
    const rect = el.getBoundingClientRect()
    return clientY - rect.top + el.scrollTop
  }

  function autoScroll(clientY) {
    const el = scrollRef.current
    const rect = el.getBoundingClientRect()
    if (clientY < rect.top + EDGE_SCROLL) el.scrollTop -= 8
    else if (clientY > rect.bottom - EDGE_SCROLL) el.scrollTop += 8
  }

  function start(e, ev) {
    justDragged.current = false
    if (e.pointerType === 'touch') return // touch keeps native scroll / tap
    if (e.pointerType === 'mouse' && e.button !== 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const localY = e.clientY - rect.top
    const edge = Math.min(EDGE, rect.height / 3) // always leave a move zone
    const mode =
      localY <= edge ? 'top' : localY >= rect.height - edge ? 'bottom' : 'move'

    const startMin = (new Date(ev.start_at).getTime() - dayStart) / 60000
    const endMin = (new Date(ev.end_at).getTime() - dayStart) / 60000
    const refPx = minToPx(mode === 'bottom' ? endMin : startMin)

    drag.current = {
      id: ev.id,
      mode,
      startMin,
      endMin,
      durMin: endMin - startMin,
      downY: e.clientY,
      grabOffset: contentY(e.clientY) - refPx,
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
    setPreview({ id: d.id, top: minToPx(s), height: minToPx(en - s) })
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
    if (d.moved && (d.curStart !== d.startMin || d.curEnd !== d.endMin)) {
      onSave(d.id, { start_at: isoAt(d.curStart), end_at: isoAt(d.curEnd) })
    }
  }

  function onCancel() {
    drag.current = null
    setPreview(null)
  }

  // A block click: never let it reach the grid (which would create an event),
  // and open the edit panel only when this wasn't the tail of a drag.
  function onClickBlock(e, ev) {
    e.stopPropagation()
    if (justDragged.current) return
    onSelect(ev)
  }

  // The handlers a block element spreads.
  const bind = (ev) => ({
    onPointerDown: (e) => start(e, ev),
    onPointerMove: onMove,
    onPointerUp: onEnd,
    onPointerCancel: onCancel,
    onClick: (e) => onClickBlock(e, ev),
  })

  return { preview, bind }
}
