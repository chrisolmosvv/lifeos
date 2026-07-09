// LifeOS — Mobile Food: range data hook (spine — ZERO JSX).
//
// Fetches entries across a week/month window, runs dailyTotals + rangeTotals +
// perGoalHits. Returns a full-window day series (gaps = null, not zero).

import { useEffect, useState } from 'react'
import { fetchEntries } from './foodLoad.js'
import { fetchGoals } from './healthLoad.js'
import { resolveGoals } from '../logic/healthGoals.js'
import { dailyTotals, NUTRIENTS } from '../logic/foodCalc.js'
import { rangeTotals, perGoalHits } from '../logic/foodCalcRange.js'
import { shiftYMD } from '../logic/gymDates.js'

export function useFoodRange(endYMD, rangeDays) {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    setState({ loading: true })
    const start = shiftYMD(endYMD, -(rangeDays - 1))
    ;(async () => {
      const [entries, goals] = await Promise.all([
        fetchEntries(start, endYMD),
        fetchGoals(),
      ])
      const goalMap = resolveGoals(goals)
      const daily = dailyTotals(entries)
      const rt = rangeTotals(daily, rangeDays, { end: endYMD })
      const hits = perGoalHits(daily, goalMap, { start, end: endYMD })

      const byDay = new Map(daily.map(d => [d.ymd, d]))
      const allDays = Array.from({ length: rangeDays }, (_, i) => {
        const ymd = shiftYMD(start, i)
        const d = byDay.get(ymd)
        return { ymd, kcal: d?.kcal ?? null, protein: d?.protein ?? null, carbs: d?.carbs ?? null, fat: d?.fat ?? null }
      })

      if (alive) setState({ loading: false, allDays, rt, hits, goalMap, start, end: endYMD, loggedDays: hits.loggedDays })
    })().catch(e => alive && setState({ loading: false, error: e.message || String(e) }))
    return () => { alive = false }
  }, [endYMD, rangeDays])

  return state
}
