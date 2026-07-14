// LifeOS — Mobile Health: data hook (spine — ZERO JSX).
//
// Fetches sleep/body/gym/activity on mount, runs the spine calc layer, returns
// the assembled view-model for Overview + all drilled-in faces. Read-only.

import { useEffect, useState } from 'react'
import { fetchSleep, fetchBody, fetchActivity, fetchGoals } from './healthLoad.js'
import { loadGymData } from './gymLoad.js'
import { amsTodayYMD } from '../logic/gymDates.js'
import { resolveGoals } from '../logic/healthGoals.js'
import { sleepView, nightsHitGoal } from '../logic/healthSleep.js'
import { metricView as bodyMV } from '../logic/healthBody.js'
import { metricView as activityMV } from '../logic/healthActivity.js'
import { buildWorkouts, boxScore } from '../logic/gymCalc.js'

const START = '2026-01-01'
const BODY_KEYS = ['weight', 'body_fat', 'lean_mass', 'resting_heart_rate', 'respiratory_rate', 'bmi', 'blood_oxygen']
const ACT_KEYS = ['active_energy', 'resting_energy']

export function useHealthData() {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    const now = Date.now()
    const end = amsTodayYMD(now)
    ;(async () => {
      const res = await Promise.all([
        fetchGoals(), fetchSleep(START, end), loadGymData(),
        ...BODY_KEYS.map(m => fetchBody(m, START, end)),
        ...ACT_KEYS.map(m => fetchActivity(m, START, end)),
      ])
      const goalMap = resolveGoals(res[0])
      const sleepRows = res[1]
      const gym = res[2]

      // Body metrics (all)
      const bodyAll = {}, bodyRows = {}
      BODY_KEYS.forEach((m, i) => {
        const rows = res[3 + i]
        bodyRows[m] = rows
        bodyAll[m] = bodyMV(m, rows, goalMap.get(m), now)
      })

      // Activity metrics
      const activity = {}
      ACT_KEYS.forEach((m, i) => {
        activity[m] = activityMV(m, res[3 + BODY_KEYS.length + i], now)
      })

      // Sleep
      const sv = sleepView(sleepRows, goalMap, now)
      const today = amsTodayYMD(now)
      const durGoal = goalMap.get('sleep_duration') ?? null
      const sleepGoalTally = nightsHitGoal(sleepRows, durGoal, today, 7)

      // Gym
      const built = buildWorkouts(gym.workouts, gym.exercises, gym.sets, gym.templatesById)
      const box = boxScore(built, 7, now)

      // Freshness
      const stamps = [
        sv.lastNight?.wokeAt, built[0]?.ended_at || built[0]?.started_at,
        ...BODY_KEYS.map(m => bodyAll[m].latestRaw?.at),
      ].filter(Boolean)
      const asOfTs = stamps.length
        ? stamps.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b))
        : null

      if (alive) setState({
        loading: false,
        sleep: sv, sleepRows, sleepGoalTally,
        body: { weight: bodyAll.weight, body_fat: bodyAll.body_fat },
        bodyAll, bodyRows, activity, goalMap,
        gym: box, gymWorkouts: built, gymHasData: built.length > 0, asOfTs,
      })
    })().catch(e => alive && setState({ loading: false, error: e.message || String(e) }))
    return () => { alive = false }
  }, [])

  return state
}
