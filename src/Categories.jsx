import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './categories.css'

// Bare-bones Categories view: list the owner's buckets (Inbox included) and
// add a new one by name. No colours, nesting, edit or delete yet — those are
// later pieces. RLS makes every query owner-only; we don't filter by hand.
export default function Categories() {
  const [cats, setCats] = useState(null) // null = still loading
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      setError(error.message)
      setCats([])
    } else {
      setCats(data)
      setError('')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError('')
    // user_id fills itself from the logged-in owner (table default auth.uid()).
    const { error } = await supabase.from('categories').insert({ name: trimmed })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setName('')
    load()
  }

  return (
    <div className="cats">
      <div className="cats-inner">
        <h1 className="cats-title">Categories</h1>
        <p className="cats-sub">
          Your buckets. Inbox is where uncategorised things land.
        </p>

        {cats === null ? (
          <p className="cats-note">Loading…</p>
        ) : cats.length === 0 ? (
          <p className="cats-note">No categories yet.</p>
        ) : (
          <ul className="cats-list">
            {cats.map((c) => (
              <li className="cats-item" key={c.id}>
                {c.name}
              </li>
            ))}
          </ul>
        )}

        <form className="cats-add" onSubmit={handleAdd}>
          <input
            className="cats-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
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
