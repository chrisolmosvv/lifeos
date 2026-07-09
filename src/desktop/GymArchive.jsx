import { useMemo, useState } from 'react'
import { archiveMonths, archiveTotals, matchWorkoutIds } from './gym/gymArchive'
import { humanDayShort } from '../spine/logic/gymDates'
import { formatVolume, formatDuration } from './gym/gymFormat'
import './kit/formGuide.css'
import './kit/gymArchive.css'

// GymArchive — the full workout history (a drill-in within Health, not a nav item).
// Display only: groups the recent-session rows (gymSessions) by Amsterdam month with
// subtotals + an all-time line, and an exercise-name search. Rows reuse the recent-
// sessions row look (.fg-rs-*) and tap into the G12 SessionReport (onOpen) — reused
// as-is. `rows` = recentSessions(built); `workouts` = built (for exercise search).
export default function GymArchive({ rows, workouts, onOpen, onBack }) {
  const [query, setQuery] = useState('')

  const matchedIds = useMemo(() => matchWorkoutIds(workouts, query), [workouts, query])
  const shown = useMemo(
    () => (matchedIds ? rows.filter((r) => matchedIds.has(r.id)) : rows),
    [rows, matchedIds],
  )
  const months = useMemo(() => archiveMonths(shown), [shown])
  const allTime = useMemo(() => archiveTotals(rows), [rows]) // head line stays full-history

  const vol = formatVolume(allTime.volume)
  const time = formatDuration(allTime.minutes)

  return (
    <div className="ga">
      <button className="sr-back" onClick={onBack}>← The Form Guide</button>

      <header className="ga-head">
        <h2 className="ga-title">The archive</h2>
        <div className="ga-totals tnum">
          <span><b>{allTime.sessions}</b> sessions</span>
          <span><b>{vol.num}</b> kg all-time</span>
          <span><b>{time.num}</b>{time.unit ? ` ${time.unit}` : ''}</span>
        </div>
      </header>

      <input
        className="ga-search"
        type="search"
        placeholder="Search an exercise — e.g. squat, bench…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {matchedIds && (
        <p className="ga-filter-note">
          Showing {shown.length} session{shown.length === 1 ? '' : 's'} with “{query.trim()}”.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="fg-band-empty">No sessions match that search.</p>
      ) : (
        months.map((m) => {
          const mv = formatVolume(m.volume)
          const mt = formatDuration(m.minutes)
          return (
            <section className="ga-month" key={m.key}>
              <div className="ga-month-head">
                <span className="ga-month-name">{m.label}</span>
                <span className="ga-month-sub tnum">
                  {m.sessions} · {mv.num} kg · {mt.num}{mt.unit ? ` ${mt.unit}` : ''}
                </span>
              </div>
              {m.rows.map((r) => {
                const rv = formatVolume(r.volume)
                const rt = formatDuration(r.minutes)
                return (
                  <button className="fg-rs-row" key={r.id} onClick={() => onOpen?.(r.id)}>
                    <span className="fg-rs-date tnum">{r.dateYMD ? humanDayShort(r.dateYMD) : '—'}</span>
                    <span className="fg-rs-title">{r.title || 'Workout'}</span>
                    <span className="fg-rs-num tnum">{rv.num} {rv.unit}</span>
                    <span className="fg-rs-num tnum">{rt.num}{rt.unit ? ` ${rt.unit}` : ''}</span>
                    <span className="fg-rs-pr">
                      {r.isPR && <span className="fg-rs-dot" title="a new PR was set this session">PR</span>}
                    </span>
                  </button>
                )
              })}
            </section>
          )
        })
      )}
    </div>
  )
}
