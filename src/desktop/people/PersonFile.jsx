import { useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import PersonEdit from './PersonEdit'
import { loadPersonFile } from '../../spine/data/peopleLoad'
import './personFile.css'

// PersonFile — the full person dossier (D6/D7a). Two-column layout with an Edit
// toggle that makes the left-column scalar fields editable in place. Every section
// with no data is omitted (honest omission). Archive arrives in D7b.

const CHANNEL_LABEL = {
  in_person: 'In person', call: 'Call', video: 'Video',
  message: 'Message', letter: 'Letter', other: 'Other',
}

function age(dateStr) {
  const [y] = dateStr.split('-').map(Number)
  const now = new Date()
  let a = now.getFullYear() - y
  const bday = new Date(now.getFullYear(), ...dateStr.split('-').slice(1).map((v, i) => Number(v) - (i === 0 ? 1 : 0)))
  if (now < bday) a--
  return a
}

function formatDate(d) {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDateNoYear(d) {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

export default function PersonFile({ personId, onBack, startEditing }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(!!startEditing)

  function load() {
    let cancelled = false
    setLoading(true)
    loadPersonFile(personId)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch((e) => { console.error('PersonFile load:', e); if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }

  useEffect(load, [personId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="pfile"><p className="people-loading">Loading…</p></div>
  if (!data) return null
  const { person, homeCircle, allCircles, connections, groups, catchups, dates, lastContact } = data
  const otherCircles = allCircles.filter((c) => !c.isHome)
  const birthday = dates.find((d) => d.kind === 'birthday')
  const customDates = dates.filter((d) => d.kind === 'custom')

  const homeName = homeCircle?.name || 'Unfiled'

  return (
    <div className="pfile">
      <div className="pfile-topbar">
        <button className="pfile-back" onClick={onBack}>‹ Rolodex</button>
        {!editing && (
          <button className="pfile-edit-btn" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      <div className="pfile-cols">
        {/* LEFT — scalar fields: view or edit */}
        <div className="pfile-left">
          {editing ? (
            <PersonEdit
              person={person}
              homeCircleName={homeName}
              onSaved={() => { setEditing(false); load() }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <SmallCapsLabel>{homeName}</SmallCapsLabel>
              <h1 className="pfile-name">{person.name}</h1>
              {person.how_you_know && <p className="pfile-hyk">{person.how_you_know}</p>}
              <HairlineRule />

              {otherCircles.length > 0 && (
                <div className="pfile-section">
                  <SmallCapsLabel>Also in</SmallCapsLabel>
                  <p className="pfile-meta">{otherCircles.map((c) => c.name).join(', ')}</p>
                </div>
              )}

              {person.notes && (
                <div className="pfile-section">
                  <SmallCapsLabel>Notes</SmallCapsLabel>
                  <p className="pfile-notes">{person.notes}</p>
                </div>
              )}

              {(person.phone || person.email || person.other_contact) && (
                <div className="pfile-section">
                  <SmallCapsLabel>Contact</SmallCapsLabel>
                  {person.phone && <p className="pfile-meta"><a href={'tel:' + person.phone}>{person.phone}</a></p>}
                  {person.email && <p className="pfile-meta"><a href={'mailto:' + person.email}>{person.email}</a></p>}
                  {person.other_contact && <p className="pfile-meta">{person.other_contact}</p>}
                </div>
              )}

              {(birthday || customDates.length > 0) && (
                <div className="pfile-section">
                  <SmallCapsLabel>Key dates</SmallCapsLabel>
                  {birthday && (
                    <p className="pfile-meta">
                      Birthday: {birthday.year_known ? formatDate(birthday.date_value) : formatDateNoYear(birthday.date_value)}
                      {birthday.year_known && <span className="pfile-age"> (age {age(birthday.date_value)})</span>}
                    </p>
                  )}
                  {customDates.map((d) => (
                    <p className="pfile-meta" key={d.id}>
                      {d.label || 'Date'}: {d.year_known ? formatDate(d.date_value) : formatDateNoYear(d.date_value)}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT — ties & history */}
        <div className="pfile-right">
          {connections.length > 0 && (
            <div className="pfile-section">
              <SmallCapsLabel>Connections</SmallCapsLabel>
              <ul className="pfile-list">
                {connections.map((c) => (
                  <li key={c.id} className="pfile-conn-row">
                    <span>{c.name}</span>
                    {c.label && <span className="pfile-conn-label">{c.label}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {groups.length > 0 && (
            <div className="pfile-section">
              <SmallCapsLabel>Groups</SmallCapsLabel>
              {groups.map((g) => (
                <div key={g.id} className="pfile-group">
                  <p className="pfile-group-name">{g.name}</p>
                  {g.coMembers.length > 0 && <p className="pfile-meta">{g.coMembers.join(', ')}</p>}
                </div>
              ))}
            </div>
          )}

          {catchups.length > 0 && (
            <div className="pfile-section">
              <SmallCapsLabel>Catch-up history</SmallCapsLabel>
              <ul className="pfile-list">
                {catchups.map((cu) => (
                  <li key={cu.id} className="pfile-catchup-row">
                    <span className="tnum">{cu.interaction_date}</span>
                    <span className="pfile-chan">{CHANNEL_LABEL[cu.channel] || cu.channel}</span>
                    {cu.note && <span className="pfile-cu-note">{cu.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lastContact && (
            <div className="pfile-section">
              <SmallCapsLabel>Last contact</SmallCapsLabel>
              <p className="pfile-meta tnum">{formatDate(lastContact)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
