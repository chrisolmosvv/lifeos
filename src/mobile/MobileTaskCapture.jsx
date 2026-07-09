// Task capture: create (insert) OR edit (PATCH-update form-visible columns only).
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'
import { activeOnly } from '../spine/data/activeOnly'
import MobileCategoryPicker from './MobileCategoryPicker'
import MobileDatePicker from './MobileDatePicker'

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

export default function MobileTaskCapture({ onDone, onBack, item }) {
  const editing = !!item
  const [title, setTitle] = useState(item?.title || '')
  const [dueDate, setDueDate] = useState(item?.due_date || null)
  const [categoryId, setCategoryId] = useState(item?.category_id ?? null)
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

    let err
    if (editing) {
      // PATCH: only form-visible columns. Preserves status, time_bucket, notes,
      // priority, scheduled_start/end, source, series_id, etc.
      const patch = {
        title: trimmed,
        due_date: dueDate || null,
        category_id: categoryId || null,
      }
      ;({ error: err } = await supabase.from('tasks').update(patch).eq('id', item.id))
    } else {
      // CREATE: full row with defaults (matches desktop's buildOneOffFields).
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
      ;({ error: err } = await supabase.from('tasks').insert(row))
    }
    setSaving(false)
    if (err) { setError(err.message || 'Could not save.'); return }
    onDone()
  }

  return (
    <div className="mc-task">
      <button className="mc-back" onClick={onBack} type="button"
        aria-label="Back">&lsaquo;</button>
      <p className="mc-kicker">{editing ? 'Edit task' : 'New task'}</p>

      <input
        ref={inputRef}
        className="mc-field"
        type="text"
        placeholder="What needs doing?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />

      <fieldset className="mc-fieldset">
        <legend className="mc-legend">Due</legend>
        <MobileDatePicker mode="date" value={dueDate} onChange={setDueDate} chips={chips} />
      </fieldset>

      <fieldset className="mc-fieldset">
        <legend className="mc-legend">Category</legend>
        <MobileCategoryPicker cats={cats} value={categoryId} onPick={setCategoryId} />
      </fieldset>

      <button
        className="mc-save"
        type="button"
        disabled={!title.trim() || saving}
        onClick={handleSave}
      >
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
      </button>

      {error && <p className="mc-error">{error}</p>}
    </div>
  )
}
