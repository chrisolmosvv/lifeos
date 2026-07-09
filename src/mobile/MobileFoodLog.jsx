import { useEffect, useRef, useState } from 'react'
import { useFoodDay } from '../spine/data/useFoodDay'
import { fmtNum, fmtFull } from '../spine/logic/foodFormat'
import { MEAL_SLOTS } from '../spine/logic/foodCalc'

const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }
const R = 42, C = 2 * Math.PI * R // arc circumference ~264

function portion(e) {
  const a = e.amount
  const u = e.unit || 'g'
  if (!Number.isFinite(a)) return ''
  if (u === 'g' || u === 'ml') return `${Math.round(a)} ${u}`
  if (u === 'serving') return a === 1 ? '1 serving' : `${a} servings`
  return `${a} ${u}`
}

export default function MobileFoodLog({ viewedYMD, isToday, onSwipe, onSubline }) {
  const data = useFoodDay(viewedYMD)
  const [openSlots, setOpenSlots] = useState(() => new Set(MEAL_SLOTS))
  const ref = useRef(null)
  const touchRef = useRef({})

  // Thread subline
  useEffect(() => {
    if (!data.arc) return
    const c = Math.round(data.arc.consumed)
    onSubline(data.arc.hasGoal ? `${c} / ${Math.round(data.arc.goal)} kcal` : `${c} kcal`)
  }, [data.arc]) // eslint-disable-line react-hooks/exhaustive-deps

  // Horizontal swipe for day paging
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const t = touchRef.current
    function onStart(e) { t.sx = e.touches[0].clientX; t.sy = e.touches[0].clientY; t.lock = null }
    function onMove(e) {
      if (t.sx == null) return
      const dx = e.touches[0].clientX - t.sx, dy = e.touches[0].clientY - t.sy
      if (t.lock === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) t.lock = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (t.lock === 'h') e.preventDefault()
    }
    function onEnd(e) {
      if (t.lock !== 'h') { t.sx = null; return }
      const dx = e.changedTouches[0].clientX - t.sx
      if (Math.abs(dx) > 50) onSwipe(dx < 0 ? 1 : -1)
      t.sx = null; t.lock = null
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd) }
  }, [onSwipe])

  if (data.loading) return (
    <div className="m-skeleton">
      <div className="m-sk-block" style={{ height: 80 }} />
      <div className="m-sk-line" /><div className="m-sk-line m-sk-line--short" />
    </div>
  )
  if (data.error) return <p className="mf-error">Couldn't load food data.</p>

  const { ledger, arc, split } = data
  const hasEntries = MEAL_SLOTS.some(s => ledger.slots[s].items.length > 0)

  function toggleSlot(s) {
    setOpenSlots(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  return (
    <div className="mf-log" ref={ref}>
      {/* Calorie lead */}
      <div className="mf-lead">
        <svg viewBox="0 0 100 100" className="mf-arc">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--rule-faint)" strokeWidth="5" />
          {arc.hasGoal && arc.fraction > 0 && (
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--ink)" strokeWidth="5"
              strokeDasharray={`${arc.fraction * C} ${C}`} strokeLinecap="round"
              transform="rotate(-90 50 50)" opacity="0.45" />
          )}
        </svg>
        <div className="mf-lead-text">
          <p className="mf-cal-hero">{fmtNum('kcal', arc.consumed)}</p>
          <p className="mf-cal-sub">
            {arc.hasGoal
              ? (arc.over ? `${Math.round(arc.overBy)} over` : `${Math.round(arc.remaining)} remaining`)
              : 'kcal'}
          </p>
        </div>
      </div>

      {/* Macro split bar */}
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

      {/* Meal ledger */}
      {!hasEntries ? (
        <p className="mf-empty">{isToday ? 'Nothing logged yet today.' : 'Nothing logged this day.'}</p>
      ) : (
        MEAL_SLOTS.map(slot => {
          const { items, subtotal } = ledger.slots[slot]
          if (items.length === 0) return null
          const open = openSlots.has(slot)
          return (
            <div key={slot} className="mf-meal">
              <button className="mf-meal-head" onClick={() => toggleSlot(slot)} type="button">
                <span className="mf-meal-label">{SLOT_LABEL[slot]}</span>
                <span className="mf-meal-count">{items.length}</span>
                <span className="mf-meal-kcal">{fmtNum('kcal', subtotal.kcal)}</span>
                <span className="mf-meal-caret">{open ? '▾' : '▸'}</span>
              </button>
              {open && items.map(e => (
                <div key={e.id} className="mf-entry">
                  <div className="mf-entry-name">
                    {e._name}
                    {e._brand && <span className="mf-entry-brand"> · {e._brand}</span>}
                  </div>
                  <div className="mf-entry-meta">
                    <span>{portion(e)}</span>
                    <span>{fmtFull('kcal', e.kcal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
