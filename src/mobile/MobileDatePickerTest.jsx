// THROWAWAY test mount — renders three MobileDatePicker instances (one per mode)
// with live output values. Remove when the real forms adopt the picker.
import { useState } from 'react'
import MobileDatePicker from './MobileDatePicker'

const pad = (n) => String(n).padStart(2, '0')
function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function tomorrowYmd() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const CHIPS = [
  { label: 'Today', value: todayYmd() },
  { label: 'Tomorrow', value: tomorrowYmd() },
]

export default function MobileDatePickerTest({ onBack }) {
  const [dateOut, setDateOut] = useState(null)
  const [dtOut, setDtOut] = useState(null)
  const [rangeOut, setRangeOut] = useState(null)

  const heading = {
    fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400,
    color: 'var(--ink)', margin: '24px 0 10px 0', borderTop: '1px solid var(--rule)',
    paddingTop: 16,
  }

  return (
    <div style={{ padding: '24px 20px 40px', overflowY: 'auto', maxHeight: '100vh' }}>
      <button className="mc-back" onClick={onBack} type="button"
        aria-label="Back">&lsaquo;</button>
      <p className="mc-kicker">Picker test (throwaway)</p>

      <p style={heading}>mode = "date" (nullable)</p>
      <MobileDatePicker mode="date" onChange={setDateOut} chips={CHIPS} />
      <div className="mdp-test-out">{JSON.stringify(dateOut, null, 2) ?? 'null'}</div>

      <p style={heading}>mode = "datetime"</p>
      <MobileDatePicker mode="datetime" onChange={setDtOut} chips={CHIPS} required />
      <div className="mdp-test-out">{JSON.stringify(dtOut, null, 2) ?? 'null'}</div>

      <p style={heading}>mode = "range" (tap two days)</p>
      <MobileDatePicker mode="range" onChange={setRangeOut} chips={CHIPS} required />
      <div className="mdp-test-out">{JSON.stringify(rangeOut, null, 2) ?? 'null'}</div>
    </div>
  )
}
