import { useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import { upsertBirthday, addCustomDate, deleteDate } from '../../spine/data/peopleWrite'

// DatesEditor — add/edit/delete birthday + custom dates on the file (D12 Commit 1).
// Birthday: day + month always, year OPTIONAL. Custom: label + day + month + optional year.
// No calendar wiring this commit — that's Commit 2.

export default function DatesEditor({ personId, dates, onChanged }) {
  const birthday = dates.find((d) => d.kind === 'birthday')
  const customs = dates.filter((d) => d.kind === 'custom')

  // Birthday form state
  const [bDay, setBDay] = useState(birthday ? Number(birthday.date_value.split('-')[2]) : '')
  const [bMonth, setBMonth] = useState(birthday ? Number(birthday.date_value.split('-')[1]) : '')
  const [bYear, setBYear] = useState(birthday?.year_known ? Number(birthday.date_value.split('-')[0]) : '')
  const [busy, setBusy] = useState(false)

  // Custom date add state
  const [adding, setAdding] = useState(false)
  const [cLabel, setCLabel] = useState('')
  const [cDay, setCDay] = useState('')
  const [cMonth, setCMonth] = useState('')
  const [cYear, setCYear] = useState('')

  async function saveBirthday() {
    const d = Number(bDay), m = Number(bMonth)
    if (!d || !m || d < 1 || d > 31 || m < 1 || m > 12) return
    setBusy(true)
    try {
      await upsertBirthday(personId, { month: m, day: d, year: bYear ? Number(bYear) : null })
      onChanged()
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function removeBirthday() {
    if (!birthday) return
    try { await deleteDate(birthday.id); onChanged() }
    catch (e) { console.error(e) }
  }

  async function handleAddCustom() {
    const d = Number(cDay), m = Number(cMonth)
    if (!d || !m || d < 1 || d > 31 || m < 1 || m > 12) return
    setBusy(true)
    try {
      await addCustomDate(personId, { label: cLabel, month: m, day: d, year: cYear ? Number(cYear) : null })
      setCLabel(''); setCDay(''); setCMonth(''); setCYear(''); setAdding(false)
      onChanged()
    } catch (e) { console.error(e) }
    finally { setBusy(false) }
  }

  async function removeCustom(id) {
    try { await deleteDate(id); onChanged() }
    catch (e) { console.error(e) }
  }

  return (
    <div className="pdates">
      <SmallCapsLabel>Key dates</SmallCapsLabel>

      {/* Birthday */}
      <div className="pdates-row">
        <span className="pdates-label">Birthday</span>
        <div className="pdates-fields">
          <input className="pdates-num" type="number" min="1" max="31" placeholder="DD" value={bDay} onChange={(e) => setBDay(e.target.value)} />
          <input className="pdates-num" type="number" min="1" max="12" placeholder="MM" value={bMonth} onChange={(e) => setBMonth(e.target.value)} />
          <input className="pdates-year" type="number" min="1900" max="2100" placeholder="Year (optional)" value={bYear} onChange={(e) => setBYear(e.target.value)} />
          <button className="pmanage-btn" onClick={saveBirthday} disabled={busy}>✓</button>
          {birthday && <button className="pmanage-btn pmanage-del" onClick={removeBirthday}>×</button>}
        </div>
      </div>

      {/* Existing custom dates */}
      {customs.map((d) => (
        <div className="pdates-row" key={d.id}>
          <span className="pdates-label">{d.label || 'Date'}</span>
          <div className="pdates-fields">
            <span className="pfile-meta tnum">{d.date_value}</span>
            <button className="pmanage-btn pmanage-del" onClick={() => removeCustom(d.id)}>×</button>
          </div>
        </div>
      ))}

      {/* Add custom date */}
      {adding ? (
        <div className="pdates-row">
          <input className="pedit-input" value={cLabel} onChange={(e) => setCLabel(e.target.value)} placeholder="Label" style={{ maxWidth: 100 }} />
          <div className="pdates-fields">
            <input className="pdates-num" type="number" min="1" max="31" placeholder="DD" value={cDay} onChange={(e) => setCDay(e.target.value)} />
            <input className="pdates-num" type="number" min="1" max="12" placeholder="MM" value={cMonth} onChange={(e) => setCMonth(e.target.value)} />
            <input className="pdates-year" type="number" min="1900" max="2100" placeholder="Year" value={cYear} onChange={(e) => setCYear(e.target.value)} />
            <button className="pmanage-btn" onClick={handleAddCustom} disabled={busy}>✓</button>
            <button className="pmanage-btn" onClick={() => setAdding(false)}>✕</button>
          </div>
        </div>
      ) : (
        <button className="pcatch-expand" onClick={() => setAdding(true)}>+ Add a date</button>
      )}
    </div>
  )
}
