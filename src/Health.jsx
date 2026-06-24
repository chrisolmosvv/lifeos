import { useEffect, useMemo, useState } from 'react'
import ModuleHeader from './kit/ModuleHeader'
import BoxScoreBand from './kit/BoxScoreBand'
import TrendChart from './kit/TrendChart'
import ConsistencyHeatmap from './kit/ConsistencyHeatmap'
import MuscleBalance from './kit/MuscleBalance'
import RecentSessions from './kit/RecentSessions'
import StoryHeadline from './kit/StoryHeadline'
import SessionReport from './SessionReport'
import { loadGymData } from './gym/gymLoad'
import { buildWorkouts, boxScore, currentStreakDays } from './gym/gymCalc'
import { trendSeries } from './gym/gymTrend'
import { heatmap } from './gym/gymHeatmap'
import { muscleBalance } from './gym/gymBalance'
import { recentSessions } from './gym/gymSessions'
import { storyHeadline } from './gym/gymStory'
import './kit/formGuide.css'

// Health — the broadsheet "Health" section; its front page IS the Gym "Form
// Guide" (Health = Gym until a second sub-section exists). It opens straight into
// content UNDER the shared EditionHeader masthead — no second in-page header
// (G9 removed the bespoke FormGuideHead). Sections are titled with the house
// small-caps ModuleHeader, exactly like Today.
//
// G9 zone 1: the rolling-7-day box-score band. It DISPLAYS calc-layer output
// (gymCalc, fed by gymLoad) — the UI never recomputes a metric. Loads once.
export default function Health() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null) // a session drilled into, or null = front page

  useEffect(() => {
    let alive = true
    loadGymData()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || 'Something went wrong.'))
    return () => {
      alive = false
    }
  }, [])

  const built = useMemo(
    () => (data ? buildWorkouts(data.workouts, data.exercises, data.sets, data.templatesById) : []),
    [data],
  )
  const box = useMemo(() => boxScore(built), [built])
  const trend = useMemo(() => (built.length ? trendSeries(built, { weeks: 12 }) : null), [built])
  const heat = useMemo(() => (built.length ? heatmap(built, { weeks: 12 }) : null), [built])
  const streak = useMemo(() => currentStreakDays(built), [built])
  const balance = useMemo(() => (built.length ? muscleBalance(built) : null), [built])
  const sessions = useMemo(() => (built.length ? recentSessions(built) : []), [built])
  const story = useMemo(() => (built.length ? storyHeadline(built) : null), [built])
  const openWorkout = useMemo(() => (openId ? built.find((w) => w.id === openId) : null), [openId, built])

  return (
    <div className="fg-page">
      {error ? (
        <p className="fg-note">Couldn’t load your training data. {error}</p>
      ) : data === null ? (
        <p className="fg-note">Loading your training…</p>
      ) : built.length === 0 ? (
        <p className="fg-note">No workouts on record yet — once Hevy syncs, the Form Guide fills in here.</p>
      ) : openWorkout ? (
        <SessionReport workout={openWorkout} allWorkouts={built} onBack={() => setOpenId(null)} />
      ) : (
        <>
          <StoryHeadline text={story} />
          <section className="fg-zone">
            <ModuleHeader>The last 7 days</ModuleHeader>
            <BoxScoreBand box={box} />
          </section>
          <section className="fg-zone">
            <ModuleHeader>The trend</ModuleHeader>
            <TrendChart series={trend} />
          </section>
          <section className="fg-zone">
            <ModuleHeader>Consistency</ModuleHeader>
            <ConsistencyHeatmap data={heat} streak={streak} />
          </section>
          <section className="fg-zone">
            <ModuleHeader>Body-part balance</ModuleHeader>
            <MuscleBalance data={balance} />
          </section>
          <section className="fg-zone">
            <ModuleHeader>Recent sessions</ModuleHeader>
            <RecentSessions rows={sessions} onOpen={setOpenId} />
          </section>
        </>
      )}
    </div>
  )
}
