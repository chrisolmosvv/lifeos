// LifeOS — Mobile Food: cookbook data hooks (spine — ZERO JSX).

import { useEffect, useState } from 'react'
import { fetchCookbook, fetchRecipe } from './recipeLoad.js'
import { recipeMacros, recipeKind, lastCookedFor } from '../logic/recipeCalc.js'

export function useCookbookList() {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    let alive = true
    ;(async () => {
      const cb = await fetchCookbook()
      const list = cb.recipes.map(r => {
        const ings = cb.ingredientsByRecipe[r.id] || []
        const stepCount = cb.stepCountByRecipe[r.id] || 0
        const kind = recipeKind({ ingredients: ings, steps: Array(stepCount) })
        const macros = recipeMacros(ings, r.servings, cb.itemsById)
        const cooked = lastCookedFor({ ...r, ingredients: ings, steps: Array(stepCount) }, cb.cookEntries)
        return { ...r, kind, macros, lastCooked: cooked }
      })
      if (alive) setState({ loading: false, list })
    })().catch(e => alive && setState({ loading: false, error: e.message || String(e) }))
    return () => { alive = false }
  }, [])
  return state
}

export function useRecipe(id) {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    if (!id) return
    let alive = true
    setState({ loading: true })
    ;(async () => {
      const data = await fetchRecipe(id)
      const macros = recipeMacros(data.ingredients, data.recipe.servings, data.itemsById)
      if (alive) setState({ loading: false, recipe: data.recipe, ingredients: data.ingredients, steps: data.steps, itemsById: data.itemsById, macros })
    })().catch(e => alive && setState({ loading: false, error: e.message || String(e) }))
    return () => { alive = false }
  }, [id])
  return state
}
