// Note quick-capture: text → Inbox task (no date) → return.
// Same task-create row shape as MobileTaskCapture, stripped to the minimum.
import { useRef, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'

export default function MobileNoteCapture({ onDone, onBack }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  async function handleSave() {
    const trimmed = text.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setError(null)

    const row = {
      title: trimmed,
      status: 'open',
      time_bucket: 'Today',
      due_date: null,
      category_id: null,
      priority: null,
      scheduled_start: null,
      scheduled_end: null,
      notes: null,
    }
    const { error: err } = await supabase.from('tasks').insert(row)
    setSaving(false)
    if (err) { setError(err.message || 'Could not save.'); return }
    onDone()
  }

  return (
    <div className="mc-note">
      <button className="mc-back" onClick={onBack} type="button"
        aria-label="Back to chooser">&lsaquo;</button>
      <p className="mc-kicker">Quick note</p>

      <textarea
        ref={inputRef}
        className="mc-note-input"
        placeholder="Jot it down…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        rows={3}
      />

      <button
        className="mc-save"
        type="button"
        disabled={!text.trim() || saving}
        onClick={handleSave}
      >
        {saving ? 'Adding…' : 'Add note'}
      </button>

      {error && <p className="mc-error">{error}</p>}
    </div>
  )
}
