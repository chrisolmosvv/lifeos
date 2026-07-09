import { useEffect, useRef } from 'react'
import { useFoodRange } from '../spine/data/useFoodRange'
import { fmtNum } from '../spine/logic/foodFormat'

const CHARTS = [
  { key: 'kcal', label: 'Calories', goalType: 'calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', goalType: 'protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', goalType: 'carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', goalType: 'fat', unit: 'g' },
]

export default function MobileFoodRange({ endYMD, rangeDays, onSwipe, onSubline }) {
  const data = useFoodRange(endYMD, rangeDays)
  const ref = useRef(null)
  const touchRef = useRef({})

  useEffect(() => {
    if (!data.rt) return
    const avg = data.rt.perNutrient?.kcal?.avg
    onSubline(avg != null ? `avg ${Math.round(avg)} kcal · ${data.loggedDays} days logged` : '')
  }, [data.rt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe for range paging
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
    <div className="m-skeleton"><div className="m-sk-block" style={{ height: 60 }} /><div className="m-sk-block" /><div className="m-sk-block" /></div>
  )
  if (data.error) return <p className="mf-error">Couldn't load range data.</p>
  if (data.loggedDays < 2) return <p className="mf-empty">Not enough data yet — log at least 2 days.</p>

  const { allDays, rt, hits, goalMap } = data

  return (
    <div className="mf-range" ref={ref}>
      {/* Summary band */}
      <div className="mf-range-summary">
        <div className="mf-rs-hero">
          <span className="mf-rs-num">{rt.perNutrient.kcal.avg != null ? Math.round(rt.perNutrient.kcal.avg) : '—'}</span>
          <span className="mf-rs-unit">avg kcal</span>
        </div>
        <div className="mf-rs-macros">
          <span>P {rt.perNutrient.protein.avg != null ? fmtNum('protein', rt.perNutrient.protein.avg) : '—'}g</span>
          <span>C {rt.perNutrient.carbs.avg != null ? fmtNum('carbs', rt.perNutrient.carbs.avg) : '—'}g</span>
          <span>F {rt.perNutrient.fat.avg != null ? fmtNum('fat', rt.perNutrient.fat.avg) : '—'}g</span>
        </div>
        <div className="mf-rs-meta">
          <span>{data.loggedDays} days logged</span>
          {hits.goals.calories && <span>{hits.goals.calories.hit} of {hits.goals.calories.of} on target</span>}
        </div>
      </div>

      <hr className="m-rule" style={{ margin: '0 20px' }} />

      {/* 4 macro charts */}
      {CHARTS.map(({ key, label, goalType, unit }) => {
        const vals = allDays.map(d => d[key])
        const goal = goalMap?.get?.(goalType)?.target_value ?? null
        return <MacroChart key={key} label={label} unit={unit} data={vals} goal={goal} />
      })}
    </div>
  )
}

function MacroChart({ label, unit, data, goal }) {
  const finite = data.filter(v => v != null && Number.isFinite(v))
  const max = Math.max(...finite, goal || 0, 1)
  const w = data.length * 3

  return (
    <div className="mf-chart">
      <div className="mf-chart-head">
        <span className="mf-chart-label">{label}</span>
        {goal != null && <span className="mf-chart-goal">goal {Math.round(goal)} {unit}</span>}
      </div>
      <svg viewBox={`0 0 ${w} 40`} preserveAspectRatio="none" className="mf-chart-svg">
        {goal != null && <line x1="0" y1={40 - (goal / max) * 36} x2={w} y2={40 - (goal / max) * 36} stroke="var(--accent)" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.6" />}
        {data.map((v, i) => v != null && v > 0 ? (
          <rect key={i} x={i * 3 + 0.5} width="2" y={40 - (v / max) * 36} height={Math.max((v / max) * 36, 0.5)} fill="var(--ink)" opacity="0.22" />
        ) : null)}
      </svg>
    </div>
  )
}
