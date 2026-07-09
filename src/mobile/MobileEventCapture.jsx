// Event capture: create (insert) OR edit (PATCH-update form-visible columns only).
// Row shape matches desktop's buildOneOffFields('event', …) on create.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../spine/data/supabaseClient'
import { activeOnly } from '../spine/data/activeOnly'
import MobileCategoryPicker from './MobileCategoryPicker'

const pad = (n) => String(n).padStart(2, '0')
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const timeStr = (h, m) => `${pad(h)}:${pad(m)}`

function defaults() {
  const now = new Date()
  const h = now.getHours()
  const nextH = h < 23 ? h + 1 : 23
  return {
    date: dateStr(now),
    start: timeStr(nextH, 0),
    end: timeStr(Math.min(nextH + 1, 23), nextH + 1 > 23 ? 59 : 0),
  }
}

function dateChips() {
  const today = new Date()
  const tom = new Date(today)
  tom.setDate(tom.getDate() + 1)
  return [
    { label: 'Today', value: dateStr(today) },
    { label: 'Tomorrow', value: dateStr(tom) },
  ]
}

function toIso(dateYmd, timeHm) {
  const [y, mo, d] = dateYmd.split('-').map(Number)
  const [h, mi] = timeHm.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi).toISOString()
}

function midnightIso(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toISOString()
}
function addDay(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  const x = new Date(y, m - 1, d)
  x.setDate(x.getDate() + 1)
  return dateStr(x)
}

// Extract "YYYY-MM-DD" and "HH:MM" from an ISO timestamp (local time).
function parseIso(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  return { date: dateStr(d), time: timeStr(d.getHours(), d.getMinutes()) }
}

function initFromItem(item) {
  const s = parseIso(item.start_at)
  const e = parseIso(item.end_at)
  return {
    date: s.date,
    start: s.time,
    end: e.time,
    allDay: !!item.all_day,
  }
}

export default function MobileEventCapture({ onDone, onBack, item }) {
  const editing = !!item
  const def = editing ? initFromItem(item) : defaults()
  const [title, setTitle] = useState(item?.title || '')
  const [eventDate, setEventDate] = useState(editing ? def.date : defaults().date)
  const [startTime, setStartTime] = useState(def.start)
  const [endTime, setEndTime] = useState(def.end)
  const [allDay, setAllDay] = useState(def.allDay || false)
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

  function setStartClamped(val) {
    setStartTime(val)
    if (val >= endTime) {
      const [h, m] = val.split(':').map(Number)
      setEndTime(timeStr(Math.min(h + 1, 23), h + 1 > 23 ? 59 : m))
    }
  }

  const valid = title.trim() && eventDate

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    setError(null)

    // Build timing fields (shared by create and edit).
    let timing
    if (allDay) {
      timing = { all_day: true, start_at: midnightIso(eventDate), end_at: midnightIso(addDay(eventDate)) }
    } else {
      timing = { all_day: false, start_at: toIso(eventDate, startTime), end_at: toIso(eventDate, endTime) }
    }

    let err
    if (editing) {
      // PATCH: only form-visible columns. Preserves notes, location, series_id, etc.
      const patch = { title: title.trim(), category_id: categoryId || null, ...timing }
      ;({ error: err } = await supabase.from('events').update(patch).eq('id', item.id))
    } else {
      // CREATE: full row with defaults (matches desktop's buildOneOffFields).
      const row = { title: title.trim(), notes: null, category_id: categoryId || null, location: null, ...timing }
      ;({ error: err } = await supabase.from('events').insert(row))
    }
    setSaving(false)
    if (err) {
      setError(err.code === '23514'
        ? 'That event ends before it starts — check the times.'
        : err.message || 'Could not save.')
      return
    }
    onDone()
  }

  return (
    <div className="mc-event">
      <button className="mc-back" onClick={onBack} type="button"
        aria-label="Back">&lsaquo;</button>
      <p className="mc-kicker">{editing ? 'Edit event' : 'New event'}</p>

      <input
        ref={inputRef}
        className="mc-field"
        type="text"
        placeholder="What's happening?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <fieldset className="mc-fieldset">
        <legend className="mc-legend">Date</legend>
        <div className="mc-chip-row">
          {chips.map((c) => (
            <button
              key={c.value}
              type="button"
              className={'mc-chip' + (eventDate === c.value ? ' mc-chip--on' : '')}
              onClick={() => setEventDate(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="mc-date-input"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value || def.date)}
        />
      </fieldset>

      <fieldset className="mc-fieldset">
        <legend className="mc-legend">Time</legend>
        <label className="mc-allday-label">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>
        {!allDay && (
          <div className="mc-time-row">
            <input className="mc-time-input" type="time" value={startTime}
              onChange={(e) => setStartClamped(e.target.value)} />
            <span className="mc-time-sep">–</span>
            <input className="mc-time-input" type="time" value={endTime}
              onChange={(e) => setEndTime(e.target.value)} />
          </div>
        )}
      </fieldset>

      <fieldset className="mc-fieldset">
        <legend className="mc-legend">Category</legend>
        <MobileCategoryPicker cats={cats} value={categoryId} onPick={setCategoryId} />
      </fieldset>

      <button
        className="mc-save"
        type="button"
        disabled={!valid || saving}
        onClick={handleSave}
      >
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Add event'}
      </button>

      {error && <p className="mc-error">{error}</p>}
    </div>
  )
}
