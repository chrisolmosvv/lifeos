import { useEffect, useMemo, useState } from 'react'
import SessionReport from './SessionReport'
import GymArchive from './GymArchive'
import GymRecords from './GymRecords'
import GymTodayCard from './kit/GymTodayCard'
import GymOverTimeCard from './kit/GymOverTimeCard'
import WalkingTodayCard from './kit/WalkingTodayCard'
import WalkingOverTimeCard from './kit/WalkingOverTimeCard'
import WalkingDaysTable from './kit/WalkingDaysTable'
import RangeSwitcher from './kit/RangeSwitcher'
import Breadcrumb from './kit/Breadcrumb'
import Skeleton from './kit/Skeleton'
import InlineError from './kit/InlineError'
import { amsTodayYMD } from '../spine/logic/gymDates'
import { fetchActivity } from './health/healthLoad'
import { metricView as activityView } from './health/healthActivity'
import { loadGymData } from './gym/gymLoad'
import { buildWorkouts, boxScore } from './gym/gymCalc'
import { dailyVolumeSeries } from './gym/gymTrend'
import { muscleBalance } from './gym/gymBalance'
import { recentSessions } from './gym/gymSessions'
import { storyHeadline } from './gym/gymStory'
import './health/healthChrome.css'
import './kit/formGuide.css'

// Health — the Gym front page (Health Hub → Gym), V2 "2×2". Breadcrumb "Health / Gym"
// + the shared RangeSwitcher chrome under the .health-fit zero-scroll model. A story-
// headline lead (fixed "now") sits above a 2×2 grid: Gym / Walking × today / over-time.
//   TL Gym·today       — the last logged session (GymTodayCard, point-in-time)
//   TR Gym·over-time   — ranged aggregates + rolling-7 volume trend (GymOverTimeCard)
//   BL Walking·today   — today-so-far from metricView.todaySoFar (WalkingTodayCard)
//   BR Walking·over-time — ranged mobility averages, to-yesterday (WalkingOverTimeCard)
// The W/M/90 switcher governs ONLY the right column. "more ›" links open the reused
// SessionReport / GymArchive / GymRecords and the terminal WalkingDaysTable. The UI only
// DISPLAYS calc-layer output (gym* + healthActivity); it never recomputes a metric.
// Gym + Activity load once per open; range switching is client-side.
const START = '2026-01-01'
// Walking / Activity metrics (activity_hourly) for the two Walking quadrants.
const ACTIVITY_METRICS = ['steps', 'flights_climbed', 'stand_minutes', 'walking_speed', 'walking_heart_rate_avg', 'walking_step_length']
const RANGES = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: '90', label: '90 days' },
]
const RANGE_DAYS = { week: 7, month: 30, '90': 90 }

export default function Health({ onBack }) {
  const [data, setData] = useState(null)
  const [activity, setActivity] = useState(null) // { metric → activity view-model }
  const [error, setError] = useState('')
  const [view, setView] = useState('front') // 'front' | 'archive' | 'records'
  const [openId, setOpenId] = useState(null) // a session drilled into, or null
  const [range, setRange] = useState('week') // governs ONLY the two over-time (right-column) cells

  useEffect(() => {
    let alive = true
    const now = Date.now()
    const today = amsTodayYMD(now)
    Promise.all([loadGymData(), ...ACTIVITY_METRICS.map((m) => fetchActivity(m, START, today))])
      .then(([gym, ...actRows]) => {
        if (!alive) return
        const act = {}
        ACTIVITY_METRICS.forEach((m, i) => { act[m] = activityView(m, actRows[i], now) })
        setActivity(act)
        setData(gym)
      })
      .catch((e) => alive && setError(e.message || 'Something went wrong.'))
    return () => {
      alive = false
    }
  }, [])

  const built = useMemo(
    () => (data ? buildWorkouts(data.workouts, data.exercises, data.sets, data.templatesById) : []),
    [data],
  )
  // Range-governed aggregates for the TR over-time quadrant (days = 7 / 30 / 90).
  const days = RANGE_DAYS[range]
  const rangeBox = useMemo(() => boxScore(built, days), [built, days])
  const rangeBalance = useMemo(() => (built.length ? muscleBalance(built, { days }) : null), [built, days])
  const volSeries = useMemo(() => (built.length ? dailyVolumeSeries(built, { days }) : null), [built, days])
  const sessions = useMemo(() => (built.length ? recentSessions(built) : []), [built])
  const story = useMemo(() => (built.length ? storyHeadline(built) : null), [built])
  const openWorkout = useMemo(() => (openId ? built.find((w) => w.id === openId) : null), [openId, built])

  // The drill-in sub-views (reused as-is; wired to the "more ›" links in a later stage).
  if (built.length && openWorkout) {
    return (
      <div className="gym-page">
        <SessionReport workout={openWorkout} allWorkouts={built} onBack={() => setOpenId(null)} />
      </div>
    )
  }
  if (built.length && view === 'archive') {
    return (
      <div className="gym-page">
        <GymArchive rows={sessions} workouts={built} onOpen={setOpenId} onBack={() => setView('front')} />
      </div>
    )
  }
  if (built.length && view === 'records') {
    return (
      <div className="gym-page">
        <GymRecords workouts={built} onBack={() => setView('front')} />
      </div>
    )
  }
  if (view === 'walkdays') {
    return (
      <div className="gym-page">
        <WalkingDaysTable activity={activity} days={days} onBack={() => setView('front')} />
      </div>
    )
  }

  const isFit = !error && data !== null && built.length > 0
  return (
    <div className={isFit ? 'gym-page health-fit' : 'gym-page'}>
      <div className="health-chrome">
        <Breadcrumb crumbs={[{ label: 'Health', onClick: onBack }, { label: 'Gym' }]} />
        <RangeSwitcher ranges={RANGES} value={range} ariaLabel="Gym range" onChange={setRange} />
      </div>

      {error ? (
        <InlineError message={error} onRetry={() => { setData(null); setError(''); loadGymData().then(setData).catch((e) => setError(e.message || 'Something went wrong.')) }} />
      ) : data === null ? (
        <Skeleton cols={2} />
      ) : built.length === 0 ? (
        <p className="fg-note">No workouts on record yet — once Hevy syncs, the Form Guide fills in here.</p>
      ) : (
        <>
          <div className="gym-lead">{story || '—'}</div>
          <div className="health-fade">
            {/* STAGE 1 scaffold: the 2×2 grid is the flex-grow child; quadrants fill in stages 2–5. */}
            <div className="gym-grid">
              <section className="gym-quad gym-quad--tl">
                <span className="gym-kicker">Gym · today</span>
                <GymTodayCard session={sessions[0]} detail={built[0]} />
              </section>
              <section className="gym-quad gym-quad--tr">
                <span className="gym-kicker">Gym · over-time</span>
                <GymOverTimeCard box={rangeBox} balance={rangeBalance} series={volSeries} built={built} days={days} onMore={() => setView('archive')} onRecords={() => setView('records')} />
              </section>
              <section className="gym-quad gym-quad--bl">
                <span className="gym-kicker">Walking · today</span>
                <WalkingTodayCard activity={activity} />
              </section>
              <section className="gym-quad gym-quad--br">
                <span className="gym-kicker">Walking · over-time</span>
                <WalkingOverTimeCard activity={activity} days={days} onMore={() => setView('walkdays')} />
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
