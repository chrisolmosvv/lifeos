import { useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import { logInteraction, updateInteraction, deleteInteraction } from '../../spine/data/peopleWrite'

// CatchupLogger — log / edit / delete catch-ups on a person's file (D11).
// "Log a catch-up" defaults to today + in_person; expandable for channel/note/date.
// History renders reverse-chronological with edit/delete per row.

const CHANNELS = [
  { value: 'in_person', label: 'In person' },
  { value: 'call', label: 'Call' },
  { value: 'video', label: 'Video' },
  { value: 'message', label: 'Message' },
  { value: 'letter', label: 'Letter' },
  { value: 'other', label: 'Other' },
]
const CHAN_LABEL = Object.fromEntries(CHANNELS.map((c) => [c.value, c.label]))

const todayYMD = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function CatchupLogger({ personId, catchups, onChanged }) {
  const [expanded, setExpanded] = useState(false)
  const [channel, setChannel] = useState('in_person')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayYMD())
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editFields, setEditFields] = useState({})

  async function handleQuickLog() {
    setBusy(true)
    try { await logInteraction(personId, { date: todayYMD(), channel: 'in_person' }); onChanged() }
    catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function handleLog() {
    setBusy(true)
    try {
      await logInteraction(personId, { date, channel, note })
      setNote('')
      setDate(todayYMD())
      setChannel('in_person')
      setExpanded(false)
      onChanged()
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  function startEdit(cu) {
    setEditId(cu.id)
    setEditFields({ date: cu.interaction_date, channel: cu.channel, note: cu.note || '' })
  }

  async function saveEdit() {
    setBusy(true)
    try { await updateInteraction(editId, editFields); setEditId(null); onChanged() }
    catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function handleDelete(id) {
    try { await deleteInteraction(id); onChanged() }
    catch (e) { console.error(e) }
  }

  return (
    <div className="pcatch">
      <SmallCapsLabel>Catch-ups</SmallCapsLabel>

      {/* Quick log or expanded form */}
      <div className="pcatch-add">
        {expanded ? (
          <div className="pcatch-form">
            <input className="pedit-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <select className="pmanage-picker" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className="pedit-input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)" />
            <div className="pcatch-form-actions">
              <button className="pedit-cancel" onClick={() => setExpanded(false)} disabled={busy}>Cancel</button>
              <button className="pedit-save" onClick={handleLog} disabled={busy}>{busy ? 'Logging…' : 'Log'}</button>
            </div>
          </div>
        ) : (
          <div className="pcatch-quick">
            <button className="pcatch-quick-btn" onClick={handleQuickLog} disabled={busy}>Log today</button>
            <button className="pcatch-expand" onClick={() => setExpanded(true)}>with details</button>
          </div>
        )}
      </div>

      {/* History */}
      {catchups.length > 0 && (
        <ul className="pfile-list">
          {catchups.map((cu) => (
            <li key={cu.id} className="pfile-catchup-row">
              {editId === cu.id ? (
                <div className="pcatch-edit">
                  <input className="pedit-input" type="date" value={editFields.date} onChange={(e) => setEditFields({ ...editFields, date: e.target.value })} />
                  <select className="pmanage-picker" value={editFields.channel} onChange={(e) => setEditFields({ ...editFields, channel: e.target.value })}>
                    {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <input className="pedit-input" value={editFields.note} onChange={(e) => setEditFields({ ...editFields, note: e.target.value })} placeholder="Note" />
                  <span className="pcatch-edit-acts">
                    <button className="pmanage-btn" onClick={saveEdit}>✓</button>
                    <button className="pmanage-btn" onClick={() => setEditId(null)}>✕</button>
                  </span>
                </div>
              ) : (
                <>
                  <span className="tnum">{cu.interaction_date}</span>
                  <span className="pfile-chan">{CHAN_LABEL[cu.channel] || cu.channel}</span>
                  {cu.note && <span className="pfile-cu-note">{cu.note}</span>}
                  <span className="pcatch-row-acts">
                    <button className="pmanage-btn" onClick={() => startEdit(cu)}>✎</button>
                    <button className="pmanage-btn pmanage-del" onClick={() => handleDelete(cu.id)}>×</button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
