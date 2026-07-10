import { useEffect, useRef, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import { listGroups, listPeople } from '../../spine/data/peopleLoad'
import { createGroup, renameGroup, deleteGroup, addGroupMember, removeGroupMember } from '../../spine/data/peopleWrite'

// ManageGroups — the Groups section of the manage screen (D9).
// Create, rename, delete groups + add/remove members via a person picker.

export default function ManageGroups({ onChanged }) {
  const [groups, setGroups] = useState([])
  const [allPeople, setAllPeople] = useState([])
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const addRef = useRef(null)

  async function load() {
    const [g, p] = await Promise.all([listGroups(), listPeople()])
    setGroups(g)
    setAllPeople(p)
  }
  useEffect(() => { load() }, [])

  async function handleCreate() {
    const n = addName.trim()
    if (!n || busy) return
    setBusy(true)
    try { await createGroup(n); await load(); setAddName(''); setAdding(false); onChanged() }
    catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function handleRename(id) {
    const n = editName.trim()
    if (!n || busy) return
    setBusy(true)
    try { await renameGroup(id, n); await load(); setEditId(null); onChanged() }
    catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete group "${name}"?`)) return
    setBusy(true)
    try { await deleteGroup(id); await load(); if (expandedId === id) setExpandedId(null); onChanged() }
    catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function handleAddMember(groupId, personId) {
    try { await addGroupMember(groupId, personId); await load(); onChanged() }
    catch (e) { console.error(e) }
  }

  async function handleRemoveMember(groupId, personId) {
    try { await removeGroupMember(groupId, personId); await load(); onChanged() }
    catch (e) { console.error(e) }
  }

  return (
    <div className="pmanage-section">
      <SmallCapsLabel>Groups</SmallCapsLabel>
      <HairlineRule faint />

      <div className="pmanage-list">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="pmanage-row">
              {editId === g.id ? (
                <input className="pmanage-edit-input" value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(g.id); if (e.key === 'Escape') setEditId(null) }}
                  onBlur={() => { if (editName.trim()) handleRename(g.id); else setEditId(null) }}
                  autoFocus disabled={busy} />
              ) : (
                <span className="pmanage-name" onClick={() => { setEditId(g.id); setEditName(g.name) }}>{g.name}</span>
              )}
              <span className="pmanage-actions">
                <button className="pmanage-btn" onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}>
                  {expandedId === g.id ? '▾' : '▸'} {g.members.length}
                </button>
                <button className="pmanage-btn pmanage-del" onClick={() => handleDelete(g.id, g.name)}>×</button>
              </span>
            </div>
            {expandedId === g.id && (
              <div className="pmanage-members">
                {g.members.map((m) => (
                  <div className="pmanage-member" key={m.id}>
                    <span>{m.name}</span>
                    <button className="pmanage-btn pmanage-del" onClick={() => handleRemoveMember(g.id, m.id)}>×</button>
                  </div>
                ))}
                <select className="pmanage-picker" value="" onChange={(e) => { if (e.target.value) handleAddMember(g.id, e.target.value) }}>
                  <option value="">Add a person…</option>
                  {allPeople.filter((p) => !g.members.some((m) => m.id === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="pmanage-add-row">
          <input ref={addRef} className="pmanage-edit-input" value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false) }}
            onBlur={() => { if (!addName.trim()) setAdding(false) }}
            placeholder="Group name" autoFocus disabled={busy} />
        </div>
      ) : (
        <button className="pdir-add-btn" onClick={() => { setAdding(true); setTimeout(() => addRef.current?.focus(), 0) }}>+ Add group</button>
      )}
    </div>
  )
}
