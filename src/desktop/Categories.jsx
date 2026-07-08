import { useEffect, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'
import { orderedTree, isInbox } from './categoryTree'
import { INBOX_COLOR } from './palette'
import CategoryRow from './CategoryRow'
import './categories.css'

// The category manager: list the owner's buckets as an indented tree and
// rename / nest / delete them. No colours yet (that's Piece 3b). RLS makes
// every query owner-only; the DB triggers enforce the Inbox/cycle/duplicate
// rules, so the UI just needs to be calm and surface any error plainly.
export default function Categories() {
  const [cats, setCats] = useState(null) // null = still loading
  const [name, setName] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, parent_id, sort_order, color')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      setError(friendly(error))
      setCats([])
      return
    }
    // Inbox carries Slate by default — set it once if it's still uncoloured.
    const inbox = data.find((c) => isInbox(c))
    if (inbox && !inbox.color) {
      await supabase
        .from('categories')
        .update({ color: INBOX_COLOR })
        .eq('id', inbox.id)
      inbox.color = INBOX_COLOR
    }
    setError('')
    setCats(data)
  }

  useEffect(() => {
    load()
  }, [])

  // Run one write, surface any error in plain words, then refresh the list.
  async function run(query) {
    setBusy(true)
    setError('')
    const { error } = await query
    setBusy(false)
    if (error) {
      setError(friendly(error))
      return false
    }
    await load()
    return true
  }

  async function handleAddTop(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n || busy) return
    const ok = await run(supabase.from('categories').insert({ name: n }))
    if (ok) setName('')
  }

  const onRename = (id, newName) =>
    run(supabase.from('categories').update({ name: newName }).eq('id', id))
  const onAddChild = (parentId, childName) =>
    run(supabase.from('categories').insert({ name: childName, parent_id: parentId }))
  const onMove = (id, parentId) =>
    run(supabase.from('categories').update({ parent_id: parentId }).eq('id', id))
  const onSetColor = (id, colorId) =>
    run(supabase.from('categories').update({ color: colorId }).eq('id', id))
  const onDelete = (id) => {
    setExpandedId(null)
    return run(supabase.from('categories').delete().eq('id', id))
  }

  const rows = cats ? orderedTree(cats) : []

  return (
    <div className="cats">
      <div className="cats-inner">
        <h1 className="cats-title">Categories</h1>
        <p className="cats-sub">
          Your buckets. Tap one to rename, nest, colour or remove it. Inbox is
          the fallback and stays put.
        </p>

        {cats === null ? (
          <p className="cats-note">Loading…</p>
        ) : (
          <ul className="cats-list">
            {rows.map((c) => (
              <CategoryRow
                key={c.id}
                cat={c}
                inbox={isInbox(c)}
                allCats={cats}
                expanded={expandedId === c.id}
                busy={busy}
                onToggle={() =>
                  setExpandedId(expandedId === c.id ? null : c.id)
                }
                onRename={onRename}
                onAddChild={onAddChild}
                onMove={onMove}
                onSetColor={onSetColor}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}

        <form className="cats-add" onSubmit={handleAddTop}>
          <input
            className="cats-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New top-level category"
            aria-label="New category name"
          />
          <button className="cats-btn" type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>

        {error && <p className="cats-error">{error}</p>}
      </div>
    </div>
  )
}

// Turn a Supabase/Postgres error into one plain sentence.
function friendly(error) {
  if (error.code === '23505')
    return 'A category with that name already exists here.'
  return error.message || 'Something went wrong.'
}
