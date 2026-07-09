import { humanDayShort } from '../../spine/logic/gymDates'

// WalkingDaysTable — the BR "more ›" terminal drill: one row per day in the window
// (to-yesterday), joined across the six activity metrics. No deeper drill (walking
// day-detail is deferred). Pace shown raw as km/h (the gate). Reads the per-day values
// straight off metricView.rolling[days].values — no new calc.
const whole = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString('en-GB') : '—')
const dec1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—')
const METRICS = ['steps', 'flights_climbed', 'stand_minutes', 'walking_speed', 'walking_heart_rate_avg', 'walking_step_length']

export default function WalkingDaysTable({ activity, days, onBack }) {
  const byDay = new Map()
  for (const m of METRICS) {
    for (const p of activity?.[m]?.rolling?.[days]?.values || []) {
      if (!byDay.has(p.ymd)) byDay.set(p.ymd, { ymd: p.ymd })
      byDay.get(p.ymd)[m] = p.value
    }
  }
  const rows = [...byDay.values()].sort((a, b) => (a.ymd < b.ymd ? 1 : -1)) // newest first

  return (
    <div className="walkdays">
      <button type="button" className="walkdays-back" onClick={onBack}>← Gym</button>
      <h2 className="walkdays-title">Walking — every day</h2>
      {rows.length === 0 ? (
        <p className="gym-ph">No walking data in this window yet.</p>
      ) : (
        <table className="walkdays-table tnum">
          <thead>
            <tr>
              <th>Day</th><th>Steps</th><th>Flights</th><th>Stand</th><th>Pace</th><th>Walk HR</th><th>Stride</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ymd}>
                <td>{humanDayShort(r.ymd)}</td>
                <td>{whole(r.steps)}</td>
                <td>{whole(r.flights_climbed)}</td>
                <td>{whole(r.stand_minutes)}m</td>
                <td>{dec1(r.walking_speed)} km/h</td>
                <td>{whole(r.walking_heart_rate_avg)}</td>
                <td>{whole(r.walking_step_length)}cm</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
