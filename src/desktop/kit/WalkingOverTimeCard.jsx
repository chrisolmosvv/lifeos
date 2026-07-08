// WalkingOverTimeCard — the BR "Walking · over-time" quadrant, governed by W/M/90.
// Ranged daily AVERAGES over the window, to-yesterday (metricView.rolling[days].avg —
// completed days only, the partial today excluded; same "to-yesterday" Body uses). Steps
// hero (avg/day) + the mobility average row. "more ›" opens a terminal per-day table.
// Pace = walking_speed shown raw as km/h (see the WalkingTodayCard note / the gate).
const whole = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString('en-GB') : '—')
const dec1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—')

export default function WalkingOverTimeCard({ activity, days, onMore }) {
  const avg = (m) => activity?.[m]?.rolling?.[days]?.avg
  const steps = avg('steps')
  if (!Number.isFinite(steps)) {
    return <p className="gym-ph gym-walk-empty">No walking data in this window yet.</p>
  }
  const mini = [
    { label: 'flights', val: whole(avg('flights_climbed')) },
    { label: 'stand', val: `${whole(avg('stand_minutes'))}m` },
    { label: 'pace', val: `${dec1(avg('walking_speed'))} km/h` },
    { label: 'walk HR', val: `${whole(avg('walking_heart_rate_avg'))}` },
    { label: 'stride', val: `${whole(avg('walking_step_length'))}cm` },
  ]
  return (
    <div className="gym-walk">
      <div className="gym-walk-hero">
        {whole(steps)}<span className="gym-walk-unit">steps/day</span>
      </div>
      <div className="gym-walk-label">avg · <b>to yesterday</b></div>
      <div className="gym-walk-mini">
        {mini.map((m) => (
          <div className="gym-walk-cell" key={m.label}>
            <span className="gym-walk-cell-label">{m.label}</span>
            <b>{m.val}</b>
          </div>
        ))}
      </div>
      <button type="button" className="gym-more gym-walk-more" onClick={onMore}>more ›</button>
    </div>
  )
}
