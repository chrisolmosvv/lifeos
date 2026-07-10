import { useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import { addConnection, removeConnection } from '../../spine/data/peopleWrite'

// ConnectionEditor — add/remove connections on the file's right column (D10).
// Presets include symmetric + directional pairs. Custom free text is symmetric.

const PRESETS = [
  { value: '', label: '(no label)' },
  { value: 'partner', label: 'Partner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'housemate', label: 'Housemate' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'ex', label: 'Ex' },
  { value: 'neighbour', label: 'Neighbour' },
  { value: 'parent', label: 'Parent (they show as your child)' },
  { value: 'child', label: 'Child (they show as your parent)' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'mentor', label: 'Mentor (they show as your mentee)' },
  { value: 'mentee', label: 'Mentee (they show as your mentor)' },
  { value: 'aunt/uncle', label: 'Aunt/Uncle' },
  { value: 'niece/nephew', label: 'Niece/Nephew' },
  { value: '__custom', label: 'Custom…' },
]

export default function ConnectionEditor({ personId, connections, allPeople, onChanged }) {
  const [addingPersonId, setAddingPersonId] = useState('')
  const [labelChoice, setLabelChoice] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [busy, setBusy] = useState(false)

  const connectedIds = new Set(connections.map((c) => c.personId))

  async function handleAdd() {
    if (!addingPersonId || busy) return
    const label = labelChoice === '__custom' ? customLabel.trim() : labelChoice
    setBusy(true)
    try {
      await addConnection(personId, addingPersonId, label || null)
      setAddingPersonId('')
      setLabelChoice('')
      setCustomLabel('')
      onChanged()
    } catch (e) { console.error('Add connection:', e) }
    finally { setBusy(false) }
  }

  async function handleRemove(connId) {
    try { await removeConnection(connId); onChanged() }
    catch (e) { console.error('Remove connection:', e) }
  }

  return (
    <div className="pconn-editor">
      <SmallCapsLabel>Connections</SmallCapsLabel>

      {/* Current connections with remove */}
      {connections.length > 0 && (
        <ul className="pfile-list">
          {connections.map((c) => (
            <li key={c.id} className="pfile-conn-row">
              <span>{c.name}</span>
              {c.label && <span className="pfile-conn-label">{c.label}</span>}
              <button className="pmanage-btn pmanage-del" onClick={() => handleRemove(c.id)}>×</button>
            </li>
          ))}
        </ul>
      )}

      {/* Add a connection */}
      <div className="pconn-add">
        <select className="pmanage-picker" value={addingPersonId} onChange={(e) => setAddingPersonId(e.target.value)}>
          <option value="">Add a connection…</option>
          {allPeople.filter((p) => p.id !== personId && !connectedIds.has(p.id)).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {addingPersonId && (
          <>
            <select className="pmanage-picker" value={labelChoice} onChange={(e) => setLabelChoice(e.target.value)}>
              {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {labelChoice === '__custom' && (
              <input className="pmanage-edit-input" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Custom label" />
            )}
            <button className="pedit-save" onClick={handleAdd} disabled={busy} style={{ marginTop: '0.35rem' }}>
              {busy ? 'Adding…' : 'Add'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
