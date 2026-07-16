import { useState, useRef } from 'react'
import { metaFor, fmtFull } from '../spine/logic/bodyFormat'
import { baselineBand, goalProgress, BAND_MIN_READINGS } from '../spine/logic/healthBodyRange'
import { amsTodayYMD } from '../spine/logic/gymDates'

const GROUPS = [
  { name: 'Composition', keys: ['weight', 'body_fat', 'lean_mass'] },
  { name: 'Energy', keys: ['active_energy', 'resting_energy'] },
  { name: 'Vitals', keys: ['resting_heart_rate', 'respiratory_rate'] },
]
const JOURNEY = new Set(['weight', 'body_fat'])
const BASELINE = new Set(['resting_heart_rate', 'respiratory_rate'])

export default function MobileHealthBody({ data, onBack }) {
  const [expanded, setExpanded] = useState(null)
  const startX = useRef(null)
  const today = amsTodayYMD()

  const onTS = (e) => { if (e.touches[0].clientX < 30) startX.current = e.touches[0].clientX }
  const onTE = (e) => {
    if (startX.current != null) {
      if (e.changedTouches[0].clientX - startX.current > 80) onBack()
      startX.current = null
    }
  }

  const view = (m) => data.bodyAll?.[m] || data.activity?.[m] || null
  const latest = (m) => {
    const v = view(m)
    return v?.latestRaw?.value ?? v?.latestCompleted?.value ?? null
  }

  function bandCell(m) {
    if (JOURNEY.has(m)) {
      const prog = goalProgress(data.bodyRows?.[m], data.goalMap?.get(m) ?? null, { end: today })
      if (!prog) return <span className="mh-mr-band mh-muted">no goal</span>
      if (prog.met) return <span className="mh-mr-band">goal met</span>
      return (
        <span className="mh-mr-band">
          <span className="mh-journey"><span className="mh-journey-fill" style={{ width: `${Math.round(prog.fraction * 100)}%` }} /></span>
        </span>
      )
    }
    if (BASELINE.has(m)) {
      const bb = baselineBand(data.bodyRows?.[m], { end: today })
      if (!bb.hasEnoughData) return <span className="mh-mr-band mh-muted">{bb.n}/{BAND_MIN_READINGS}</span>
      const avg = view(m)?.rolling?.[7]?.avg
      if (avg == null) return <span className="mh-mr-band mh-muted">—</span>
      const v = avg < bb.lo ? 'low' : avg > bb.hi ? 'high' : 'in range'
      return <span className={`mh-mr-band${v !== 'in range' ? ' mh-mr-warn' : ''}`}>{v}</span>
    }
    return <span className="mh-mr-band mh-muted">—</span>
  }

  return (
    <div className="mh-face" onTouchStart={onTS} onTouchEnd={onTE}>
      <button className="mh-back" onClick={onBack} type="button">‹ Body</button>
      {GROUPS.map((g, gi) => (
        <div key={g.name}>
          {gi > 0 && <hr className="m-rule" style={{ margin: '0 20px' }} />}
          <div style={{ padding: '0 20px' }}>
            <p className="mh-kicker" style={{ marginTop: 12 }}>{g.name}</p>
            {g.keys.map(m => {
              const v = view(m)
              const val = latest(m)
              const dir = v?.trend?.dir
              const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : dir === 'flat' ? '→' : ''
              const isExp = expanded === m
              return (
                <div key={m}>
                  <div className="mh-metric-row" onClick={() => setExpanded(isExp ? null : m)}>
                    <span className="mh-mr-name">{metaFor(m).label}</span>
                    <span className="mh-mr-val">{val != null ? fmtFull(m, val) : <span className="mh-muted">—</span>}</span>
                    <span className="mh-mr-arrow">{arrow}</span>
                    {bandCell(m)}
                  </div>
                  {isExp && <MetricChart view={v} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function MetricChart({ view }) {
  const values = (view?.rolling?.[90]?.values || []).filter(v => Number.isFinite(v.value))
  if (values.length < 2) return <p className="mh-chart-empty">Not enough data yet.</p>
  const nums = values.map(v => v.value)
  const lo = Math.min(...nums), hi = Math.max(...nums), span = hi - lo || 1
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * 200},${76 - ((v.value - lo) / span) * 68}`
  ).join(' ')
  return (
    <div className="mh-chart-wrap">
      <svg viewBox="0 0 200 80" preserveAspectRatio="none" className="mh-chart-svg">
        <polyline points={pts} fill="none" stroke="var(--ink)" strokeWidth="1.2"
          opacity="0.35" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mh-chart-labels">
        <span>90 days</span>
        <span>{fmtFull(view.metric, nums[nums.length - 1])}</span>
      </div>
    </div>
  )
}
