import { useEffect, useState } from 'react'
import { formatMastheadDate, formatClock } from '../dateUtils'
import './kit.css'

// Folio — the line under the nameplate: today's date · a motto · a live ticking
// clock · the edition number. A sealed kit block, DISPLAY-ONLY: the clock reads
// the device clock (new Date()) and nothing else — it never touches app data.
// `motto` and `edition` are placeholder copy passed by the caller.
export default function Folio({ motto, edition }) {
  const [now, setNow] = useState(() => new Date())

  // Tick once a second so the clock is genuinely live. Device clock only.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="kit-folio">
      <span className="kit-folio-date">{formatMastheadDate(now)}</span>
      {motto && <span className="kit-folio-motto">{motto}</span>}
      <span className="kit-folio-meta">
        <span className="kit-folio-time tnum">{formatClock(now)}</span>
        {edition && (
          <>
            <span className="kit-folio-sep">·</span>
            <span className="kit-folio-edition">{edition}</span>
          </>
        )}
      </span>
    </div>
  )
}
