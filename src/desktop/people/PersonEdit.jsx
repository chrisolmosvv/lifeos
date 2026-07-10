import { useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import { updatePerson } from '../../spine/data/peopleWrite'
import './personEdit.css'

// PersonEdit — the in-place edit form for a person's scalar fields (D7a).
// Renders in the left column of the file page when the Edit toggle is active.
// Save writes via updatePerson; Cancel discards. Only scalar fields — circles,
// connections, dates, catch-ups stay read-only until their own pieces.

export default function PersonEdit({ person, homeCircleName, onSaved, onCancel }) {
  const [name, setName] = useState(person.name)
  const [hyk, setHyk] = useState(person.how_you_know || '')
  const [notes, setNotes] = useState(person.notes || '')
  const [phone, setPhone] = useState(person.phone || '')
  const [email, setEmail] = useState(person.email || '')
  const [other, setOther] = useState(person.other_contact || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    const n = name.trim()
    if (!n) { setErr('A name is required.'); return }
    setBusy(true)
    try {
      await updatePerson(person.id, {
        name: n,
        how_you_know: hyk.trim() || null,
        notes: notes.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        other_contact: other.trim() || null,
      })
      onSaved()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pedit">
      <SmallCapsLabel>{homeCircleName || 'Unfiled'}</SmallCapsLabel>

      <div className="pedit-field">
        <input className="pedit-name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Name" aria-label="Name" autoFocus />
      </div>

      <div className="pedit-field">
        <input className="pedit-input" value={hyk} onChange={(e) => setHyk(e.target.value)}
          placeholder="How you know them" aria-label="How you know them" />
      </div>

      <HairlineRule />

      <div className="pedit-field">
        <SmallCapsLabel>Notes</SmallCapsLabel>
        <textarea className="pedit-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you want to remember…" rows={5} />
      </div>

      <div className="pedit-field">
        <SmallCapsLabel>Contact</SmallCapsLabel>
        <input className="pedit-input" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone" aria-label="Phone" type="tel" />
        <input className="pedit-input" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" aria-label="Email" type="email" />
        <input className="pedit-input" value={other} onChange={(e) => setOther(e.target.value)}
          placeholder="Other contact" aria-label="Other contact" />
      </div>

      {err && <p className="pedit-err">{err}</p>}

      <div className="pedit-actions">
        <button className="pedit-cancel" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="pedit-save" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}
