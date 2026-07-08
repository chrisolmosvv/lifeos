import { useRef, useState } from 'react'

// Day-grained drag for the all-day band (Phase 7, C7) — a small sibling of the
// timed useWeekGrid, but horizontal and snapped to whole DAYS (no 15-min). Create
// (click an empty cell = 1 day, drag = a span), move a bar (drag its body), or
// resize its span (drag an edge). All writes go out as local-midnight, end-
// EXCLUSIVE ISO. Geometry reads the band's column area live. bandRef = the
// `.adb-cols` element (the 7 day columns, no gutter). The timed grid is untouched.
const THRESHOLD = 4
const EDGE_FRAC = 0.22
const DAY = 86400000

export function useBandDrag({ bandRef, days, onCreate, onMove, onSelect }) {
  const [preview, setPreview] = useState(null) // {create?, id?, startCol, endCol}
  const drag = useRef(null)
  const justDragged = useRef(false)

  const weekStart = midnight(days[0])
  const colAt = (clientX) => {
    const r = bandRef.current.getBoundingClientRect()
    return clamp(Math.floor((clientX - r.left) / (r.width / 7)), 0, 6)
  }
  const colOfMs = (ms) => clamp(Math.round((ms - weekStart) / DAY), 0, 6)
  const dayMs = (col) => weekStart + col * DAY
  const iso = (ms) => new Date(ms).toISOString()

  function startCreate(e) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    const c = colAt(e.clientX)
    drag.current = { type: 'create', anchor: c, downX: e.clientX, moved: false, cur: c }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function startBar(e, event) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - r.left) / r.width
    const mode = frac <= EDGE_FRAC ? 'start' : frac >= 1 - EDGE_FRAC ? 'end' : 'move'
    drag.current = {
      type: 'bar', event, mode,
      startMs: midnight(new Date(event.start_at)),
      endExcl: midnight(new Date(event.end_at)), // already end-exclusive midnight
      grabCol: colAt(e.clientX), downX: e.clientX, moved: false,
    }
    drag.current.cur = { startMs: drag.current.startMs, endExcl: drag.current.endExcl }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function passed(d, e) {
    if (d.moved) return true
    if (Math.abs(e.clientX - d.downX) < THRESHOLD) return false
    d.moved = true
    return true
  }

  function move(e) {
    const d = drag.current
    if (!d || !passed(d, e)) return
    const c = colAt(e.clientX)
    if (d.type === 'create') {
      d.cur = c
      setPreview({ create: true, startCol: Math.min(d.anchor, c), endCol: Math.max(d.anchor, c) })
      return
    }
    let { startMs, endExcl } = d
    if (d.mode === 'move') {
      const delta = (c - d.grabCol) * DAY
      startMs = d.startMs + delta
      endExcl = d.endExcl + delta
    } else if (d.mode === 'start') {
      startMs = Math.min(dayMs(c), d.endExcl - DAY)
    } else {
      endExcl = Math.max(dayMs(c) + DAY, d.startMs + DAY)
    }
    d.cur = { startMs, endExcl }
    setPreview({ id: d.event.id, startCol: colOfMs(startMs), endCol: colOfMs(endExcl - DAY) })
  }

  function end(e) {
    const d = drag.current
    if (!d) return
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    drag.current = null
    setPreview(null)
    if (d.type === 'create') {
      const a = Math.min(d.anchor, d.cur)
      const b = Math.max(d.anchor, d.cur)
      onCreate(iso(dayMs(a)), iso(dayMs(b) + DAY))
    } else {
      justDragged.current = d.moved
      if (!d.moved) return
      if (d.cur.startMs !== d.startMs || d.cur.endExcl !== d.endExcl) {
        onMove(d.event, iso(d.cur.startMs), iso(d.cur.endExcl))
      }
    }
  }
  function cancel() {
    drag.current = null
    setPreview(null)
  }

  const moveEnd = { onPointerMove: move, onPointerUp: end, onPointerCancel: cancel }
  const createBind = { onPointerDown: startCreate, ...moveEnd }
  const barBind = (event) => ({
    onPointerDown: (e) => startBar(e, event),
    ...moveEnd,
    onClick: (e) => {
      e.stopPropagation()
      if (justDragged.current) { justDragged.current = false; return }
      onSelect(event)
    },
  })

  return { preview, createBind, barBind }
}

function midnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
