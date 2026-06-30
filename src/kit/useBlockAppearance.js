import { useEffect, useRef } from 'react'

// useBlockAppearance — the shared "just appeared" signal for grid blocks (V2-2).
// Given this render's block ids (in start order), it decides which ones should
// play the fade-in now and with what stagger delay — WITHOUT re-firing on
// re-layout, drag/re-day, completion, or the minute now-tick.
//
// Rules:
//   • An id that has already been SEEN never animates again. This is the
//     anti-flicker guarantee: a re-day drag that re-mounts a block in another
//     column (or any reload) won't re-fade it.
//   • A full set TURNOVER (first paint, or a nav reload where nothing carries
//     over) staggers top-down ONLY if `staggerLoad` is true; otherwise the blocks
//     appear quietly (no animation) — so navigation reloads don't re-stagger.
//   • A few NEW ids joining a mostly-retained set are creates → they fade
//     individually, with no stagger.
//
// `ids` is the rendered blocks' ids in start order (top-down). `staggerLoad` is
// true only on a screen's FIRST open (the container flips it off on first nav).
// Returns a Map id → delayMs for the blocks that should animate this render.
//
// The decision is computed during render (so a block's very first paint is
// already at opacity 0 — no flash), but the "seen" set is committed in an effect
// (so React Strict Mode's double-render stays correct). In-flight appearances are
// held in `active` until their animation window passes, so an unrelated re-render
// (e.g. the create form closing) can't cut a fade short.
const STEP = 28 // ms between staggered blocks
const CAP = 300 // ms — the whole stagger never exceeds this (a busy day won't crawl)
const DURATION = 280 // ms — the fade itself; keep the class on for its full play

export function useBlockAppearance(ids, staggerLoad) {
  const seen = useRef(new Set())
  const active = useRef(new Map()) // id → { delay, until } for in-flight appearances
  const now = (typeof performance !== 'undefined' ? performance : Date).now()
  const prev = seen.current

  const newIds = ids.filter((id) => !prev.has(id))
  if (newIds.length) {
    const turnover = prev.size === 0 || newIds.length === ids.length
    const list = turnover ? (staggerLoad ? ids : []) : newIds
    list.forEach((id, i) => {
      if (!active.current.has(id)) {
        const delay = turnover ? Math.min(i * STEP, CAP) : 0
        active.current.set(id, { delay, until: now + delay + DURATION + 60 })
      }
    })
  }

  // This render's result; drop finished or vanished entries.
  const present = new Set(ids)
  const result = new Map()
  for (const [id, info] of active.current) {
    if (info.until > now && present.has(id)) result.set(id, info.delay)
    else active.current.delete(id)
  }

  // Commit the seen-set after paint (keeps Strict Mode's double render correct).
  const sig = ids.join('|')
  useEffect(() => {
    seen.current = new Set(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  return result
}
