// WalkingTodayCard — the BL "Walking · today" quadrant: TODAY-SO-FAR (the partial
// current day). Reuses metricView's `todaySoFar` field (the partial today, distinct from
// the completed-days rolling used by Body/BR — so no new calc, and Body's "to-yesterday"
// is untouched). Steps hero + a mobility mini-row (flights / stand / pace / walk-HR /
// stride). An honesty label ("today · so far") so a partial day never misreads as a
// collapse vs the over-time average. Empty today (no sync yet) → a waiting line.
//
// ⚠ PACE = walking_speed shown as the RAW value with a "km/h" label — NO conversion. The
// stored value (~3.6–5.0) is a km/h magnitude mislabelled unit "m/s" at the source; the
// number is already km/h. (Owner to confirm on a real push — flagged in the handoff.)
const whole = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString('en-GB') : '—')
const dec1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—')

export default function WalkingTodayCard({ activity }) {
  const so = (m) => activity?.[m]?.todaySoFar?.value
  const steps = so('steps')
  if (!Number.isFinite(steps)) {
    return <p className="gym-ph gym-walk-empty">today · so far — waiting for today’s sync</p>
  }
  const mini = [
    { label: 'flights', val: whole(so('flights_climbed')) },
    { label: 'stand', val: `${whole(so('stand_minutes'))}m` },
    { label: 'pace', val: `${dec1(so('walking_speed'))} km/h` },
    { label: 'walk HR', val: `${whole(so('walking_heart_rate_avg'))}` },
    { label: 'stride', val: `${whole(so('walking_step_length'))}cm` },
  ]
  return (
    <div className="gym-walk">
      <div className="gym-walk-hero">
        {whole(steps)}<span className="gym-walk-unit">steps</span>
      </div>
      <div className="gym-walk-label">today · <b>so far</b></div>
      <div className="gym-walk-mini">
        {mini.map((m) => (
          <div className="gym-walk-cell" key={m.label}>
            <span className="gym-walk-cell-label">{m.label}</span>
            <b>{m.val}</b>
          </div>
        ))}
      </div>
    </div>
  )
}
