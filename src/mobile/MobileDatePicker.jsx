// MobileDatePicker — broadsheet calendar for date / datetime / range selection.
// Three modes, one component. Output formats match the existing write paths so
// forms can swap in the picker with zero data-shape changes.
// Imports: spine only (dateUtils). CSS: mobileDatePicker.css.
import { useState } from 'react'
import { startOfWeek, isSameDay } from '../spine/logic/dateUtils'

const WDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// 42-day grid (6 weeks) starting on the Monday of the week containing the 1st.
function monthGrid(year, month) {
  const start = startOfWeek(new Date(year, month, 1))
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function parseYmd(s) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Matches MobileEventCapture.toIso exactly.
function toIso(ymd, hm) {
  const [y, mo, d] = ymd.split('-').map(Number)
  const [h, mi] = hm.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi).toISOString()
}

// Matches MobileEventCapture.midnightIso exactly.
function midnightIso(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toISOString()
}

function nextDayYmd(ymd) {
  const d = parseYmd(ymd)
  d.setDate(d.getDate() + 1)
  return fmtDate(d)
}

export default function MobileDatePicker({
  mode = 'date', value, onChange, chips, required,
}) {
  const initDate = mode === 'datetime' ? parseYmd(value?.date)
    : mode === 'range' ? parseYmd(value?.startDate)
    : (typeof value === 'string' ? parseYmd(value) : null)
  const initEnd = mode === 'range' ? parseYmd(value?.endDate) : null
  const anchor = initDate || new Date()

  const [sel, setSel] = useState(initDate)
  const [rangeEnd, setRangeEnd] = useState(initEnd)
  const [startTime, setStartTime] = useState(value?.start || '09:00')
  const [endTime, setEndTime] = useState(value?.end || '10:00')
  const [viewY, setViewY] = useState(anchor.getFullYear())
  const [viewM, setViewM] = useState(anchor.getMonth())

  const today = new Date()
  const days = monthGrid(viewY, viewM)

  // --- emit formatted output on every change ---
  function emit(date, rEnd, st, et) {
    if (!onChange) return
    if (mode === 'date') {
      onChange(date ? fmtDate(date) : null)
    } else if (mode === 'datetime' && date) {
      const d = fmtDate(date)
      onChange({ date: d, start: toIso(d, st), end: toIso(d, et) })
    } else if (mode === 'range') {
      if (!date || !rEnd) { onChange(null); return }
      const [s, e] = date <= rEnd ? [date, rEnd] : [rEnd, date]
      const sd = fmtDate(s), ed = fmtDate(e)
      onChange({
        startDate: sd, endDate: ed,
        endAtExclusive: midnightIso(nextDayYmd(ed)),
      })
    }
  }

  function tapDay(d) {
    if (mode === 'range') {
      if (!sel || rangeEnd) {
        setSel(d); setRangeEnd(null); emit(d, null, startTime, endTime)
      } else {
        setRangeEnd(d); emit(sel, d, startTime, endTime)
      }
    } else {
      const next = (sel && isSameDay(sel, d) && !required) ? null : d
      setSel(next); emit(next, null, startTime, endTime)
    }
  }

  function tapChip(val) {
    const d = parseYmd(val)
    if (!d) return
    if (mode === 'date' && !required && sel && fmtDate(sel) === val) {
      setSel(null); emit(null, null, startTime, endTime); return
    }
    setSel(d); setViewY(d.getFullYear()); setViewM(d.getMonth())
    if (mode === 'range') {
      setRangeEnd(null); emit(d, null, startTime, endTime)
    } else {
      emit(d, rangeEnd, startTime, endTime)
    }
  }

  function prevMonth() {
    if (viewM === 0) { setViewY(viewY - 1); setViewM(11) }
    else setViewM(viewM - 1)
  }
  function nextMonth() {
    if (viewM === 11) { setViewY(viewY + 1); setViewM(0) }
    else setViewM(viewM + 1)
  }

  // datetime time controls — clamp logic matches MobileEventCapture exactly
  function changeStart(v) {
    setStartTime(v)
    let et = endTime
    if (v >= endTime) {
      const [h, m] = v.split(':').map(Number)
      et = `${pad(Math.min(h + 1, 23))}:${pad(h + 1 > 23 ? 59 : m)}`
      setEndTime(et)
    }
    emit(sel, rangeEnd, v, et)
  }
  function changeEnd(v) { setEndTime(v); emit(sel, rangeEnd, startTime, v) }

  // selection helpers
  function isSelected(d) {
    if (!sel) return false
    if (mode === 'range' && rangeEnd) {
      const [s, e] = sel <= rangeEnd ? [sel, rangeEnd] : [rangeEnd, sel]
      return isSameDay(d, s) || isSameDay(d, e)
    }
    return isSameDay(d, sel)
  }
  function isInRange(d) {
    if (mode !== 'range' || !sel || !rangeEnd) return false
    const [s, e] = sel <= rangeEnd ? [sel, rangeEnd] : [rangeEnd, sel]
    return d > s && d < e
  }

  return (
    <div className="mdp">
      {chips?.length > 0 && (
        <div className="mdp-chips">
          {chips.map((c) => (
            <button key={c.value} type="button"
              className={'mdp-chip' + (sel && fmtDate(sel) === c.value ? ' mdp-chip--on' : '')}
              onClick={() => tapChip(c.value)}>{c.label}</button>
          ))}
        </div>
      )}

      <div className="mdp-header">
        <button type="button" className="mdp-nav" onClick={prevMonth}
          aria-label="Previous month">&lsaquo;</button>
        <span className="mdp-month">{MONTHS[viewM]} {viewY}</span>
        <button type="button" className="mdp-nav" onClick={nextMonth}
          aria-label="Next month">&rsaquo;</button>
      </div>

      <div className="mdp-weekdays">
        {WDAYS.map((w) => <span key={w} className="mdp-wd">{w}</span>)}
      </div>

      <div className="mdp-grid">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === viewM
          const selected = isSelected(d)
          const range = isInRange(d)
          const tod = isSameDay(d, today)
          let cls = 'mdp-day'
          if (!inMonth) cls += ' mdp-day--dim'
          if (selected) cls += ' mdp-day--sel'
          if (range) cls += ' mdp-day--range'
          if (tod && !selected) cls += ' mdp-day--today'
          return (
            <button key={i} type="button" className={cls}
              onClick={() => tapDay(d)}
              aria-label={`${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`}
              aria-selected={selected || undefined}>{d.getDate()}</button>
          )
        })}
      </div>

      {mode === 'datetime' && (
        <div className="mdp-time">
          <label className="mdp-time-label">
            <span className="mdp-time-cap">Start</span>
            <input type="time" className="mdp-time-input" value={startTime}
              onChange={(e) => changeStart(e.target.value)} />
          </label>
          <span className="mdp-time-sep">&ndash;</span>
          <label className="mdp-time-label">
            <span className="mdp-time-cap">End</span>
            <input type="time" className="mdp-time-input" value={endTime}
              onChange={(e) => changeEnd(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}
