import SmallCapsLabel from './SmallCapsLabel'
import { formatVolume, formatCount, formatDuration } from '../gym/gymFormat'
import './formGuide.css'

// BoxScoreBand — the rolling-7-day lead strip: Volume · Sessions · Time · New PRs.
// A sealed gym-kit block: it ONLY displays the calc layer's box-score output
// (gymCalc.boxScore) — no fetching, no maths here. Big hero numerals in Fraunces
// (the documented Health/Gym data-page exception); labels small-caps Inter; units
// small Inter beside the figure. Honest zero state if nothing was logged this week.
export default function BoxScoreBand({ box }) {
  if (!box || box.sessions === 0) {
    return (
      <p className="fg-band-empty">
        No sessions in the last 7 days — the week’s still open.
      </p>
    )
  }

  const stats = [
    { label: 'Volume', ...formatVolume(box.volume) },
    { label: 'Sessions', ...formatCount(box.sessions) },
    { label: 'Time', ...formatDuration(box.timeMinutes) },
    { label: 'New PRs', ...formatCount(box.newPRs) },
  ]

  return (
    <div className="fg-band">
      {stats.map((s) => (
        <div className="fg-stat" key={s.label}>
          <div className="fg-stat-fig">
            <span className="fg-stat-num">{s.num}</span>
            {s.unit && <span className="fg-stat-unit">{s.unit}</span>}
          </div>
          <SmallCapsLabel>{s.label}</SmallCapsLabel>
        </div>
      ))}
    </div>
  )
}
