// LifeOS — Mobile Health: data hook (spine — ZERO JSX).
//
// Fetches sleep/body/gym on mount, runs the spine calc layer, returns the
// assembled view-model for the Overview + drilled-in faces. Read-only — no
// writes. Mirrors desktop's HealthHub loading pattern (compute-on-read).

import { useEffect, useState } from 'react'
import { fetchSleep, fetchBody, fetchGoals } from './healthLoad.js'
import { loadGymData } from './gymLoad.js'
import { amsTodayYMD } from '../logic/gymDates.js'
import { resolveGoals } from '../logic/healthGoals.js'
import { sleepView, nightsHitGoal } from '../logic/healthSleep.js'
import { metricView as bodyView, dailyValueOn } from '../logic/healthBody.js'
import { buildWorkouts, boxScore } from '../logic/gymCalc.js'

const START = '2026-01-01'

export function useHealthData() {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    const now = Date.now()
    const end = amsTodayYMD(now)
    ;(async () => {
      const [goals, sleepRows, gym, weightRows, bodyFatRows, respRows] = await Promise.all([
        fetchGoals(),
        fetchSleep(START, end),
        loadGymData(),
        fetchBody('weight', START, end),
        fetchBody('body_fat', START, end),
        fetchBody('respiratory_rate', START, end),
      ])

      const goalMap = resolveGoals(goals)
      const sv = sleepView(sleepRows, goalMap, now)
      const body = {
        weight: bodyView('weight', weightRows, goalMap.get('weight'), now),
        body_fat: bodyView('body_fat', bodyFatRows, goalMap.get('body_fat'), now),
      }

      const built = buildWorkouts(gym.workouts, gym.exercises, gym.sets, gym.templatesById)
      const box = boxScore(built, 7, now)

      // Sleep face extras
      const today = amsTodayYMD(now)
      const durGoal = goalMap.get('sleep_duration') ?? null
      const sleepGoalTally = nightsHitGoal(sleepRows, durGoal, today, 7)
      const respRate = sv.lastNight ? dailyValueOn(respRows, sv.lastNight.nightDate) : null

      const stamps = [
        sv.lastNight?.wokeAt,
        built[0]?.ended_at || built[0]?.started_at,
        body.weight.latestRaw?.at,
        body.body_fat.latestRaw?.at,
      ].filter(Boolean)
      const asOfTs = stamps.length
        ? stamps.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b))
        : null

      if (alive) setState({
        loading: false, sleep: sv, sleepRows, sleepGoalTally,
        respiratoryRate: respRate, body, gym: box,
        gymHasData: built.length > 0, asOfTs,
      })
    })().catch(e => alive && setState({ loading: false, error: e.message || String(e) }))
    return () => { alive = false }
  }, [])

  return state
}
