import { useState, useEffect } from 'react'
import { searchFoods } from '../spine/data/foodLoad'
import { itemToFood } from '../spine/logic/foodShape'
import { entryMacros, NUTRIENTS, MEAL_SLOTS } from '../spine/logic/foodCalc'
import { fmtNum } from '../spine/logic/foodFormat'

export default function MobileFinder({ config, defaultSlot, onConfirm, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState(null)
  const [amount, setAmount] = useState(100)
  const [unit, setUnit] = useState('g')
  const [slot, setSlot] = useState(defaultSlot)

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults(null); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchFoods(q)
        setResults(data.results || [])
      } catch { setResults([]) }
      setSearching(false)
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  function pick(r) {
    setPicked(itemToFood(r))
    setAmount(100)
    setUnit('g')
  }

  function confirm() {
    if (!picked || !amount) return
    onConfirm(picked, { amount, unit, slot })
  }

  // Amount step
  if (picked) {
    const units = config.unitsFor ? config.unitsFor(picked) : ['g']
    const macros = entryMacros(picked, amount, unit)
    return (
      <div className="mfi-wrap">
        <button className="mh-back" onClick={() => setPicked(null)} type="button">‹ Search</button>
        <div className="mfi-amount">
          <p className="mfi-name">{picked.name}{picked.brand ? ` · ${picked.brand}` : ''}</p>
          <div className="mfi-units">
            {units.map(u => (
              <button key={u} className={`mfi-chip${unit === u ? ' mfi-chip--on' : ''}`}
                onClick={() => setUnit(u)} type="button">{u}</button>
            ))}
          </div>
          <input className="mfi-input" type="number" inputMode="decimal" value={amount || ''}
            onChange={e => setAmount(Number(e.target.value) || 0)} />
          <div className="mfi-preview">
            <span>{fmtNum('kcal', macros.kcal)} kcal</span>
            <span>P {fmtNum('protein', macros.protein)}g</span>
            <span>C {fmtNum('carbs', macros.carbs)}g</span>
            <span>F {fmtNum('fat', macros.fat)}g</span>
          </div>
          {config.showSlot && (
            <div className="mfi-units" style={{ marginTop: 8 }}>
              {MEAL_SLOTS.map(s => (
                <button key={s} className={`mfi-chip${slot === s ? ' mfi-chip--on' : ''}`}
                  onClick={() => setSlot(s)} type="button">{s.slice(0, 1).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          )}
          <button className="mfi-confirm" onClick={confirm} type="button">Add</button>
        </div>
      </div>
    )
  }

  // Search step
  return (
    <div className="mfi-wrap">
      <button className="mh-back" onClick={onClose} type="button">‹ Back</button>
      <input className="mfi-search" type="search" placeholder={config.title || 'Search foods…'}
        value={query} onChange={e => setQuery(e.target.value)} autoFocus />
      {searching && <p className="mfi-status">Searching…</p>}
      {!searching && results && results.length === 0 && <p className="mfi-status">No results found.</p>}
      {results && results.length > 0 && (
        <div className="mfi-results">
          {results.map((r, i) => (
            <div key={r.id || i} className="mfi-row" onClick={() => pick(r)}>
              <span className="mfi-row-name">{r.display_name || r.name}</span>
              {r.brand && <span className="mfi-row-brand"> · {r.brand}</span>}
              <span className="mfi-row-kcal">{r.kcal != null ? `${Math.round(r.kcal)}` : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
