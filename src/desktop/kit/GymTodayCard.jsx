import { topSet, workoutVolume } from '../gym/gymCalc'
import { humanDayShort } from '../../spine/logic/gymDates'
import { formatVolume } from '../gym/gymFormat'

// GymTodayCard — the TL "Gym · today" quadrant: a compact snapshot of the LAST logged
// session (most recent even if days old — point-in-time, NOT ranged). Header = session
// name + date; a stat line (volume · lift count · PR mark in terracotta); then the top
// few lifts (name + heaviest working set). Pure presentation of the built workout.
const fmtW = (w) => (Number.isFinite(w) ? (Number.isInteger(w) ? String(w) : w.toFixed(1)) : '—')

export default function GymTodayCard({ session, detail }) {
  if (!session || !detail) return <p className="gym-ph">No sessions yet.</p>
  const exercises = detail.exercises || []
  // Skip warmup-only entries (no working set) from the lift lines + the lift count.
  const working = exercises.filter((ex) => topSet(ex.sets) != null)
  const vol = formatVolume(workoutVolume(detail))
  const lifts = working.slice(0, 4).map((ex, i) => {
    const t = topSet(ex.sets)
    return { key: ex.id || i, name: ex.title || 'Lift', top: `${fmtW(t.weight_kg)} kg × ${t.reps}` }
  })
  return (
    <div className="gym-today">
      <div className="gym-today-head">
        <b className="gym-today-title">{detail.title || 'Workout'}</b>
        <span className="gym-today-date">{humanDayShort(session.dateYMD)}</span>
      </div>
      <div className="gym-today-stats">
        <span><b>{vol.num}</b> kg</span>
        <span><b>{working.length}</b> lifts</span>
        {session.isPR && <span className="gym-pr">PR</span>}
      </div>
      <div className="gym-today-lifts">
        {lifts.map((l) => (
          <div className="gym-lift" key={l.key}>
            <span className="gym-lift-name">{l.name}</span>
            <span className="gym-lift-top">{l.top}</span>
          </div>
        ))}
        {working.length > 4 && <span className="gym-lift-more">+{working.length - 4} more lifts</span>}
      </div>
    </div>
  )
}
