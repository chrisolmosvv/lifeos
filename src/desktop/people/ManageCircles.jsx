import { useRef, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import { createCircle, renameCircle, reorderCircles, deleteCircle } from '../../spine/data/peopleWrite'
import './manage.css'

// ManageCircles — the Circles section of the manage screen (D8 Commit 1).
// Create, rename, reorder (up/down), delete circles. Inline, no modals.
// Groups section placeholder slots below (built in D9).

export default function ManageCircles({ circles, onBack, onChanged }) {
  const [items, setItems] = useState(circles)
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const addRef = useRef(null)

  async function handleCreate() {
    const n = addName.trim()
    if (!n || busy) return
    setBusy(true)
    try {
      const c = await createCircle(n)
      setItems((prev) => [...prev, c])
      setAddName('')
      setAdding(false)
      onChanged()
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function handleRename(id) {
    const n = editName.trim()
    if (!n || busy) return
    setBusy(true)
    try {
      await renameCircle(id, n)
      setItems((prev) => prev.map((c) => c.id === id ? { ...c, name: n } : c))
      setEditId(null)
      onChanged()
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function handleMove(idx, dir) {
    const next = idx + dir
    if (next < 0 || next >= items.length) return
    const reordered = [...items]
    ;[reordered[idx], reordered[next]] = [reordered[next], reordered[idx]]
    setItems(reordered)
    try { await reorderCircles(reordered.map((c) => c.id)); onChanged() } catch (e) { console.error(e) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? Its people will move to Unfiled.`)) return
    setBusy(true)
    try {
      await deleteCircle(id)
      setItems((prev) => prev.filter((c) => c.id !== id))
      onChanged()
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  return (
    <div className="pmanage">
      <button className="pfile-back" onClick={onBack}>‹ Rolodex</button>

      <div className="pmanage-section">
        <SmallCapsLabel>Circles</SmallCapsLabel>
        <HairlineRule faint />

        <div className="pmanage-list">
          {items.map((c, i) => (
            <div className="pmanage-row" key={c.id}>
              {editId === c.id ? (
                <input className="pmanage-edit-input" value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setEditId(null) }}
                  onBlur={() => { if (editName.trim()) handleRename(c.id); else setEditId(null) }}
                  autoFocus disabled={busy} />
              ) : (
                <span className="pmanage-name" onClick={() => { setEditId(c.id); setEditName(c.name) }}>{c.name}</span>
              )}
              <span className="pmanage-actions">
                <button className="pmanage-btn" onClick={() => handleMove(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button className="pmanage-btn" onClick={() => handleMove(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
                <button className="pmanage-btn pmanage-del" onClick={() => handleDelete(c.id, c.name)} aria-label="Delete">×</button>
              </span>
            </div>
          ))}
        </div>

        {adding ? (
          <div className="pmanage-add-row">
            <input ref={addRef} className="pmanage-edit-input" value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false) }}
              onBlur={() => { if (!addName.trim()) setAdding(false) }}
              placeholder="Circle name" autoFocus disabled={busy} />
          </div>
        ) : (
          <button className="pdir-add-btn" onClick={() => { setAdding(true); setTimeout(() => addRef.current?.focus(), 0) }}>+ Add circle</button>
        )}
      </div>

      {/* Groups section placeholder — built in D9 */}
      <div className="pmanage-section">
        <SmallCapsLabel>Groups</SmallCapsLabel>
        <HairlineRule faint />
        <p className="people-loading">Coming soon.</p>
      </div>
    </div>
  )
}
