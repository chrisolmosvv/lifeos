// Task quick-capture: title + optional date + optional category → INSERT → return.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'
import { activeOnly } from '../spine/data/activeOnly'
import MobileCategoryPicker from './MobileCategoryPicker'

const dateStr = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dateChips() {
  const today = new Date()
  const d = (n) => { const x = new Date(today); x.setDate(x.getDate() + n); return x }
  const dow = today.getDay() // 0=Sun
  const satDelta = dow === 0 ? 6 : dow === 6 ? 0 : 6 - dow
  const monDelta = dow === 0 ? 1 : 8 - dow
  return [
    { label: 'Today', value: dateStr(today) },
    { label: 'Tomorrow', value: dateStr(d(1)) },
    { label: satDelta > 1 ? 'This Sat' : 'Next Sat', value: dateStr(d(satDelta || 7)) },
    { label: 'Next Mon', value: dateStr(d(monDelta)) },
  ]
}

export default function MobileTaskCapture({ onDone, onBack }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(null)
  const [categoryId, setCategoryId] = useState(null)
  const [cats, setCats] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const chips = dateChips()

  useEffect(() => {
    inputRef.current?.focus()
    activeOnly(
      supabase.from('categories').select('id, name, parent_id, color, sort_order, created_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ).then(({ data }) => setCats(data || []))
  }, [])

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setError(null)

    // Row shape matches desktop's buildOneOffFields('task', …) + quick-add.
    // time_bucket: 'Today' (the capture intent is "do this now"; the form has no
    // bucket picker — matching ItemForm's Today chip default on create).
    const row = {
      title: trimmed,
      status: 'open',
      time_bucket: 'Today',
      due_date: dueDate || null,
      category_id: categoryId || null,
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

  function toggleDate(val) {
    setDueDate((prev) => prev === val ? null : val)
  }

  return (
    <div className="mc-task">
      <button className="mc-back" onClick={onBack} type="button"
        aria-label="Back to chooser">&lsaquo;</button>
      <p className="mc-kicker">New task</p>

      <input
        ref={inputRef}
        className="mc-task-title"
        type="text"
        placeholder="What needs doing?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />

      <fieldset className="mc-task-dates">
        <legend className="mc-task-legend">Due</legend>
        <div className="mc-chip-row">
          {chips.map((c) => (
            <button
              key={c.value}
              type="button"
              className={'mc-chip' + (dueDate === c.value ? ' mc-chip--on' : '')}
              onClick={() => toggleDate(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="mc-task-date-input"
          type="date"
          value={dueDate || ''}
          onChange={(e) => setDueDate(e.target.value || null)}
        />
      </fieldset>

      <fieldset className="mc-task-cat">
        <legend className="mc-task-legend">Category</legend>
        <MobileCategoryPicker cats={cats} value={categoryId} onPick={setCategoryId} />
      </fieldset>

      <button
        className="mc-task-save"
        type="button"
        disabled={!title.trim() || saving}
        onClick={handleSave}
      >
        {saving ? 'Adding…' : 'Add task'}
      </button>

      {error && <p className="mc-task-error">{error}</p>}
    </div>
  )
}
