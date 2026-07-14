import { useLayoutEffect, useRef, useState } from 'react'

// PlanningModes — the calm time | board | category toggle for the Planning view.
// `liveModes` lists which modes are selectable; the rest render as visibly-disabled
// "soon" affordances (no dead clicks). Sealed kit block; the parent owns the state.
//
// The active mode is marked by a hairline that SLIDES to the chosen word rather than
// blinking from one to the next. It's measured off the real buttons (the three words
// are different lengths), so the rule is exactly as wide as the word above it.
//
// Props: mode (active id), onSelect(id), liveModes (array of live mode ids).
const MODES = [
  { id: 'time', label: 'Time' },
  { id: 'board', label: 'Board' },
  { id: 'category', label: 'Category' },
]

export default function PlanningModes({ mode, onSelect, liveModes }) {
  const wrapRef = useRef(null)
  const btnRefs = useRef({})
  // The marker's left/width in px, relative to the row. `ready` holds it invisible
  // until it has been measured once, so it never flashes at zero-width on first paint.
  const [mark, setMark] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    const btn = btnRefs.current[mode]
    const wrap = wrapRef.current
    if (!btn || !wrap) return
    const b = btn.getBoundingClientRect()
    const w = wrap.getBoundingClientRect()
    setMark({ left: b.left - w.left, width: b.width, ready: true })
  }, [mode])

  return (
    <div className="pl-modes" role="tablist" ref={wrapRef}>
      {MODES.map((m) => {
        const live = liveModes.includes(m.id)
        return (
          <button
            key={m.id}
            ref={(n) => (btnRefs.current[m.id] = n)}
            className={'pl-mode' + (mode === m.id ? ' is-active' : '')}
            onClick={live ? () => onSelect(m.id) : undefined}
            disabled={!live}
            title={live ? undefined : 'Coming soon'}
          >
            {m.label}
            {!live && <span className="pl-soon">soon</span>}
          </button>
        )
      })}
      <span
        className={'pl-mode-mark' + (mark.ready ? ' is-ready' : '')}
        style={{ transform: `translateX(${mark.left}px)`, width: mark.width }}
        aria-hidden="true"
      />
    </div>
  )
}
