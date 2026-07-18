import { useEffect, useMemo, useState } from 'react'
import SessionReport from './SessionReport'
import GymArchive from './GymArchive'
import GymRecords from './GymRecords'
import GymTimeControl from './health/GymTimeControl'
import GymConsistency from './health/GymConsistency'
import GymTraining from './health/GymTraining'
import GymBalance from './health/GymBalance'
import GymActivity from './health/GymActivity'
import Breadcrumb from './kit/Breadcrumb'
import Skeleton from './kit/Skeleton'
import InlineError from './kit/InlineError'
import { amsTodayYMD, shiftYMD, amsYMD } from '../spine/logic/gymDates'
import { fetchActivity } from '../spine/data/healthLoad'
import { loadGymData } from '../spine/data/gymLoad'
import { buildWorkouts } from '../spine/logic/gymCalc'
import { muscleBalance } from '../spine/logic/gymBalance'
import { recentSessions } from '../spine/logic/gymSessions'
import './health/healthChrome.css'
import './kit/formGuide.css'
import './kit/gymPage.css'

// Health — the Gym front page (Health Hub → Gym), V2 TWO-COLUMN (Piece 1). Replaces the P4
// 2×2 grid. A Gym-LOCAL time control (Today / 3mo / 6mo / 1yr + paging, its own state) sits
// top-right. MAIN column: Consistency (fixed to this week) → Training Progress (pages) →
// Body-Part Balance (fixed trailing 7 days). SIDE column: Activity averages (page). Gym +
// activity load ONCE per open (the whole history); paging just re-windows the loaded rows.
// The UI only DISPLAYS calc-layer output (gym* + healthActivity); it never recomputes a metric.
//
// STILL PLACEHOLDER (later pieces): the weekday grid + streak (P2), routine tabs + lift-delta
// table (P3), the vertical steps bar chart (P4). Every zone here shows real, correct data.
const START = '2026-01-01'
// The three Activity averages the side column shows. steps arrives with the P4 bar chart;
// walking_speed (mislabeled pace) + walking_step_length (stride) are cut by design.
const ACTIVITY_METRICS = ['flights_climbed', 'stand_minutes', 'walking_heart_rate_avg']
// Window size per switcher level. "Today" has no natural number — 14 days mirrors Body's
// Piece-9 "today" span (a made-call, flagged in the handoff; the owner tunes it). 3/6/12 mo
// are 90/180/365. Governs Training Progress + the Activity side column (the paged zones).
const WINDOW_DAYS = { today: 14, '3mo': 90, '6mo': 180, '1yr': 365 }

// A UTC-noon ms timestamp for an Amsterdam day — lets boxScore/dailyVolumeSeries end their
// rolling window on the VIEWED day (their `now` arg), not always today, when paged back.
const noonMs = (ymd) => new Date(`${ymd}T12:00:00Z`).getTime()

export default function Health({ onBack }) {
  const [data, setData] = useState(null)
  const [activityRows, setActivityRows] = useState(null) // { metric → raw hourly rows }
  const [error, setError] = useState('')
  const [view, setView] = useState('front') // 'front' | 'archive' | 'records'
  const [openId, setOpenId] = useState(null) // a session drilled into, or null
  const [win, setWin] = useState('today') // 'today' | '3mo' | '6mo' | '1yr'
  const [anchor, setAnchor] = useState(null) // the viewed period's END ymd; null → today
  const [today, setToday] = useState(null)

  useEffect(() => {
    let alive = true
    const now = Date.now()
    const t = amsTodayYMD(now)
    Promise.all([loadGymData(), ...ACTIVITY_METRICS.map((m) => fetchActivity(m, START, t))])
      .then(([gym, ...actRows]) => {
        if (!alive) return
        const rows = {}
        ACTIVITY_METRICS.forEach((m, i) => { rows[m] = actRows[i] })
        setActivityRows(rows)
        setToday(t)
        setData(gym)
      })
      .catch((e) => alive && setError(e.message || 'Something went wrong.'))
    return () => { alive = false }
  }, [])

  const built = useMemo(
    () => (data ? buildWorkouts(data.workouts, data.exercises, data.sets, data.templatesById) : []),
    [data],
  )
  const sessions = useMemo(() => (built.length ? recentSessions(built) : []), [built])

  // ── PAGING derived state ──────────────────────────────────────────────────────
  const days = WINDOW_DAYS[win]
  const anchorEnd = anchor || today || null
  // Earliest gym session (the backward-paging boundary). Activity starts later; the side
  // column shows its own honest empty state before its start rather than forcing a boundary.
  const earliestGym = useMemo(() => {
    let min = null
    for (const w of built) {
      const ymd = amsYMD(w.started_at)
      if (ymd && (min === null || ymd < min)) min = ymd
    }
    return min
  }, [built])

  // The viewed window [start, end]. Gym (Training) ends on the viewed day; Activity ends on
  // the last COMPLETED day (yesterday when viewing today) so a partial day never skews an avg.
  const viewStart = anchorEnd ? shiftYMD(anchorEnd, -(days - 1)) : null
  const actEnd = win === 'today' ? (today ? shiftYMD(today, -1) : null) : anchorEnd
  const actStart = actEnd ? shiftYMD(actEnd, -(days - 1)) : null
  const nowForWindow = win === 'today' ? Date.now() : (anchorEnd ? noonMs(anchorEnd) : Date.now())

  // Body-Part Balance is FIXED to the trailing 7 days (never pages).
  const balance = useMemo(() => (built.length ? muscleBalance(built, { days: 7 }) : null), [built])
  const openWorkout = useMemo(() => (openId ? built.find((w) => w.id === openId) : null), [openId, built])

  const prevDisabled = win === 'today' || !earliestGym || (viewStart != null && viewStart <= earliestGym)
  const nextDisabled = win === 'today' || !today || anchorEnd >= today
  const showBackToToday = win !== 'today' && !!today && anchorEnd < today
  const changeWin = (w) => { setWin(w); setAnchor(null) } // switching level returns to the present
  const page = (dir) => {
    if (win === 'today' || !today) return
    let next = shiftYMD(anchor || today, dir * WINDOW_DAYS[win])
    if (next > today) next = today
    setAnchor(next)
  }

  // Drill-in sub-views (reused as-is; wired to Training Progress's "more ›" / "records ›").
  if (built.length && openWorkout) {
    return <div className="gym-page"><SessionReport workout={openWorkout} allWorkouts={built} onBack={() => setOpenId(null)} /></div>
  }
  if (built.length && view === 'archive') {
    return <div className="gym-page"><GymArchive rows={sessions} workouts={built} onOpen={setOpenId} onBack={() => setView('front')} /></div>
  }
  if (built.length && view === 'records') {
    return <div className="gym-page"><GymRecords workouts={built} onBack={() => setView('front')} /></div>
  }

  const isFit = !error && data !== null && built.length > 0
  return (
    <div className={isFit ? 'gym-page health-fit' : 'gym-page'}>
      <div className="health-chrome">
        <Breadcrumb crumbs={[{ label: 'Health', onClick: onBack }, { label: 'Gym' }]} />
        <GymTimeControl
          win={win}
          onWin={changeWin}
          onPrev={() => page(-1)}
          onNext={() => page(1)}
          prevDisabled={prevDisabled}
          nextDisabled={nextDisabled}
          viewStart={viewStart}
          viewEnd={win === 'today' ? null : anchorEnd}
          showBackToToday={showBackToToday}
          onBackToToday={() => setAnchor(null)}
        />
      </div>

      {error ? (
        <InlineError message={error} onRetry={() => { setData(null); setError(''); loadGymData().then(setData).catch((e) => setError(e.message || 'Something went wrong.')) }} />
      ) : data === null ? (
        <Skeleton cols={2} />
      ) : built.length === 0 ? (
        <p className="fg-note">No workouts on record yet — once Hevy syncs, the Form Guide fills in here.</p>
      ) : (
        <div className="health-fade" key={`${win}_${anchor || 'now'}`}>
          <div className="gym-body">
            <div className="gym-main">
              <GymConsistency built={built} />
              <GymTraining
                built={built}
                windowStart={viewStart}
                windowEnd={anchorEnd}
                days={days}
                nowForWindow={nowForWindow}
                onMore={() => setView('archive')}
                onRecords={() => setView('records')}
              />
              <GymBalance balance={balance} />
            </div>
            <div className="gym-side">
              <GymActivity activityRows={activityRows} windowStart={actStart} windowEnd={actEnd} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
