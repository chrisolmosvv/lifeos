import { amsYMD, shiftYMD, amsTodayYMD } from '../../spine/logic/gymDates'
import { formatVolume, prettyMuscle } from '../../spine/logic/gymFormat'

// GymOverTimeCard — the TR "Gym · over-time" quadrant, governed by the W/M/90 range.
// Ranged aggregates (sessions + volume via boxScore(days), top muscle groups via
// muscleBalance(days)), a per-day consistency dot strip, and the VOLUME TREND line
// (dailyVolumeSeries — rolling-7 by default; see the stage note). "more ›" opens the
// per-day archive (→ SessionReport / Records / Archive, reused). Pure presentation.

// A compact volume trend line (stretched to the cell; no axis — the numbers are above).
function VolLine({ pts }) {
  const vals = pts.map((p) => p.value)
  const max = Math.max(1, ...vals)
  const n = pts.length
  const W = 300, H = 40
  const x = (i) => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
  const y = (v) => H - (v / max) * (H - 3) - 1.5
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  return (
    <svg className="gym-volline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="volume trend">
      <polyline points={line} />
    </svg>
  )
}

export default function GymOverTimeCard({ box, balance, series, built, days, onMore, onRecords }) {
  const today = amsTodayYMD()
  const trained = new Set((built || []).map((w) => amsYMD(w.started_at)))
  const dots = []
  for (let i = days - 1; i >= 0; i--) dots.push(trained.has(shiftYMD(today, -i)))
  const vol = formatVolume(box?.volume)
  const top = (balance?.ranked || []).slice(0, 3)
  const totalSets = balance?.totalSets || 1

  return (
    <div className="gym-over">
      <div className="gym-over-stats">
        <span><b>{box?.sessions ?? 0}</b> sessions</span>
        <span><b>{vol.num}</b> kg</span>
      </div>

      {series?.rolling?.length ? <VolLine pts={series.rolling} /> : null}

      <div className="gym-consistency" aria-hidden="true">
        {dots.map((d, i) => (
          <span key={i} className={d ? 'gym-dot gym-dot--on' : 'gym-dot'} />
        ))}
      </div>

      <div className="gym-balance">
        {top.map((g) => (
          <div className="gym-bal-row" key={g.muscle}>
            <span className="gym-bal-name">{prettyMuscle(g.muscle)}</span>
            <span className="gym-bal-pct">{Math.round((g.sets / totalSets) * 100)}%</span>
          </div>
        ))}
      </div>

      <div className="gym-more-row">
        <button type="button" className="gym-more" onClick={onMore}>more ›</button>
        <button type="button" className="gym-more" onClick={onRecords}>records ›</button>
      </div>
    </div>
  )
}
