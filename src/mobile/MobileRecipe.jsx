import { useState, useRef } from 'react'
import { useRecipe } from '../spine/data/useCookbook'
import { fmtNum } from '../spine/logic/foodFormat'

export default function MobileRecipe({ recipeId, onBack }) {
  const data = useRecipe(recipeId)
  const [servings, setServings] = useState(null) // null = use recipe default
  const startX = useRef(null)
  const onTS = (e) => { if (e.touches[0].clientX < 30) startX.current = e.touches[0].clientX }
  const onTE = (e) => {
    if (startX.current != null) {
      if (e.changedTouches[0].clientX - startX.current > 80) onBack()
      startX.current = null
    }
  }

  if (data.loading) return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Cookbook</button>
      <div className="m-skeleton"><div className="m-sk-block" /><div className="m-sk-line" /><div className="m-sk-line m-sk-line--short" /></div>
    </div>
  )
  if (data.error) return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Cookbook</button>
      <p className="mf-error">Couldn't load recipe.</p>
    </div>
  )

  const { recipe, ingredients, steps, macros } = data
  const baseServ = recipe.servings || 1
  const displayServ = servings ?? baseServ
  const scale = displayServ / baseServ
  const totalTime = (recipe.prep_minutes || 0) + (recipe.cook_minutes || 0)

  function adj(d) { setServings(Math.max(1, (servings ?? baseServ) + d)) }

  return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Cookbook</button>

      <div className="mf-rp-head">
        <h2 className="mf-rp-title">{recipe.title || 'Untitled'}</h2>
        {totalTime > 0 && <p className="mf-rp-time">{totalTime} min</p>}
      </div>

      {/* Servings stepper */}
      <div className="mf-rp-servings">
        <button className="mf-rp-adj" onClick={() => adj(-1)} type="button">−</button>
        <span className="mf-rp-serv-num">{displayServ}</span>
        <button className="mf-rp-adj" onClick={() => adj(1)} type="button">+</button>
        <span className="mf-rp-serv-label">servings</span>
      </div>

      {/* Per-serving macros */}
      <div className="mf-rp-macros">
        <span>{fmtNum('kcal', macros.perServing.kcal)} kcal</span>
        <span>P {fmtNum('protein', macros.perServing.protein)}g</span>
        <span>C {fmtNum('carbs', macros.perServing.carbs)}g</span>
        <span>F {fmtNum('fat', macros.perServing.fat)}g</span>
      </div>
      {macros.unestimatedCount > 0 && (
        <p className="mf-rp-unest">{macros.unestimatedCount} ingredient{macros.unestimatedCount > 1 ? 's' : ''} unestimated</p>
      )}

      <hr className="m-rule" style={{ margin: '0 20px' }} />

      {/* Ingredients */}
      <div className="mf-rp-section">
        <p className="mh-kicker">Ingredients</p>
        {ingredients.map((ing, i) => {
          const name = ing.food_item_id && data.itemsById[ing.food_item_id]
            ? (data.itemsById[ing.food_item_id].name || ing.raw_text || '—')
            : (ing.raw_text || '—')
          const amt = Number.isFinite(ing.amount) ? Math.round(ing.amount * scale * 10) / 10 : null
          const unit = ing.unit || 'g'
          return (
            <div key={i} className="mf-rp-ing">
              {amt != null && <span className="mf-rp-ing-amt">{amt} {unit}</span>}
              <span className={`mf-rp-ing-name${ing.no_macros || (!ing.food_item_id && !ing.manual_macros) ? ' mf-rp-flagged' : ''}`}>{name}</span>
            </div>
          )
        })}
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <>
          <hr className="m-rule" style={{ margin: '0 20px' }} />
          <div className="mf-rp-section">
            <p className="mh-kicker">Method</p>
            {steps.map((s, i) => (
              <div key={i} className="mf-rp-step">
                <span className="mf-rp-step-num">{i + 1}</span>
                <span className="mf-rp-step-text">{s.text}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Actions (inert) */}
      <div className="mf-rp-actions">
        {steps.length > 0 && <button className="mf-rp-btn" type="button" onClick={() => {}}>Start cooking</button>}
        <button className="mf-rp-btn mf-rp-btn--muted" type="button" onClick={() => {}}>Log this meal</button>
      </div>
    </div>
  )
}
