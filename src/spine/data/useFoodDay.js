// LifeOS — Mobile Food: day data hook (spine — ZERO JSX).
//
// Fetches one day's food log entries + goals, resolves display names, runs
// dayLedger + calorieArc + macroSplit. Read-only — no writes this phase.

import { useEffect, useState } from 'react'
import { fetchEntries, fetchNames } from './foodLoad.js'
import { fetchGoals } from './healthLoad.js'
import { resolveGoals } from '../logic/healthGoals.js'
import { dayLedger, calorieArc, macroSplit } from '../logic/foodCalc.js'

export function useFoodDay(viewedYMD, refreshKey = 0) {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    setState({ loading: true })
    ;(async () => {
      const [entries, goals] = await Promise.all([
        fetchEntries(viewedYMD, viewedYMD),
        fetchGoals(),
      ])

      const itemIds = [...new Set(entries.filter(e => e.food_item_id).map(e => e.food_item_id))]
      const recipeIds = [...new Set(entries.filter(e => e.recipe_id).map(e => e.recipe_id))]
      const names = await fetchNames(itemIds, recipeIds)

      const named = entries.map(e => ({
        ...e,
        _name: e.food_item_id ? (names.itemById[e.food_item_id]?.name || 'Food')
             : e.recipe_id ? (names.recipeById[e.recipe_id] || 'Meal')
             : e.entry_label || '—',
        _brand: e.food_item_id ? (names.itemById[e.food_item_id]?.brand || null) : null,
      }))

      const goalMap = resolveGoals(goals)
      const ledger = dayLedger(named, goalMap, { day: viewedYMD })
      const arc = calorieArc(ledger.total.kcal, goalMap.get('calories')?.target_value)
      const split = macroSplit(ledger.total)

      if (alive) setState({ loading: false, ledger, arc, split })
    })().catch(e => alive && setState({ loading: false, error: e.message || String(e) }))
    return () => { alive = false }
  }, [viewedYMD, refreshKey])

  return state
}
