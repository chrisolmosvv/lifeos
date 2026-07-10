import { useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import { listSnapshots, upsertSnapshot } from './financeData'

// SnapshotLog — the investment account's value-over-time log. A small inline
// form (date + value + "Log") above a reverse-chronological list of past
// snapshots. Upsert: logging a value on a date that already has one OVERWRITES
// it (the UNIQUE constraint on account_id+snapshot_date makes this safe).
// Ink/hairline only — no terracotta (reserved for + Add account).
export default function SnapshotLog({ accountId }) {
  const [snaps, setSnaps] = useState(null)
  const [date, setDate] = useState(todayYMD)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    listSnapshots(accountId).then((s) => alive && setSnaps(s)).catch(() => alive && setSnaps([]))
    return () => { alive = false }
  }, [accountId])

  async function handleLog(e) {
    e.preventDefault()
    if (!date || !value) return
    const num = parseFloat(value)
    if (!Number.isFinite(num)) return
    setBusy(true)
    try {
      await upsertSnapshot({ account_id: accountId, snapshot_date: date, value: num })
      const fresh = await listSnapshots(accountId)
      setSnaps(fresh)
      setValue('')
    } finally {
      setBusy(false)
    }
  }

  const fmtVal = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
  }
  const fmtDate = (d) => {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  return (
    <div className="fin-snap">
      <SmallCapsLabel>Value log</SmallCapsLabel>
      <form className="fin-snap-form" onSubmit={handleLog}>
        <input
          className="fin-snap-input fin-snap-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="fin-snap-input fin-snap-val"
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value (€)"
        />
        <button type="submit" className="fin-snap-log" disabled={busy || !value}>Log</button>
      </form>
      <HairlineRule faint />
      {snaps === null ? (
        <p className="fin-snap-empty">Loading…</p>
      ) : snaps.length === 0 ? (
        <p className="fin-snap-empty">No snapshots yet. Log a value to start tracking.</p>
      ) : (
        <div className="fin-snap-list">
          {snaps.map((s) => (
            <div className="fin-snap-row" key={s.id}>
              <span className="fin-snap-row-date">{fmtDate(s.snapshot_date)}</span>
              <span className="fin-snap-row-val tnum">€{fmtVal(s.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function todayYMD() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
