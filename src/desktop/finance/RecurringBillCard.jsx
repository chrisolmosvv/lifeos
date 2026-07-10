import { useEffect, useState } from 'react'
import { colorHex } from '../../spine/logic/palette'
import SeriesScopePrompt from '../kit/SeriesScopePrompt'
import { listUpcomingOccurrences } from './financeRecurringData'
import { applyOccurrenceEdit, deleteOccurrenceScope, undoSeriesSplit, undoSeriesDelete } from '../recur/series'

// RecurringBillCard — one recurring bill in the list: description, amount, freq,
// account, category, + the next 3 upcoming occurrences. Edit/delete via the
// shared SeriesScopePrompt (this-one / following / all).

const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

function fmtAmt(v) {
  const n = Number(v)
  const s = n >= 0 ? '+' : ''
  return s + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(ymd) {
  try { return new Date(ymd + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  catch { return ymd }
}

export default function RecurringBillCard({ bill, accountName, categoryName, categoryColor, today, onChanged, setToast }) {
  const [upcoming, setUpcoming] = useState([])
  const [scopePrompt, setScopePrompt] = useState(null) // { occ, mode: 'edit'|'delete' }

  useEffect(() => {
    listUpcomingOccurrences(bill.id, today, 3).then(setUpcoming).catch(() => setUpcoming([]))
  }, [bill.id, today])

  const hex = colorHex(categoryColor)

  async function handleScope(scope) {
    const occ = scopePrompt.occ
    const mode = scopePrompt.mode
    setScopePrompt(null)

    if (mode === 'delete') {
      const result = await deleteOccurrenceScope(scope, 'transaction', occ)
      if (result.error) { console.error(result.error); return }
      onChanged()
      setToast({
        text: `Deleted ${bill.title || 'bill'}`,
        onUndo: async () => {
          setToast(null)
          await undoSeriesDelete(result.undo)
          onChanged()
        },
      })
    }
    // edit: for now just re-trigger a load (full edit form is a later refinement)
  }

  return (
    <div className="fin-bill-card">
      <div className="fin-bill-header">
        <span className="fin-bill-title">{bill.title}</span>
        <span className="fin-bill-amt tnum">€{fmtAmt(bill.amount)}</span>
      </div>
      <div className="fin-bill-meta">
        <span>{FREQ_LABELS[bill.freq] || bill.freq}</span>
        <span className="fin-bill-sep">·</span>
        <span>{accountName}</span>
        {categoryName && (
          <>
            <span className="fin-bill-sep">·</span>
            {hex && <span className="fin-bill-dot" style={{ background: hex }} />}
            <span>{categoryName}</span>
          </>
        )}
      </div>
      {upcoming.length > 0 && (
        <div className="fin-bill-upcoming">
          <span className="fin-bill-upcoming-label">Upcoming</span>
          {upcoming.map((o) => (
            <div className="fin-bill-occ" key={o.id}>
              <span className="fin-bill-occ-date">{fmtDate(o.entry_date)}</span>
              <span className="fin-bill-occ-amt tnum">€{fmtAmt(o.amount)}</span>
              <button className="fin-bill-occ-del" onClick={() => setScopePrompt({ occ: { ...o, series_id: bill.id }, mode: 'delete' })}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="fin-bill-actions">
        <button className="fin-bill-action" onClick={() => {
          const fakeOcc = { id: upcoming[0]?.id, series_id: bill.id }
          if (fakeOcc.id) setScopePrompt({ occ: fakeOcc, mode: 'delete' })
        }}>Delete series</button>
      </div>

      {scopePrompt && (
        <SeriesScopePrompt kind="transaction" mode={scopePrompt.mode} onPick={handleScope} onCancel={() => setScopePrompt(null)} />
      )}
    </div>
  )
}
