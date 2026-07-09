import { useState } from 'react'
import { importRecipe } from '../spine/data/importClient'
import { createRecipe } from '../spine/data/recipeWrite'
import { recipeMacros } from '../spine/logic/recipeCalc'
import { fmtNum } from '../spine/logic/foodFormat'
import { recipeFinderConfig } from '../spine/logic/finderConfig'
import MobileFinder from './MobileFinder'

export default function MobileImport({ onBack, onSaved }) {
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(null)
  const [itemsById, setItemsById] = useState({})
  const [saving, setSaving] = useState(false)
  const [fixIdx, setFixIdx] = useState(null) // ingredient index being fixed via Finder

  async function parse() {
    if (!input.trim()) return
    setParsing(true); setError(null)
    const isUrl = /^https?:\/\//.test(input.trim())
    const result = await importRecipe(isUrl ? { url: input.trim() } : { text: input.trim() })
    setParsing(false)
    if (!result.ok) {
      setError(result.error === 'fetch_fail' ? "Couldn't fetch that URL — try pasting the text instead."
        : result.error === 'parse_fail' ? "Couldn't read that recipe — try pasting cleaner text."
        : "Something went wrong — try again.")
      return
    }
    setDraft(result.draft)
    setItemsById(result.itemsById || {})
  }

  function fixIngredient(food, { amount, unit }) {
    if (fixIdx == null || !draft) return
    const ings = [...draft.ingredients]
    ings[fixIdx] = { ...ings[fixIdx], food_item_id: food.food_item_id, amount, unit }
    setItemsById(prev => ({ ...prev, [food.food_item_id]: food }))
    setDraft({ ...draft, ingredients: ings })
    setFixIdx(null)
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      const id = await createRecipe(
        { title: draft.title, servings: draft.servings, prep_minutes: draft.prep_minutes, cook_minutes: draft.cook_minutes, source_url: draft.source_url },
        draft.ingredients, draft.steps
      )
      onSaved?.(id)
    } catch { setError("Couldn't save — try again."); setSaving(false) }
  }

  // Ingredient fix via Finder
  if (fixIdx != null) {
    return <MobileFinder config={recipeFinderConfig} defaultSlot={null} onConfirm={fixIngredient} onClose={() => setFixIdx(null)} />
  }

  // Review step
  if (draft) {
    const macros = recipeMacros(draft.ingredients, draft.servings || 1, itemsById)
    const unmatched = draft.ingredients.filter(i => !i.food_item_id && !i.no_macros).length
    return (
      <div className="mi-wrap">
        <button className="mh-back" onClick={() => setDraft(null)} type="button">‹ Back</button>
        <div className="mi-section">
          <input className="mi-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          <div className="mi-meta">
            <label>Servings <input type="number" className="mi-num" value={draft.servings || ''} onChange={e => setDraft({ ...draft, servings: Number(e.target.value) || null })} /></label>
          </div>
          <div className="mi-macros">
            <span>{fmtNum('kcal', macros.perServing.kcal)} kcal/serving</span>
            <span>P {fmtNum('protein', macros.perServing.protein)}g</span>
            <span>C {fmtNum('carbs', macros.perServing.carbs)}g</span>
            <span>F {fmtNum('fat', macros.perServing.fat)}g</span>
          </div>
          {unmatched > 0 && <p className="mi-flag">{unmatched} ingredient{unmatched > 1 ? 's' : ''} unestimated</p>}
        </div>
        <hr className="m-rule" style={{ margin: '0 20px' }} />
        <div className="mi-section">
          <p className="mh-kicker">Ingredients</p>
          {draft.ingredients.map((ing, i) => {
            const matched = !!ing.food_item_id
            const name = matched && itemsById[ing.food_item_id] ? (itemsById[ing.food_item_id].name || ing.raw_text) : ing.raw_text || ing.parsedName || '—'
            return (
              <div key={i} className={`mi-ing${!matched ? ' mi-ing--unmatched' : ''}`} onClick={() => setFixIdx(i)}>
                {ing.amount != null && <span className="mi-ing-amt">{Math.round(ing.amount * 10) / 10} {ing.unit || 'g'}</span>}
                <span className="mi-ing-name">{name}</span>
                {!matched && <span className="mi-ing-fix">fix</span>}
              </div>
            )
          })}
        </div>
        {draft.steps?.length > 0 && (
          <>
            <hr className="m-rule" style={{ margin: '0 20px' }} />
            <div className="mi-section">
              <p className="mh-kicker">Steps</p>
              {draft.steps.map((s, i) => (
                <div key={i} className="mi-step"><span className="mi-step-num">{i + 1}</span><span>{s.text}</span></div>
              ))}
            </div>
          </>
        )}
        {error && <p className="mi-error">{error}</p>}
        <div className="mi-actions">
          <button className="mi-save" onClick={save} disabled={saving} type="button">{saving ? 'Saving…' : 'Save to Cookbook'}</button>
        </div>
      </div>
    )
  }

  // Input step
  return (
    <div className="mi-wrap">
      <button className="mh-back" onClick={onBack} type="button">‹ Cookbook</button>
      <div className="mi-section">
        <p className="mi-heading">Import a recipe</p>
        <textarea className="mi-input" rows={6} placeholder="Paste a recipe or a URL…"
          value={input} onChange={e => setInput(e.target.value)} />
        {error && <p className="mi-error">{error}</p>}
        <button className="mi-parse" onClick={parse} disabled={parsing} type="button">
          {parsing ? 'Reading the recipe…' : 'Parse'}
        </button>
      </div>
    </div>
  )
}
