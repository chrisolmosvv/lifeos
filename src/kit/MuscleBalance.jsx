import { formatVolume } from '../gym/gymFormat'
import './formGuide.css'

// MuscleBalance — front-page zone 4. A calm ranked list of how the last-7-days
// training split across primary muscle groups (working sets per muscle). Sealed
// gym-kit block: it ONLY displays the calc layer's output (gymBalance) — no
// fetching, no maths. Quiet bars (terracotta mixed onto paper), tabular counts.
// Honest empty state if the window has no working sets.

// "lower_back" → "Lower back" (calm, legible muscle-group labels).
function pretty(m) {
  if (m === 'other') return 'Other'
  return m.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export default function MuscleBalance({ data }) {
  if (!data || data.totalSets === 0) {
    return <p className="fg-band-empty">No working sets logged in the last 7 days.</p>
  }

  const max = data.ranked[0].sets // ranked desc, so the first is the peak

  return (
    <div className="fg-bal">
      {data.ranked.map((g) => (
        <div className="fg-bal-row" key={g.muscle} title={`${g.sets} working sets · ${formatVolume(g.volume).num} kg`}>
          <span className="fg-bal-name">{pretty(g.muscle)}</span>
          <span className="fg-bal-track">
            <i className="fg-bal-fill" style={{ width: `${max > 0 ? (g.sets / max) * 100 : 0}%` }} />
          </span>
          <span className="fg-bal-val tnum">{g.sets}</span>
        </div>
      ))}
    </div>
  )
}
