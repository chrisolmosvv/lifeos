import { useRef } from 'react'
import { workoutVolume, workoutMinutes, topSet, best1RM, isWarmup, sumVolume } from '../spine/logic/gymCalc'
import { sessionPRs } from '../spine/logic/gymSessions'
import { sessionStory } from '../spine/logic/gymStory'
import { formatVolume, formatDuration, prettyMuscle } from '../spine/logic/gymFormat'
import { amsYMD, humanDayLong } from '../spine/logic/gymDates'

export default function MobileSessionReport({ data, sessionId, onBack }) {
  const startX = useRef(null)
  const onTS = (e) => { if (e.touches[0].clientX < 30) startX.current = e.touches[0].clientX }
  const onTE = (e) => {
    if (startX.current != null) {
      if (e.changedTouches[0].clientX - startX.current > 80) onBack()
      startX.current = null
    }
  }

  const wk = data.gymWorkouts || []
  const workout = wk.find(w => w.id === sessionId)
  if (!workout) return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Gym</button>
      <p className="mh-empty" style={{ padding: '16px 20px' }}>Session not found.</p>
    </div>
  )

  const story = sessionStory(wk, sessionId)
  const vol = workoutVolume(workout)
  const mins = workoutMinutes(workout)
  const prs = sessionPRs(wk, sessionId)
  const dateYMD = amsYMD(workout.started_at)

  return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Gym</button>

      <div className="mh-rpt-head">
        <p className="mh-rpt-title">{workout.title || 'Session'}</p>
        <p className="mh-rpt-date">{humanDayLong(dateYMD)}</p>
        {story && <p className="mh-rpt-story">{story}</p>}
        <div className="mh-rpt-totals">
          <span>{formatVolume(vol).num} kg</span>
          <span>{formatDuration(mins).num}{formatDuration(mins).unit ? ` ${formatDuration(mins).unit}` : ''}</span>
          {prs.length > 0 && <span className="mh-rpt-pr">{prs.length} PR{prs.length > 1 ? 's' : ''}</span>}
        </div>
      </div>

      {(workout.exercises || []).map((ex, ei) => {
        const ts = topSet(ex.sets)
        const rm = best1RM(ex.sets)
        const muscle = ex.muscle ? prettyMuscle(ex.muscle) : null
        return (
          <div key={ei} className="mh-exercise">
            <div className="mh-ex-head">
              <span className="mh-ex-title">{ex.title || 'Exercise'}</span>
              {muscle && <span className="mh-ex-muscle">{muscle}</span>}
            </div>
            <div className="mh-ex-sets">
              {(ex.sets || []).map((s, si) => {
                const warm = isWarmup(s)
                const wt = s.weight_kg
                const reps = s.reps
                return (
                  <div key={si} className={`mh-set-row${warm ? ' mh-set-warm' : ''}`}>
                    <span className="mh-set-num">{si + 1}</span>
                    <span className="mh-set-detail">
                      {Number.isFinite(wt) && wt > 0 ? `${wt} kg` : ''}
                      {Number.isFinite(wt) && wt > 0 && Number.isFinite(reps) ? ' × ' : ''}
                      {Number.isFinite(reps) ? `${reps}` : ''}
                      {!Number.isFinite(wt) && !Number.isFinite(reps) ? '—' : ''}
                    </span>
                    {s.rpe ? <span className="mh-set-rpe">RPE {s.rpe}</span> : null}
                    {warm && <span className="mh-set-tag">warm-up</span>}
                  </div>
                )
              })}
            </div>
            {ts && (
              <p className="mh-ex-summary">
                Top set {ts.weight_kg} kg × {ts.reps}
                {rm != null ? ` · Est 1RM ${Math.round(rm)} kg` : ''}
              </p>
            )}
            <p className="mh-ex-vol">{formatVolume(sumVolume(ex.sets)).num} kg total</p>
          </div>
        )
      })}
    </div>
  )
}
