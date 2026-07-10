import { useRef, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'

// Directory — the Rolodex left pane (D4/D5). Shows people grouped by home circle
// (Unfiled last), with live search, the "+ Add" terracotta quick-add, and
// click-to-select (D5). `selectedId` / `onSelect` drive the focus panel.

export default function Directory({ people, circles, onCreated, onCreatedWithDetails, selectedId, onSelect }) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  // Live filter over name + how_you_know
  const q = query.trim().toLowerCase()
  const filtered = q
    ? people.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.how_you_know && p.how_you_know.toLowerCase().includes(q)))
    : people

  // Group by home circle — circles in custom order, Unfiled last
  const circleMap = new Map(circles.map((c) => [c.id, c.name]))
  const groups = new Map() // circle_id | '__unfiled' → person[]
  for (const p of filtered) {
    const key = p.home_circle_id || '__unfiled'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }

  // Sort within each group: most-recent-contact first; no contact → name A–Z at the end
  for (const list of groups.values()) {
    list.sort((a, b) => {
      if (a.last_contact && b.last_contact) return b.last_contact.localeCompare(a.last_contact)
      if (a.last_contact && !b.last_contact) return -1
      if (!a.last_contact && b.last_contact) return 1
      return a.name.localeCompare(b.name)
    })
  }

  // Build ordered group keys: circles in sort_order, then Unfiled
  const orderedKeys = []
  for (const c of circles) {
    if (groups.has(c.id)) orderedKeys.push(c.id)
  }
  if (groups.has('__unfiled')) orderedKeys.push('__unfiled')

  // Quick-add
  async function handleAdd() {
    const name = addName.trim()
    if (!name || busy) return
    setBusy(true)
    try {
      await onCreated(name)
      setAddName('')
      setAdding(false)
    } catch (e) {
      console.error('Add person failed:', e)
    } finally {
      setBusy(false)
    }
  }

  function startAdd() {
    setAdding(true)
    setAddName('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function cancelAdd() {
    setAdding(false)
    setAddName('')
  }

  // Format the last-contact date as a quiet relative string
  function lastContactLabel(dateStr) {
    if (!dateStr) return 'not yet'
    const d = new Date(dateStr + 'T12:00:00') // noon to avoid DST shift
    const now = new Date()
    const days = Math.floor((now - d) / 86400000)
    if (days <= 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }

  return (
    <div className="pdir">
      {/* Search */}
      <input
        className="pdir-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        aria-label="Search the directory"
      />

      {/* "+ Add" */}
      {adding ? (
        <div className="pdir-add-row">
          <input
            ref={inputRef}
            className="pdir-add-input"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
              if (e.key === 'Escape') cancelAdd()
            }}
            onBlur={() => { if (!addName.trim()) setTimeout(cancelAdd, 150) }}
            placeholder="Name"
            disabled={busy}
          />
          {addName.trim() && onCreatedWithDetails && (
            <button className="pdir-add-details" onClick={async () => { const n = addName.trim(); if (n && !busy) { setBusy(true); try { await onCreatedWithDetails(n); setAddName(''); setAdding(false) } catch (e) { console.error(e) } finally { setBusy(false) } } }}>
              with details →
            </button>
          )}
        </div>
      ) : (
        <button className="pdir-add-btn" onClick={startAdd}>+ Add</button>
      )}

      {/* Grouped list */}
      <div className="pdir-list">
        {orderedKeys.map((key) => (
          <div className="pdir-group" key={key}>
            <div className="pdir-group-label">
              <SmallCapsLabel>{key === '__unfiled' ? 'Unfiled' : circleMap.get(key)}</SmallCapsLabel>
            </div>
            {groups.get(key).map((p) => (
              <button
                type="button"
                className={'pdir-row' + (selectedId === p.id ? ' is-selected' : '')}
                key={p.id}
                onClick={() => onSelect?.(p.id)}
              >
                <span className="pdir-name">{p.name}</span>
                <span className="pdir-last">{lastContactLabel(p.last_contact)}</span>
              </button>
            ))}
          </div>
        ))}
        {filtered.length === 0 && query && (
          <p className="pdir-no-match">No matches.</p>
        )}
      </div>
    </div>
  )
}
