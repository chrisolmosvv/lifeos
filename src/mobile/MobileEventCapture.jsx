// Event quick-capture: title + date + start/end time + category → INSERT → return.
// Row shape matches desktop's buildOneOffFields('event', …) exactly.
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

// "YYYY-MM-DD" + "HH:MM" → ISO timestamptz string (local time).
function toIso(dateYmd, timeHm) {
  const [y, mo, d] = dateYmd.split('-').map(Number)
  const [h, mi] = timeHm.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi).toISOString()
}

// "YYYY-MM-DD" → midnight ISO (for all-day events, end-exclusive).
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

export default function MobileEventCapture({ onDone, onBack }) {
  const def = defaults()
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(def.date)
  const [startTime, setStartTime] = useState(def.start)
  const [endTime, setEndTime] = useState(def.end)
  const [allDay, setAllDay] = useState(false)
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

  // Clamp end ≥ start when user changes start time (timed events only).
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

    // Row shape matches desktop's buildOneOffFields('event', …).
    let row
    if (allDay) {
      row = {
        title: title.trim(),
        notes: null,
        category_id: categoryId || null,
        location: null,
        all_day: true,
        start_at: midnightIso(eventDate),
        end_at: midnightIso(addDay(eventDate)),
      }
    } else {
      row = {
        title: title.trim(),
        notes: null,
        category_id: categoryId || null,
        location: null,
        all_day: false,
        start_at: toIso(eventDate, startTime),
        end_at: toIso(eventDate, endTime),
      }
    }

    const { error: err } = await supabase.from('events').insert(row)
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
        aria-label="Back to chooser">&lsaquo;</button>
      <p className="mc-kicker">New event</p>

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
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day
        </label>
        {!allDay && (
          <div className="mc-time-row">
            <input
              className="mc-time-input"
              type="time"
              value={startTime}
              onChange={(e) => setStartClamped(e.target.value)}
            />
            <span className="mc-time-sep">–</span>
            <input
              className="mc-time-input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
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
        {saving ? 'Adding…' : 'Add event'}
      </button>

      {error && <p className="mc-error">{error}</p>}
    </div>
  )
}
