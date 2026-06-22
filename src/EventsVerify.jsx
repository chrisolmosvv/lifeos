import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { orderedTree, isInbox } from './categoryTree'
import CategoryTag from './CategoryTag'
import './events.css'

// Bare-bones events verify UI (Phase 4, Piece 4a) — NOT the calendar. Just
// enough to prove the events spine is real: list events with their span and
// category, add one (title + start + end + optional category), and delete one
// (to confirm the category-delete behaviour). RLS makes every query owner-only;
// the real events live on the Phase-4b timeline. Lives inside Settings for now.
export default function EventsVerify() {
  const [events, setEvents] = useState(null) // null = still loading
  const [cats, setCats] = useState([])
  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState(() => toLocalInput(new Date()))
  const [endAt, setEndAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
  )
  const [categoryId, setCategoryId] = useState('') // '' = uncategorised (null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [evRes, catRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, title, start_at, end_at, category_id, created_at')
        .order('start_at', { ascending: true }),
      supabase
        .from('categories')
        .select('id, name, parent_id, color, sort_order, created_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ])
    if (evRes.error) {
      setError(friendly(evRes.error))
      setEvents([])
      return
    }
    setError('')
    setEvents(evRes.data)
    setCats(catRes.data || [])
  }

  useEffect(() => {
    load()
  }, [])

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

  async function handleAdd(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t || busy) return
    // datetime-local gives a local wall-clock string; toISOString() sends it as
    // a proper UTC timestamp the DB stores. category '' → null (uncategorised).
    const ok = await run(
      supabase.from('events').insert({
        title: t,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        category_id: categoryId || null,
      }),
    )
    if (ok) setTitle('')
  }

  const onDelete = (id) => run(supabase.from('events').delete().eq('id', id))

  // The tag for an event: its category, or a hollow "Uncategorised" dot.
  function tagFor(ev) {
    const cat = ev.category_id
      ? cats.find((c) => c.id === ev.category_id)
      : null
    return cat
      ? { name: cat.name, color: cat.color }
      : { name: 'Uncategorised', color: null }
  }

  const pickable = orderedTree(cats).filter((c) => !isInbox(c))

  return (
    <div className="events">
      <div className="events-inner">
        <h2 className="events-title">Events (verify)</h2>
        <p className="events-sub">
          A throwaway check that events save — the real events live on the
          calendar (Phase 4b). Add one, see it listed, delete it.
        </p>

        {events === null ? (
          <p className="events-note">Loading…</p>
        ) : events.length === 0 ? (
          <p className="events-note">No events yet — add one below.</p>
        ) : (
          <ul className="events-list">
            {events.map((ev) => {
              const tag = tagFor(ev)
              return (
                <li className="events-item" key={ev.id}>
                  <div className="events-body">
                    <span className="events-name">{ev.title}</span>
                    <span className="events-meta">
                      <span className="events-when tnum">
                        {formatSpan(ev.start_at, ev.end_at)}
                      </span>
                      <CategoryTag name={tag.name} color={tag.color} />
                    </span>
                  </div>
                  <button
                    className="events-del"
                    onClick={() => onDelete(ev.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <form className="events-add" onSubmit={handleAdd}>
          <input
            className="events-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New event"
            aria-label="New event title"
          />
          <div className="events-fields">
            <label className="events-field">
              <span>Start</span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </label>
            <label className="events-field">
              <span>End</span>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </label>
            <label className="events-field">
              <span>Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorised</option>
                {pickable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {'  '.repeat(c.depth) + c.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="events-btn" type="submit" disabled={busy}>
              {busy ? 'Adding…' : 'Add event'}
            </button>
          </div>
        </form>

        {error && <p className="events-error">{error}</p>}
      </div>
    </div>
  )
}

// A Date → the "YYYY-MM-DDTHH:MM" string a datetime-local input wants, in local
// time (so the box shows the owner's wall clock, not UTC).
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dateTime(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${WD[d.getDay()]} ${MO[d.getMonth()]} ${d.getDate()}, ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`
}
function time(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

// "Mon Jun 22, 14:00 – 15:30" (same day) or full date on both ends otherwise.
function formatSpan(startISO, endISO) {
  const s = new Date(startISO)
  const e = new Date(endISO)
  const sameDay = s.toDateString() === e.toDateString()
  return sameDay
    ? `${dateTime(s)} – ${time(e)}`
    : `${dateTime(s)} – ${dateTime(e)}`
}

// Turn a Supabase/Postgres error into one plain sentence.
function friendly(error) {
  if (error.code === '23514')
    return 'That event ends before it starts — check the times.'
  return error.message || 'Something went wrong.'
}
