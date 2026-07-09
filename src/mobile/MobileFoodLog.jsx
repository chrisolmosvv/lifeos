import { useEffect, useRef, useState } from 'react'
import { useFoodDay } from '../spine/data/useFoodDay'
import { fmtNum, fmtFull } from '../spine/logic/foodFormat'
import { entryMacros, NUTRIENTS, MEAL_SLOTS } from '../spine/logic/foodCalc'
import { loggerFinderConfig } from '../spine/logic/finderConfig'
import { cacheFoodOnLog, logEntry, removeEntry } from '../spine/data/foodWrite'
import MobileFinder from './MobileFinder'

const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }
const R = 42, C = 2 * Math.PI * R

function portion(e) {
  const a = e.amount, u = e.unit || 'g'
  if (!Number.isFinite(a)) return ''
  if (u === 'g' || u === 'ml') return `${Math.round(a)} ${u}`
  if (u === 'serving') return a === 1 ? '1 serving' : `${a} servings`
  return `${a} ${u}`
}

export default function MobileFoodLog({ viewedYMD, isToday, onSwipe, onSubline }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const data = useFoodDay(viewedYMD, refreshKey)
  const [openSlots, setOpenSlots] = useState(() => new Set(MEAL_SLOTS))
  const [finderSlot, setFinderSlot] = useState(null)
  const [toast, setToast] = useState(null)
  const ref = useRef(null)
  const touchRef = useRef({})

  useEffect(() => {
    if (!data.arc) return
    const c = Math.round(data.arc.consumed)
    onSubline(data.arc.hasGoal ? `${c} / ${Math.round(data.arc.goal)} kcal` : `${c} kcal`)
  }, [data.arc]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = ref.current; if (!el) return
    const t = touchRef.current
    function onStart(e) { t.sx = e.touches[0].clientX; t.sy = e.touches[0].clientY; t.lock = null }
    function onMove(e) { if (t.sx == null) return; const dx = e.touches[0].clientX - t.sx, dy = e.touches[0].clientY - t.sy; if (t.lock === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) t.lock = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'; if (t.lock === 'h') e.preventDefault() }
    function onEnd(e) { if (t.lock !== 'h') { t.sx = null; return }; const dx = e.changedTouches[0].clientX - t.sx; if (Math.abs(dx) > 50) onSwipe(dx < 0 ? 1 : -1); t.sx = null; t.lock = null }
    el.addEventListener('touchstart', onStart, { passive: true }); el.addEventListener('touchmove', onMove, { passive: false }); el.addEventListener('touchend', onEnd, { passive: true })
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd) }
  }, [onSwipe])

  async function handleAdd(food, { amount, unit, slot }) {
    try {
      const cached = await cacheFoodOnLog(food)
      const macros = entryMacros(food, amount, unit)
      const row = { entry_date: viewedYMD, meal_slot: slot, food_item_id: cached?.id || food.food_item_id || null, amount, unit, entry_source: 'food_search' }
      for (const k of NUTRIENTS) row[k] = macros[k]
      await logEntry(row)
      setFinderSlot(null)
      setRefreshKey(k => k + 1)
    } catch { setToast("Couldn't add — try again.") }
  }

  async function handleRemove(id) {
    try { await removeEntry(id); setRefreshKey(k => k + 1); setToast('Removed') } catch { setToast("Couldn't remove.") }
  }

  if (finderSlot) return <MobileFinder config={loggerFinderConfig} defaultSlot={finderSlot} onConfirm={handleAdd} onClose={() => setFinderSlot(null)} />

  if (data.loading) return <div className="m-skeleton"><div className="m-sk-block" style={{ height: 80 }} /><div className="m-sk-line" /><div className="m-sk-line m-sk-line--short" /></div>
  if (data.error) return <p className="mf-error">Couldn't load food data.</p>

  const { ledger, arc, split } = data

  return (
    <div className="mf-log" ref={ref}>
      <div className="mf-lead">
        <svg viewBox="0 0 100 100" className="mf-arc">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--rule-faint)" strokeWidth="5" />
          {arc.hasGoal && arc.fraction > 0 && (
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--ink)" strokeWidth="5"
              strokeDasharray={`${arc.fraction * C} ${C}`} strokeLinecap="round" transform="rotate(-90 50 50)" opacity="0.45" />
          )}
        </svg>
        <div className="mf-lead-text">
          <p className="mf-cal-hero">{fmtNum('kcal', arc.consumed)}</p>
          <p className="mf-cal-sub">{arc.hasGoal ? (arc.over ? `${Math.round(arc.overBy)} over` : `${Math.round(arc.remaining)} remaining`) : 'kcal'}</p>
        </div>
      </div>
      {(split.protein > 0 || split.carbs > 0 || split.fat > 0) && (
        <div className="mf-macros">
          <div className="mf-macro-bar">
            {split.protein > 0 && <div className="mf-mb mf-mb--p" style={{ flex: split.protein }} />}
            {split.carbs > 0 && <div className="mf-mb mf-mb--c" style={{ flex: split.carbs }} />}
            {split.fat > 0 && <div className="mf-mb mf-mb--f" style={{ flex: split.fat }} />}
          </div>
          <div className="mf-macro-labels">
            <span>P {fmtNum('protein', ledger.total.protein)}g</span>
            <span>C {fmtNum('carbs', ledger.total.carbs)}g</span>
            <span>F {fmtNum('fat', ledger.total.fat)}g</span>
          </div>
        </div>
      )}
      <hr className="m-rule" style={{ margin: '0 20px' }} />
      {MEAL_SLOTS.map(slot => {
        const { items, subtotal } = ledger.slots[slot]
        const open = openSlots.has(slot)
        return (
          <div key={slot} className="mf-meal">
            <div className="mf-meal-head">
              <button className="mf-meal-toggle" onClick={() => { const n = new Set(openSlots); n.has(slot) ? n.delete(slot) : n.add(slot); setOpenSlots(n) }} type="button">
                <span className="mf-meal-label">{SLOT_LABEL[slot]}</span>
                {items.length > 0 && <span className="mf-meal-count">{items.length}</span>}
                {items.length > 0 && <span className="mf-meal-kcal">{fmtNum('kcal', subtotal.kcal)}</span>}
                {items.length > 0 && <span className="mf-meal-caret">{open ? '▾' : '▸'}</span>}
              </button>
              <button className="mf-add-btn" onClick={() => setFinderSlot(slot)} type="button">+</button>
            </div>
            {open && items.map(e => (
              <div key={e.id} className="mf-entry">
                <div className="mf-entry-left">
                  <div className="mf-entry-name">{e._name}{e._brand && <span className="mf-entry-brand"> · {e._brand}</span>}</div>
                  <div className="mf-entry-meta"><span>{portion(e)}</span><span>{fmtFull('kcal', e.kcal)}</span></div>
                </div>
                <button className="mf-entry-rm" onClick={() => handleRemove(e.id)} type="button">✕</button>
              </div>
            ))}
          </div>
        )
      })}
      {toast && <div className="mc-toast"><span>{toast}</span><button onClick={() => setToast(null)} type="button">✕</button></div>}
    </div>
  )
}
