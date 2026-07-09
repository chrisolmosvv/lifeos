import { useState } from 'react'
import MobileRecipe from './MobileRecipe'
import { useCookbookList } from '../spine/data/useCookbook'
import { fmtNum } from '../spine/logic/foodFormat'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'recipe', label: 'Recipes' },
  { key: 'meal', label: 'Meals' },
  { key: 'fav', label: 'Favourites' },
]

export default function MobileCookbook() {
  const data = useCookbookList()
  const [recipeId, setRecipeId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  if (recipeId) return <MobileRecipe recipeId={recipeId} onBack={() => setRecipeId(null)} />

  if (data.loading) return (
    <div className="m-skeleton"><div className="m-sk-line m-sk-line--kicker" /><div className="m-sk-line" /><div className="m-sk-line" /><div className="m-sk-line" /></div>
  )
  if (data.error) return <p className="mf-error">Couldn't load cookbook.</p>

  const q = query.toLowerCase()
  const filtered = (data.list || []).filter(r => {
    if (filter === 'recipe' && r.kind !== 'recipe') return false
    if (filter === 'meal' && r.kind !== 'meal') return false
    if (filter === 'fav' && !r.is_favourite) return false
    if (q && !r.title?.toLowerCase().includes(q)) return false
    return true
  })

  function timeStr(r) {
    const t = (r.prep_minutes || 0) + (r.cook_minutes || 0)
    return t > 0 ? `${t} min` : null
  }

  return (
    <div className="mf-cb">
      <div className="mf-cb-filters">
        {FILTERS.map(f => (
          <button key={f.key} className={`mf-rt${filter === f.key ? ' mf-rt--on' : ''}`}
            onClick={() => setFilter(f.key)} type="button">{f.label}</button>
        ))}
      </div>
      <input className="mf-cb-search" type="text" placeholder="Search recipes…"
        value={query} onChange={e => setQuery(e.target.value)} />
      {filtered.length === 0 ? (
        <p className="mf-empty">{query ? 'No matches.' : 'No recipes yet.'}</p>
      ) : (
        filtered.map(r => (
          <div key={r.id} className="mf-cb-row" onClick={() => setRecipeId(r.id)}>
            <div className="mf-cb-title">
              {r.is_favourite && <span className="mf-cb-fav">★ </span>}
              {r.title || 'Untitled'}
            </div>
            <div className="mf-cb-meta">
              {timeStr(r) && <span>{timeStr(r)}</span>}
              <span>{r.servings || '—'} servings</span>
              <span>{fmtNum('kcal', r.macros?.perServing?.kcal)} kcal/serving</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
