import { useEffect, useRef } from 'react'

// useSwipe — the shared trackpad horizontal-swipe detector (V2-5). Captures
// two-finger horizontal trackpad scroll (wheel events with deltaX) on `ref`,
// axis-locks to the dominant axis for the gesture, and hands the horizontal
// gesture to the caller via lifecycle callbacks. Vertical scroll is left alone so
// the hours still scroll natively.
//
// Why wheel, not pointer: trackpad swipe arrives as `wheel` events — a SEPARATE
// stream from pointerdown/move/up — so this never collides with the grid's
// click-drag create / re-day / resize. (V2-5 spec §18.)
//
// Key details:
//  • Axis-lock — on the first significant delta of a gesture we lock to x or y and
//    hold it until the gesture ends, so scrolling time never jumps a week and a
//    horizontal swipe never nudges the hours.
//  • Gesture end — wheel has no native end, so a quiet gap (~120ms with no events,
//    incl. the trackpad's momentum tail) closes the gesture.
//  • preventDefault on a CLAIMED-horizontal gesture suppresses the macOS
//    back/forward history-swipe — which needs a NON-PASSIVE listener (React's JSX
//    onWheel can be passive), hence the manual addEventListener({passive:false}).
//
// Handlers (all optional): onStart(), onMove(deltaX, totalDx), onEnd(totalDx).
// `totalDx` is the accumulated horizontal delta for the gesture. Handlers are read
// live via a ref, so the listener attaches once.
export function useSwipe(ref, handlers, { endGap = 120, axisFloor = 1 } = {}) {
  const hRef = useRef(handlers)
  hRef.current = handlers

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let axis = null // 'x' | 'y' | null — locked for the gesture
    let total = 0 // accumulated deltaX
    let timer = null

    const end = () => {
      if (axis === 'x') hRef.current?.onEnd?.(total)
      axis = null
      total = 0
      timer = null
    }

    const onWheel = (e) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(end, endGap)

      if (axis === null) {
        if (Math.abs(e.deltaX) < axisFloor && Math.abs(e.deltaY) < axisFloor) return
        axis = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? 'x' : 'y'
        if (axis === 'x') hRef.current?.onStart?.()
      }

      if (axis === 'x') {
        e.preventDefault() // claim horizontal + suppress the history-swipe
        total += e.deltaX
        hRef.current?.onMove?.(e.deltaX, total)
      }
      // axis === 'y' → leave it; the browser scrolls the hours natively.
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      if (timer) clearTimeout(timer)
    }
  }, [ref, endGap, axisFloor])
}
