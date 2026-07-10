import { useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import { loadPersonSummary } from '../../spine/data/peopleLoad'
import './focusPanel.css'

// FocusPanel — the Rolodex right pane (D5). Shows the selected person's glance:
// home circle kicker, name, how-you-know, a notes snippet, connections (if any),
// and the last 2–3 catch-ups (if any). Sections with no data are omitted entirely
// (honest omission — not "no notes" placeholders). "Open full file →" arrives in D6.

const CHANNEL_LABEL = {
  in_person: 'In person',
  call: 'Call',
  video: 'Video',
  message: 'Message',
  letter: 'Letter',
  other: 'Other',
}

export default function FocusPanel({ personId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadPersonSummary(personId)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch((e) => { console.error('FocusPanel load:', e); if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [personId])

  if (loading) return <p className="people-loading">Loading…</p>
  if (!data) return null
  const { person, homeCircleName, connections, catchups } = data

  // Notes snippet — first ~120 chars, trailing at a word boundary
  const snippet = person.notes
    ? (person.notes.length <= 120 ? person.notes : person.notes.slice(0, 120).replace(/\s+\S*$/, '') + '…')
    : null

  return (
    <div className="pfocus">
      {/* Kicker + name + how-you-know */}
      <SmallCapsLabel>{homeCircleName || 'Unfiled'}</SmallCapsLabel>
      <h2 className="pfocus-name">{person.name}</h2>
      {person.how_you_know && <p className="pfocus-hyk">{person.how_you_know}</p>}
      <HairlineRule faint />

      {/* Notes snippet */}
      {snippet && (
        <div className="pfocus-section">
          <p className="pfocus-notes">{snippet}</p>
        </div>
      )}

      {/* Connections */}
      {connections.length > 0 && (
        <div className="pfocus-section">
          <SmallCapsLabel>Connections</SmallCapsLabel>
          <ul className="pfocus-conn-list">
            {connections.map((c) => (
              <li key={c.id} className="pfocus-conn-row">
                <span className="pfocus-conn-name">{c.name}</span>
                {c.label && <span className="pfocus-conn-label">{c.label}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last 2–3 catch-ups */}
      {catchups.length > 0 && (
        <div className="pfocus-section">
          <SmallCapsLabel>Recent catch-ups</SmallCapsLabel>
          <ul className="pfocus-catchup-list">
            {catchups.map((cu) => (
              <li key={cu.id} className="pfocus-catchup-row">
                <span className="pfocus-catchup-date tnum">{cu.interaction_date}</span>
                <span className="pfocus-catchup-chan">{CHANNEL_LABEL[cu.channel] || cu.channel}</span>
                {cu.note && <span className="pfocus-catchup-note">{cu.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
