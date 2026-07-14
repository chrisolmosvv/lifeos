import { useRef } from 'react'
import { useSwipe } from './kit/useSwipe'

// useDaySwipe (V2-5) — a two-finger horizontal trackpad swipe over Today's day grid
// steps one day. (Piece 0 split: moved verbatim out of Today.jsx; no behaviour changed.)
//
// TRIGGERED, one day per gesture: a small flick = one day, so it lands on exactly the
// step the ‹ › arrows take. Attaches to the grid's existing scroll element, so DayGrid
// is untouched. Vertical scrolling still scrolls the hours (the axis-lock lives in the
// shared useSwipe detector, along with wheel capture and the history-swipe block).
//
// onStep(dir) — dir is +1 (next day) or -1 (previous day).
const SWIPE_STEP = 40 // px of accumulated deltaX to commit a day step

export function useDaySwipe(scrollRef, onStep) {
  const stepped = useRef(false)
  useSwipe(scrollRef, {
    onStart: () => { stepped.current = false },
    onMove: (_dx, totalDx) => {
      if (stepped.current || Math.abs(totalDx) < SWIPE_STEP) return
      stepped.current = true
      onStep(totalDx > 0 ? 1 : -1)
    },
  })
}
