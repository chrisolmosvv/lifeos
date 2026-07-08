import { useEffect, useRef, useState } from 'react'
import { HOUR_HEIGHT } from '../../spine/logic/dateUtils'

// useGridDrag — the ONE timeline-drag hook (Phase 7, C4 Part 2), the merge of the
// former useTodayGrid + useWeekGrid twins. The shared core (snap/threshold/edge,
// create-draft, move/resize, the tray ghost, the bind pattern) lives here once;
// the per-screen differences are CONFIG, so each screen reproduces its old twin
// byte-for-byte:
//   geomRef       — the element whose rect.top is y=0 and whose height maps hours
//   scrollRef     — used to tell "dropped over the grid" (tray) — both screens
//   startMin      — the lane's y=0 in minutes (Today 7am = 420; week midnight = 0)
//   dayStartMsAt  — (clientX) → the day-origin ms under the pointer (Today: a
//                   constant fn → single day; week: the column under x = re-day)
//   offAt         — (x,y) → an off-grid target | null (Today: which module; week:
//                   offGrid? true : null). Resolves a block dragged off the grid.
//   onOff         — (item, target) → the off action (Today: re-bucket; week:
//                   unschedule). Only TASKS trigger it; an EVENT off-grid snaps back.
//   eventsShowOff — whether an EVENT shows the faded "off" preview while dragged off
//                   (Today: false; week: true). Pure preview nuance.
//   onTraySelect  — optional; when present, a tray row is also clickable (week). When
//                   absent (Today), trayBind is drag-only AND a tray drag never sets
//                   justDragged (so it can't swallow a later click) — exactly as before.
// onCreate / onMove / onSelect / onSchedule are the writes/selection.
const THRESHOLD = 4
const SNAP = 15
const MIN_DUR = 15
const EDGE = 7
const DAY = 24 * 60

export function useGridDrag({
  geomRef,
  scrollRef,
  startMin = 0,
  dayStartMsAt,
  offAt,
  onOff,
  eventsShowOff = false,
  onCreate,
  onMove,
  onSelect,
  onSchedule,
  onTraySelect,
}) {
  const [blockPreview, setBlockPreview] = useState(null) // {id,item,dayStartMs,startMs,endMs,off}
  const [createDraft, setCreateDraft] = useState(null) // {dayStartMs,startMs,endMs}
  const [dragLabel, setDragLabel] = useState(null) // {x,y,text}
  const [ghost, setGhost] = useState(null) // {x,y,title} — a tray row dragged onto the grid
  const drag = useRef(null)
  const justDragged = useRef(false)

  const snap = (m) => Math.round(m / SNAP) * SNAP
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  // Minutes-from-midnight at a screen Y (the geom element's live top accounts for
  // scroll). y=0 maps to `startMin`.
  function minutesAt(clientY) {
    const r = geomRef.current.getBoundingClientRect()
    return startMin + ((clientY - r.top) / HOUR_HEIGHT) * 60
  }
  // Dropped over the grid? (the tray drop test — both screens use the scroll rect.)
  function overGrid(x, y) {
    const el = scrollRef.current
    if (!el) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
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
    const origin = itemDayStartMs ?? dayStartMsAt(e.clientX)
    const rect = e.currentTarget.getBoundingClientRect()
    const localY = e.clientY - rect.top
    const edge = Math.min(EDGE, rect.height / 3)
    const mode = localY <= edge ? 'top' : localY >= rect.height - edge ? 'bottom' : 'move'
    const sMin = (new Date(item.start_at).getTime() - origin) / 60000
    const eMin = (new Date(item.end_at).getTime() - origin) / 60000
    const ref = mode === 'bottom' ? eMin : sMin
    drag.current = {
      type: 'block', item, origin, mode, startMin: sMin, endMin: eMin, dur: eMin - sMin,
      downX: e.clientX, downY: e.clientY, grab: minutesAt(e.clientY) - ref, moved: false, cur: null,
    }
  }
  function startCreate(e) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    const m = snap(minutesAt(e.clientY))
    drag.current = {
      type: 'create', dayStartMs: dayStartMsAt(e.clientX), startMin: m,
      downX: e.clientX, downY: e.clientY, moved: false, curMin: m,
    }
  }
  function startTray(e, task) {
    if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.stopPropagation()
    drag.current = { type: 'tray', task, downX: e.clientX, downY: e.clientY, moved: false }
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
      // Re-day only on a MOVE (the day under x); a resize never changes day.
      const dayStartMs = d.mode === 'move' ? dayStartMsAt(e.clientX) : d.origin
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
      const offNow = offAt(e.clientX, e.clientY)
      const off = d.item.kind === 'task' || eventsShowOff ? offNow : null
      setBlockPreview({ id: d.item.id, item: d.item, dayStartMs, startMs: dayStartMs + s * 60000, endMs: dayStartMs + en * 60000, off })
      setDragLabel({ x: e.clientX, y: e.clientY, text: `${hhmm(s)}–${hhmm(en)}` })
    } else if (d.type === 'create') {
      d.curMin = snap(minutesAt(e.clientY))
      const a = clamp(Math.min(d.startMin, d.curMin), 0, DAY)
      let b = clamp(Math.max(d.startMin, d.curMin), 0, DAY)
      if (b - a < MIN_DUR) b = Math.min(a + MIN_DUR, DAY)
      setCreateDraft({ dayStartMs: d.dayStartMs, startMs: d.dayStartMs + a * 60000, endMs: d.dayStartMs + b * 60000 })
      setDragLabel({ x: e.clientX, y: e.clientY, text: `${hhmm(a)}–${hhmm(b)}` })
    } else if (d.type === 'tray') {
      setGhost({ x: e.clientX, y: e.clientY, title: d.task.title })
    }
  }

  function handleEnd(e) {
    const d = drag.current
    if (!d) return
    drag.current = null
    setBlockPreview(null)
    setCreateDraft(null)
    setDragLabel(null)
    setGhost(null)

    if (d.type === 'tray') {
      // Only gate clicks (set justDragged) when a tray row is clickable — Today's
      // grip is drag-only, so it must NOT set it (else it'd swallow a later click).
      if (onTraySelect) justDragged.current = d.moved
      if (d.moved && overGrid(e.clientX, e.clientY)) {
        const dayStartMs = dayStartMsAt(e.clientX)
        const min = clamp(snap(minutesAt(e.clientY)), 0, DAY - 60)
        const iso = (m) => new Date(dayStartMs + m * 60000).toISOString()
        onSchedule(d.task.id, iso(min), iso(min + 60))
      }
      return
    }

    if (d.type === 'block') {
      justDragged.current = d.moved
      if (!d.moved) return // a tap → the onClick handler opens the editor
      const target = offAt(e.clientX, e.clientY)
      if (target) {
        if (d.item.kind === 'task') onOff(d.item, target) // event → snaps back
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
    setGhost(null)
  }

  // Move / release / cancel live on the WINDOW for the hook's life, so the release
  // is heard wherever the cursor is — even over the tray, or after the dragged block
  // was removed mid-drag (off-grid). Elements only START gestures + handle clicks.
  // Handlers early-return when idle; a ref keeps the listeners on the freshest ones.
  const handlersRef = useRef(null)
  handlersRef.current = { handleMove, handleEnd, handleCancel }
  useEffect(() => {
    const move = (e) => handlersRef.current.handleMove(e)
    const up = (e) => handlersRef.current.handleEnd(e)
    const cancel = (e) => handlersRef.current.handleCancel(e)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [])

  const blockBind = (item, itemDayStartMs) => ({
    onPointerDown: (e) => startBlock(e, item, itemDayStartMs),
    onClick: (e) => {
      e.stopPropagation()
      if (justDragged.current) { justDragged.current = false; return }
      onSelect(item)
    },
  })
  const backgroundBind = { onPointerDown: startCreate }
  const trayBind = (task) => {
    const h = { onPointerDown: (e) => startTray(e, task) }
    if (onTraySelect) {
      h.onClick = (e) => {
        e.stopPropagation()
        if (justDragged.current) { justDragged.current = false; return }
        onTraySelect(task)
      }
    }
    return h
  }

  return { blockPreview, createDraft, dragLabel, ghost, blockBind, backgroundBind, trayBind }
}
