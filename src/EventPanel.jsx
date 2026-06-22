import { useState } from 'react'
import CategoryTag from './CategoryTag'
import './tasks.css' // reuse the task panel's field + chip styles (same family)
import './eventPanel.css'

// The create/edit event panel — a calm overlay over the day column (the grid
// behind stays put, so the page never scrolls). Same field/chip family as the
// task edit panel from Piece 2a. Writes only to existing event columns; the DB
// guards (end-not-before-start) are surfaced as a plain message, not crashed.
export default function EventPanel({
  mode, // 'new' | 'edit'
  event, // the row, in edit mode
  start, // Date, in new mode
  end, // Date, in new mode
  pickable, // categories offered as chips
  busy,
  onSave, // (id|null, fields) => errorMessage | null
  onDelete, // (id) => errorMessage | null
  onClose,
}) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [startAt, setStartAt] = useState(
    toLocalInput(event ? new Date(event.start_at) : start),
  )
  const [endAt, setEndAt] = useState(
    toLocalInput(event ? new Date(event.end_at) : end),
  )
  const [categoryId, setCategoryId] = useState(event?.category_id ?? null)
  const [err, setErr] = useState('')

  async function handleSave() {
    const t = title.trim()
    if (!t) return setErr('Give the event a title.')
    const fields = {
      title: t,
      notes: notes.trim() || null,
      location: location.trim() || null,
      category_id: categoryId || null,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
    }
    const msg = await onSave(mode === 'edit' ? event.id : null, fields)
    if (msg) setErr(msg)
    else onClose()
  }

  async function handleDelete() {
    const msg = await onDelete(event.id)
    if (msg) setErr(msg)
    else onClose()
  }

  return (
    <div className="ep-scrim" onClick={onClose}>
      <div className="ep" onClick={(e) => e.stopPropagation()}>
        <div className="ep-head">
          <h3 className="ep-title">
            {mode === 'edit' ? 'Edit event' : 'New event'}
          </h3>
          <button className="ep-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <input
          className="tasks-input ep-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          aria-label="Event title"
          autoFocus
        />

        <div className="ep-times">
          <label className="ep-field">
            <span>Start</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </label>
          <label className="ep-field">
            <span>End</span>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </label>
        </div>

        <input
          className="tasks-input ep-input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          aria-label="Location"
        />
        <textarea
          className="tasks-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          aria-label="Notes"
          rows={2}
        />

        <div className="tasks-pick">
          <span className="tasks-picklabel">Category</span>
          <div className="tasks-chips">
            <button
              type="button"
              className={'tasks-chip' + (!categoryId ? ' is-on' : '')}
              disabled={busy}
              onClick={() => setCategoryId(null)}
            >
              <CategoryTag name="Uncategorised" color={null} />
            </button>
            {pickable.map((c) => (
              <button
                type="button"
                key={c.id}
                className={'tasks-chip' + (categoryId === c.id ? ' is-on' : '')}
                disabled={busy}
                onClick={() => setCategoryId(c.id)}
              >
                <CategoryTag name={c.name} color={c.color} />
              </button>
            ))}
          </div>
        </div>

        {err && <p className="ep-error">{err}</p>}

        <div className="ep-actions">
          {mode === 'edit' ? (
            <button className="ep-delete" onClick={handleDelete} disabled={busy}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="ep-actions-right">
            <button className="ep-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="ep-save" onClick={handleSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// A Date → the "YYYY-MM-DDTHH:MM" string a datetime-local input wants (local).
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`
}
