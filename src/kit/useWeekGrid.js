import { useRef, useState } from 'react'
import { HOUR_HEIGHT } from '../dateUtils'

// Week-grid interactions (Phase 7, C2) — the deliberate SIBLING of Today's
// `useTodayGrid`. It mirrors that hook's shapes + conventions as closely as the
// week allows (the same SNAP / THRESHOLD / EDGE / MIN_DUR, the same gesture
// skeleton, the blockPreview / createDraft shapes, the bind pattern) so that C4
// can collapse the two into ONE grid hook cheaply. Built on the kit — NOT on the
// old `useEventDrag`/`useScheduleDrag` (the engine C4 deletes) — and WITHOUT
// touching `useTodayGrid`, so shipped Today stays byte-for-byte.
//
// Documented divergences from useTodayGrid (the cost we collapse in C4):
//  • N columns: the day under pointer-X re-days a MOVE (horizontal = day only,
//    vertical = time, diagonal = both; a pure sideways drag never nudges time).
//  • y=0 is MIDNIGHT (START_MIN = 0), not Today's 7am.
//  • off-grid drops a TASK to unscheduled (clears its time); an EVENT snaps back.
//  • no tray yet (C5) → no `trayBind`/`ghost`; instead a live `dragLabel`
//    (`14:15–15:15`) which Today doesn't have today.
//
// Gestures (mouse only — touch keeps tapping):
//  • press a block        → move / resize (15-min snap), re-day across columns
//  • press an empty column → click = 1-hour block, drag = exact span → onCreate
//  • drag a task off-grid  → onUnschedule(item)
const THRESHOLD = 4
const SNAP = 15
const MIN_DUR = 15
const EDGE = 7
const START_MIN = 0 // the week lane's y=0 is midnight (Today's is 7am)
const DAY = 24 * 60
const GUTTER = 52 // px; must match .wk-gutter / .wk-corner width in weekGrid.css

export function useWeekGrid({ scrollRef, bodyRef, days, onCreate, onMove, onUnschedule, onSelect }) {
  const [blockPreview, setBlockPreview] = useState(null) // {id,item,dayStartMs,startMs,endMs,off}
  const [createDraft, setCreateDraft] = useState(null) // {dayStartMs,startMs,endMs}
  const [dragLabel, setDragLabel] = useState(null) // {x,y,text}
  const drag = useRef(null)
  const justDragged = useRef(false)

  const snap = (m) => Math.round(m / SNAP) * SNAP
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  // Minutes-from-midnight at a screen Y (the body's live top already accounts for
  // scroll). The body's y=0 is 00:00 (START_MIN).
  function minutesAt(clientY) {
    const r = bodyRef.current.getBoundingClientRect()
    return START_MIN + ((clientY - r.top) / HOUR_HEIGHT) * 60
  }
  // The day-column midnight under pointer-X — the re-day mechanism.
  function dayStartMsAt(clientX) {
    const r = bodyRef.current.getBoundingClientRect()
    const colW = (r.width - GUTTER) / 7
    const idx = clamp(Math.floor((clientX - r.left - GUTTER) / colW), 0, 6)
    return midnight(days[idx])
  }
  function offGrid(x, y) {
    const el = scrollRef.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x < r.left || x > r.right || y < r.top || y > r.bottom
  }
  const hhmm = (min) => {
    const m = clamp(Math.round(min), 0, DAY)
    const p = (n) => String(n).padStart(2, '0')
    return `${p(Math.floor(m / 60) % 24)}:${p(m % 60)}`
  }

  // --- start each gesture ---------------------------------------------------
  function startBlock(e, item, itemDayStartMs) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.stopPropagation() // don't also start a background "create"
    const rect = e.currentTarget.getBoundingClientRect()
    const localY = e.clientY - rect.top
    const edge = Math.min(EDGE, rect.height / 3)
    const mode = localY <= edge ? 'top' : localY >= rect.height - edge ? 'bottom' : 'move'
    const startMin = (new Date(item.start_at).getTime() - itemDayStartMs) / 60000
    const endMin = (new Date(item.end_at).getTime() - itemDayStartMs) / 60000
    const ref = mode === 'bottom' ? endMin : startMin
    drag.current = {
      type: 'block', item, itemDayStartMs, mode, startMin, endMin, dur: endMin - startMin,
      downX: e.clientX, downY: e.clientY, grab: minutesAt(e.clientY) - ref, moved: false, cur: null,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function startCreate(e) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    const m = snap(minutesAt(e.clientY))
    drag.current = {
      type: 'create', dayStartMs: dayStartMsAt(e.clientX), startMin: m,
      downX: e.clientX, downY: e.clientY, moved: false, curMin: m,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

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
      // Re-day only on a MOVE (the column under x); a resize never changes day.
      const dayStartMs = d.mode === 'move' ? dayStartMsAt(e.clientX) : d.itemDayStartMs
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
      d.cur = { dayStartMs, s, en }
      const off = offGrid(e.clientX, e.clientY)
      setBlockPreview({ id: d.item.id, item: d.item, dayStartMs, startMs: dayStartMs + s * 60000, endMs: dayStartMs + en * 60000, off })
      setDragLabel({ x: e.clientX, y: e.clientY, text: `${hhmm(s)}–${hhmm(en)}` })
    } else if (d.type === 'create') {
      d.curMin = snap(minutesAt(e.clientY))
      const a = clamp(Math.min(d.startMin, d.curMin), 0, DAY)
      let b = clamp(Math.max(d.startMin, d.curMin), 0, DAY)
      if (b - a < MIN_DUR) b = Math.min(a + MIN_DUR, DAY)
      setCreateDraft({ dayStartMs: d.dayStartMs, startMs: d.dayStartMs + a * 60000, endMs: d.dayStartMs + b * 60000 })
      setDragLabel({ x: e.clientX, y: e.clientY, text: `${hhmm(a)}–${hhmm(b)}` })
    }
  }

  function handleEnd(e) {
    const d = drag.current
    if (!d) return
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    drag.current = null
    setBlockPreview(null)
    setCreateDraft(null)
    setDragLabel(null)

    if (d.type === 'block') {
      justDragged.current = d.moved
      if (!d.moved) return // a tap → the onClick handler opens the editor
      if (offGrid(e.clientX, e.clientY)) {
        if (d.item.kind === 'task') onUnschedule(d.item) // event off-grid → snaps back
        return
      }
      const { dayStartMs, s, en } = d.cur
      const startMs = dayStartMs + s * 60000
      const endMs = dayStartMs + en * 60000
      if (startMs !== new Date(d.item.start_at).getTime() || endMs !== new Date(d.item.end_at).getTime()) {
        onMove(d.item, new Date(startMs).toISOString(), new Date(endMs).toISOString())
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
      const iso = (min) => new Date(d.dayStartMs + min * 60000).toISOString()
      onCreate(iso(a), iso(b))
    }
  }

  function handleCancel() {
    drag.current = null
    setBlockPreview(null)
    setCreateDraft(null)
    setDragLabel(null)
  }

  const moveEnd = { onPointerMove: handleMove, onPointerUp: handleEnd, onPointerCancel: handleCancel }
  const blockBind = (item, itemDayStartMs) => ({
    onPointerDown: (e) => startBlock(e, item, itemDayStartMs),
    ...moveEnd,
    onClick: (e) => {
      e.stopPropagation()
      if (justDragged.current) { justDragged.current = false; return }
      onSelect(item)
    },
  })
  const backgroundBind = { onPointerDown: startCreate, ...moveEnd }

  return { blockPreview, createDraft, dragLabel, blockBind, backgroundBind }
}
