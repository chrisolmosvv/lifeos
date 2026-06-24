import { useState } from 'react'
import { formatVolume, formatDuration } from '../gym/gymFormat'
import { humanDayShort } from '../gym/gymDates'
import './formGuide.css'

// RecentSessions — front-page zone 5. A calm broadsheet table of recent workouts,
// most recent first: date (Amsterdam) · title · volume · time · a quiet "PR" dot on
// sessions that set a new working-set PR. Sealed gym-kit block: it ONLY displays
// the calc layer's rows (gymSessions.recentSessions) — no fetching, no maths.
// Rows are static for now; opening a full session report is G12.

const INITIAL = 10

export default function RecentSessions({ rows }) {
  const [showAll, setShowAll] = useState(false)
  if (!rows || rows.length === 0) {
    return <p className="fg-band-empty">No sessions on record yet.</p>
  }

  const shown = showAll ? rows : rows.slice(0, INITIAL)

  return (
    <div className="fg-rs">
      <div className="fg-rs-head">
        <span className="fg-rs-date">Date</span>
        <span className="fg-rs-title">Session</span>
        <span className="fg-rs-num">Volume</span>
        <span className="fg-rs-num">Time</span>
        <span className="fg-rs-pr" />
      </div>

      {shown.map((r) => {
        const vol = formatVolume(r.volume)
        const t = formatDuration(r.minutes)
        return (
          <div className="fg-rs-row" key={r.id}>
            <span className="fg-rs-date tnum">{r.dateYMD ? humanDayShort(r.dateYMD) : '—'}</span>
            <span className="fg-rs-title">{r.title || 'Workout'}</span>
            <span className="fg-rs-num tnum">{vol.num} {vol.unit}</span>
            <span className="fg-rs-num tnum">{t.num}{t.unit ? ` ${t.unit}` : ''}</span>
            <span className="fg-rs-pr">
              {r.isPR && <span className="fg-rs-dot" title="a new PR was set this session">PR</span>}
            </span>
          </div>
        )
      })}

      {rows.length > INITIAL && !showAll && (
        <button className="fg-rs-more" onClick={() => setShowAll(true)}>
          Show all {rows.length}
        </button>
      )}
    </div>
  )
}
