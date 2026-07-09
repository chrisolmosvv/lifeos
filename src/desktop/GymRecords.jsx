import { useEffect, useMemo, useState } from 'react'
import ClimbChart from './kit/ClimbChart'
import { liftRecords } from './gym/gymRecords'
import { loadPins, pinLift, unpinLift } from './gym/gymPins'
import { humanDayShort } from '../spine/logic/gymDates'
import { prettyMuscle } from './gym/gymFormat'
import './kit/formGuide.css'
import './kit/gymRecords.css'

// GymRecords — per-lift records + pinned favourites (a drill-in within Health, not
// a nav item). Reads the calc layer (liftRecords); WRITES pins to gym_pins via
// gymPins (the app's {error} pattern) with an optimistic toggle that reverts on
// failure. Order: pinned first → most-trained → alphabetical. A pinned/expanded
// lift shows its top-set climb chart (reused SVG approach).

const fmtW = (w) => (w == null ? '—' : w % 1 === 0 ? String(w) : w.toFixed(1))

export default function GymRecords({ workouts, onBack }) {
  const [pins, setPins] = useState(null) // Set of template ids; null = loading
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(new Set())

  useEffect(() => {
    let alive = true
    loadPins().then((r) => {
      if (!alive) return
      if (r.error) setError('Couldn’t load your pins.')
      else setPins(new Set(r.ids))
    })
    return () => {
      alive = false
    }
  }, [])

  const records = useMemo(() => liftRecords(workouts), [workouts])
  const pinned = pins || new Set()

  const ordered = useMemo(() => {
    return records.slice().sort((a, b) => {
      const pa = pinned.has(a.key) ? 0 : 1
      const pb = pinned.has(b.key) ? 0 : 1
      if (pa !== pb) return pa - pb
      if (b.sessions !== a.sessions) return b.sessions - a.sessions
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [records, pins]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(key) {
    if (!pins) return
    const isPinned = pinned.has(key)
    const next = new Set(pinned)
    isPinned ? next.delete(key) : next.add(key)
    setPins(next)
    setError('')
    const r = isPinned ? await unpinLift(key) : await pinLift(key)
    if (r.error) {
      const back = new Set(next)
      isPinned ? back.add(key) : back.delete(key)
      setPins(back)
      setError(isPinned ? 'Couldn’t unpin — try again.' : 'Couldn’t pin — try again.')
    }
  }

  const toggleExpand = (key) =>
    setExpanded((s) => {
      const n = new Set(s)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })

  return (
    <div className="gr">
      <button className="sr-back" onClick={onBack}>← The Form Guide</button>
      <header className="gr-head"><h2 className="gr-title">Records</h2></header>
      {error && <p className="gr-error">{error}</p>}

      {pins === null ? (
        <p className="fg-note">Loading your records…</p>
      ) : records.length === 0 ? (
        <p className="fg-band-empty">No lifts on record yet.</p>
      ) : (
        <>
          {pinned.size === 0 && <p className="gr-hint">Pin a lift (☆) to feature it at the top.</p>}
          <div className="gr-list">
            {ordered.map((rec) => {
              const isPinned = pinned.has(rec.key)
              const showChart = isPinned || expanded.has(rec.key)
              const climb = rec.climb.filter((p) => p.top != null && p.ymd).map((p) => ({ ymd: p.ymd, value: p.top }))
              return (
                <div className={`gr-row${isPinned ? ' is-pinned' : ''}`} key={rec.key}>
                  <div className="gr-main">
                    <button className="gr-pin" onClick={() => toggle(rec.key)} aria-pressed={isPinned} title={isPinned ? 'Unpin' : 'Pin'}>
                      {isPinned ? '★' : '☆'}
                    </button>
                    <button className="gr-id" onClick={() => toggleExpand(rec.key)}>
                      <span className="gr-name">{rec.name}</span>
                      <span className="gr-muscle">{prettyMuscle(rec.muscle)}</span>
                    </button>
                    <span className="gr-pr tnum">
                      {rec.prWeight != null ? (
                        <>
                          {fmtW(rec.prWeight)} kg{rec.prReps ? ` × ${rec.prReps}` : ''}
                          {rec.prDate && <span className="gr-prdate">{humanDayShort(rec.prDate)}</span>}
                        </>
                      ) : (
                        <span className="gr-bw">bodyweight</span>
                      )}
                    </span>
                  </div>
                  {showChart && (climb.length ? <ClimbChart points={climb} /> : <p className="gr-nochart">Not enough weighted sets to chart.</p>)}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
