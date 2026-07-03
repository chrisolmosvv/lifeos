// The Repeat control of the shared ItemForm (T10, Piece 2C). A single dropdown
// (Does not repeat / Daily / Weekly / Monthly / Yearly) that REVEALS a compact
// detail line when a repeat is chosen: a weekday chooser for Weekly, and the end
// option (Never / After N / On date) for all. CREATE-only — it renders nothing on
// an edit form or a subtask (series editing is a later piece). Hairline-plain,
// reuses the form's existing field/chip styling. All state lives in ItemForm; this
// is presentation, wired via the `repeat` prop group.

import { useState } from 'react'
import './repeatField.css'

// The Repeat control's state, as one group (keeps ItemForm lean). `enabled` gates
// whether the control shows + whether save materialises a series. The weekday
// chooser defaults to the item's start weekday.
export function useRepeat(item, enabled) {
  const [freq, setFreq] = useState('none')
  const [weekdays, setWeekdays] = useState(() => {
    const s = item.start_at || item.scheduled_start || item.due_date
    return [s ? new Date(s).getDay() : new Date().getDay()]
  })
  const [endKind, setEndKind] = useState('never')
  const [endCount, setEndCount] = useState('10')
  const [endUntil, setEndUntil] = useState('')
  return { enabled, freq, setFreq, weekdays, setWeekdays, endKind, setEndKind, endCount, setEndCount, endUntil, setEndUntil }
}

// Monday-first display, storing JS getDay() values (0=Sun..6=Sat).
const WEEK = [
  { v: 1, l: 'M' }, { v: 2, l: 'T' }, { v: 3, l: 'W' }, { v: 4, l: 'T' },
  { v: 5, l: 'F' }, { v: 6, l: 'S' }, { v: 0, l: 'S' },
]

export default function RepeatField({
  enabled, freq, setFreq, weekdays, setWeekdays,
  endKind, setEndKind, endCount, setEndCount, endUntil, setEndUntil,
}) {
  if (!enabled) return null // create-only; edit/subtask show no repeat row (Piece 3 adds series editing)

  const toggleDay = (v) =>
    setWeekdays(weekdays.includes(v) ? weekdays.filter((x) => x !== v) : [...weekdays, v])

  return (
    <div className="tk-form-field">
      <span className="tk-form-fieldlabel">Repeat</span>
      <select className="tk-form-select" value={freq} onChange={(e) => setFreq(e.target.value)} aria-label="Repeat">
        <option value="none">Does not repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>

      {freq !== 'none' && (
        <div className="tk-form-repeat">
          {freq === 'weekly' && (
            <div className="tk-form-chips" role="group" aria-label="Repeat on">
              {WEEK.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  className={'tk-form-chip' + (weekdays.includes(d.v) ? ' is-on' : '')}
                  aria-pressed={weekdays.includes(d.v)}
                  onClick={() => toggleDay(d.v)}
                >
                  {d.l}
                </button>
              ))}
            </div>
          )}
          <div className="tk-form-repeat-end">
            <select className="tk-form-select" value={endKind} onChange={(e) => setEndKind(e.target.value)} aria-label="Repeat ends">
              <option value="never">Never ends</option>
              <option value="count">After…</option>
              <option value="until">On date…</option>
            </select>
            {endKind === 'count' && (
              <span className="tk-form-repeat-count">
                <input type="number" min="1" value={endCount} onChange={(e) => setEndCount(e.target.value)} aria-label="Number of times" />
                <span>times</span>
              </span>
            )}
            {endKind === 'until' && (
              <input type="date" value={endUntil} onChange={(e) => setEndUntil(e.target.value)} aria-label="Repeat until" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
