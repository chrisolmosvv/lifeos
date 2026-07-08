// LifeOS — Mobile Health: overview data hook (spine — ZERO JSX).
//
// Fetches sleep/body/gym on mount, runs the spine calc layer, returns the
// assembled view-model for the Overview hub. Read-only — no writes. Mirrors
// desktop's HealthHub loading pattern (compute-on-read, fresh each open).

import { useEffect, useState } from 'react'
import { fetchSleep, fetchBody, fetchGoals } from './healthLoad.js'
import { loadGymData } from './gymLoad.js'
import { amsTodayYMD } from '../logic/gymDates.js'
import { resolveGoals } from '../logic/healthGoals.js'
import { sleepView } from '../logic/healthSleep.js'
import { metricView as bodyView } from '../logic/healthBody.js'
import { buildWorkouts, boxScore } from '../logic/gymCalc.js'

const START = '2026-01-01'
const OVERVIEW_BODY = ['weight', 'body_fat']

export function useHealthData() {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    const now = Date.now()
    const end = amsTodayYMD(now)
    ;(async () => {
      const [goals, sleep, gym, ...bodyRows] = await Promise.all([
        fetchGoals(),
        fetchSleep(START, end),
        loadGymData(),
        ...OVERVIEW_BODY.map(m => fetchBody(m, START, end)),
      ])

      const goalMap = resolveGoals(goals)
      const sv = sleepView(sleep, goalMap, now)
      const body = {}
      OVERVIEW_BODY.forEach((m, i) => {
        body[m] = bodyView(m, bodyRows[i], goalMap.get(m), now)
      })

      const built = buildWorkouts(gym.workouts, gym.exercises, gym.sets, gym.templatesById)
      const box = boxScore(built, 7, now)

      const stamps = [
        sv.lastNight?.wokeAt,
        built[0]?.ended_at || built[0]?.started_at,
        ...OVERVIEW_BODY.map(m => body[m].latestRaw?.at),
      ].filter(Boolean)
      const asOfTs = stamps.length
        ? stamps.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b))
        : null

      if (alive) setState({ loading: false, sleep: sv, body, gym: box, gymHasData: built.length > 0, asOfTs })
    })().catch(e => alive && setState({ loading: false, error: e.message || String(e) }))
    return () => { alive = false }
  }, [])

  return state
}
