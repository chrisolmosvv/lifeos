import { useRef, useState } from 'react'
import { HOUR_HEIGHT } from './dateUtils'

// Direct-manipulation drag for the timeline, shared by the day column and the
// week. The geometry is injected so the same hook serves both: `minutesAt(y)`
// gives the snapped-to-grid minutes from midnight, and `dayStartMsAt(x)` gives
// the target day under the pointer (constant on the day view; the column under
// the pointer on the week — that's how cross-day dragging works). The block
// follows the pointer; on release the caller routes the save by item kind.
//
// Tap-vs-drag: a press only becomes a drag past THRESHOLD px (any direction);
// selection stays on the click. Touch never starts a drag.
//
// Flags: `allowResize` (day only — edge-drag changes start/end; off on the week)
// and `allowUnschedule` (day only — drag a task off the right edge to unschedule).
const THRESHOLD = 4
const SNAP = 15
const MIN_DUR = 15
const EDGE = 7
const DAY = 24 * 60
const EDGE_SCROLL = 24

export function useEventDrag({
  geometry,
  scrollRef,
  onDrop,
  onSelect,
  onUnschedule,
  allowResize = true,
  allowUnschedule = false,
}) {
  const [preview, setPreview] = useState(null)
  const drag = useRef(null)
  const justDragged = useRef(false)

  const snap = (m) => Math.round(m / SNAP) * SNAP
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const minToPx = (m) => (m / 60) * HOUR_HEIGHT
  const midnightMs = (ms) => {
    const d = new Date(ms)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }

  function offGrid(clientX) {
    const el = scrollRef.current
    return el ? clientX > el.getBoundingClientRect().right : false
  }
  function autoScroll(clientY) {
    const el = scrollRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (clientY < r.top + EDGE_SCROLL) el.scrollTop -= 8
    else if (clientY > r.bottom - EDGE_SCROLL) el.scrollTop += 8
  }

  function start(e, item) {
    justDragged.current = false
    if (e.pointerType === 'touch') return
    if (e.pointerType === 'mouse' && e.button !== 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const localY = e.clientY - rect.top
    const edge = Math.min(EDGE, rect.height / 3)
    const mode = !allowResize
      ? 'move'
      : localY <= edge
        ? 'top'
        : localY >= rect.height - edge
          ? 'bottom'
          : 'move'

    const itemDayStart = midnightMs(new Date(item.start_at).getTime())
    const startMin = (new Date(item.start_at).getTime() - itemDayStart) / 60000
    const endMin = (new Date(item.end_at).getTime() - itemDayStart) / 60000
    const refMin = mode === 'bottom' ? endMin : startMin

    drag.current = {
      item,
      mode,
      itemDayStart,
      startMin,
      endMin,
      durMin: endMin - startMin,
      downX: e.clientX,
      downY: e.clientY,
      grabOffsetMin: geometry.minutesAt(e.clientY) - refMin,
      moved: false,
      curStartMs: null,
      curEndMs: null,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onMove(e) {
    const d = drag.current
    if (!d) return
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.downX, e.clientY - d.downY) < THRESHOLD) return
      d.moved = true
    }
    autoScroll(e.clientY)

    const edgeMin = snap(geometry.minutesAt(e.clientY) - d.grabOffsetMin)
    // Move can change the day (the column under the pointer); resize can't.
    const dayStart = d.mode === 'move' ? geometry.dayStartMsAt(e.clientX) : d.itemDayStart
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
    d.curStartMs = dayStart + s * 60000
    d.curEndMs = dayStart + en * 60000
    const removing = allowUnschedule && d.item.kind === 'task' && offGrid(e.clientX)
    setPreview({
      id: d.item.id,
      dayStartMs: dayStart,
      top: minToPx(s),
      height: minToPx(en - s),
      removing,
    })
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
    if (allowUnschedule && d.item.kind === 'task' && offGrid(e.clientX)) {
      onUnschedule(d.item)
      return
    }
    const origStart = new Date(d.item.start_at).getTime()
    const origEnd = new Date(d.item.end_at).getTime()
    if (d.curStartMs !== origStart || d.curEndMs !== origEnd) {
      onDrop(
        d.item,
        new Date(d.curStartMs).toISOString(),
        new Date(d.curEndMs).toISOString(),
      )
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
