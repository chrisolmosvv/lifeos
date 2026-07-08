import SessionExercise from './kit/SessionExercise'
import { workoutVolume, workoutMinutes } from './gym/gymCalc'
import { amsYMD, humanDayLong } from './gym/gymDates'
import { formatVolume, formatDuration } from './gym/gymFormat'
import { sessionStory } from './gym/gymStory'
import './kit/sessionReport.css'

// SessionReport — the drill-in for ONE workout, reached from the recent-sessions
// table (a sub-view inside Health, not a new nav item). Display only: header +
// totals + a templated "new best" line (no AI), then a line per exercise that
// expands its set table. `allWorkouts` is the built list (for chronological PR
// detection); `workout` is the one being shown.
export default function SessionReport({ workout, allWorkouts, onBack }) {
  if (!workout) return null

  const vol = formatVolume(workoutVolume(workout))
  const t = formatDuration(workoutMinutes(workout))
  const exercises = workout.exercises || []
  const setCount = exercises.reduce((n, ex) => n + (ex.sets?.length || 0), 0)
  const ymd = amsYMD(workout.started_at)
  const story = sessionStory(allWorkouts, workout.id)

  return (
    <div className="sr">
      <button className="sr-back" onClick={onBack}>← The Form Guide</button>

      <header className="sr-head">
        <h2 className="sr-title">{workout.title || 'Workout'}</h2>
        {ymd && <div className="sr-date">{humanDayLong(ymd)}</div>}
        {story && <p className="sr-story">{story}</p>}
        <div className="sr-totals tnum">
          <span><b>{vol.num}</b> kg</span>
          <span><b>{t.num}</b>{t.unit ? ` ${t.unit}` : ''}</span>
          <span><b>{exercises.length}</b> exercises</span>
          <span><b>{setCount}</b> sets</span>
        </div>
      </header>

      {exercises.length === 0 ? (
        <p className="sr-empty">No exercises recorded for this session.</p>
      ) : (
        <div className="sr-list">
          {exercises.map((ex, i) => (
            <SessionExercise key={ex.id || i} exercise={ex} />
          ))}
        </div>
      )}
    </div>
  )
}
