import { useState } from 'react'
import { sumVolume, topSet, best1RM, isWarmup } from '../gym/gymCalc'
import { formatVolume } from '../gym/gymFormat'
import './sessionReport.css'

// SessionExercise — one exercise inside the session report: a calm summary line
// (resolved name + muscle, top set · volume · est 1RM) that taps to EXPAND its set
// table. Sealed gym-kit block: display only, reuses the calc layer. Warm-ups are
// shown but marked and excluded from the top-set/1RM/PR marks (the G0 rule).

const pretty = (m) => (!m ? 'Other' : m.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()))
const fmtW = (w) => (typeof w !== 'number' ? '' : w % 1 === 0 ? String(w) : w.toFixed(1))

// One set's main figure: weight×reps, or bodyweight reps, or duration, or distance.
function setFigure(s) {
  const hasW = typeof s.weight_kg === 'number'
  const hasR = typeof s.reps === 'number'
  if (hasW && hasR) return `${fmtW(s.weight_kg)} kg × ${s.reps}`
  if (hasR) return `${s.reps} reps` // bodyweight
  if (typeof s.duration_seconds === 'number') {
    const t = s.duration_seconds
    return t < 60 ? `${t}s` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
  }
  if (typeof s.distance_m === 'number') return `${s.distance_m} m`
  return '—'
}
const typeTag = (t) => (!t || t === 'normal' ? '' : t === 'warmup' ? 'warm-up' : t)

export default function SessionExercise({ exercise }) {
  const [open, setOpen] = useState(false)
  const sets = exercise.sets || []
  const top = topSet(sets) // heaviest WORKING set (warm-ups excluded), or null
  const e1rm = best1RM(sets)
  const volume = sumVolume(sets)
  const workingCount = sets.filter((s) => !isWarmup(s)).length

  // Summary: weighted exercises lead with the top set; bodyweight/duration ones
  // lead with their working-set count so they never read as blank/NaN.
  const summary = top
    ? `${fmtW(top.weight_kg)} kg × ${top.reps} · ${formatVolume(volume).num} kg${e1rm ? ` · est 1RM ${Math.round(e1rm)} kg` : ''}`
    : `${workingCount} working set${workingCount === 1 ? '' : 's'}`

  return (
    <div className={`sx ${open ? 'is-open' : ''}`}>
      <button className="sx-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="sx-caret">{open ? '▾' : '▸'}</span>
        <span className="sx-name">
          {exercise.title || 'Exercise'}
          <span className="sx-muscle">{pretty(exercise.muscle)}</span>
        </span>
        <span className="sx-summary tnum">{summary}</span>
      </button>

      {open && (
        <div className="sx-sets">
          {sets.map((s, i) => {
            const warm = isWarmup(s)
            const isBest = top && s.id === top.id
            const tag = typeTag(s.set_type)
            return (
              <div className={`sx-set${warm ? ' sx-set--warm' : ''}`} key={s.id || i}>
                <span className="sx-set-fig tnum">{setFigure(s)}</span>
                <span className="sx-set-tag">{tag}</span>
                <span className="sx-set-rpe tnum">{typeof s.rpe === 'number' ? `RPE ${s.rpe}` : ''}</span>
                <span className="sx-set-best">{isBest && <span className="sx-dot" title="top set">best</span>}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
