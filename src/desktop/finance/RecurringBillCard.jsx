import { useEffect, useState } from 'react'
import { colorHex } from '../../spine/logic/palette'
import SeriesScopePrompt from '../kit/SeriesScopePrompt'
import { listUpcomingOccurrences } from './financeRecurringData'
import { applyOccurrenceEdit, deleteOccurrenceScope, undoSeriesSplit, undoSeriesDelete } from '../recur/series'

// RecurringBillCard — one recurring bill in the list. Edit/delete via the
// shared SeriesScopePrompt (this-one / following / all). Repeat-pattern editing
// is NOT supported — same constraint as the calendar's event/task series (the
// RepeatField is create-only). Content fields (description, amount, account,
// category) can be edited through the three-mode scope.

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

export default function RecurringBillCard({ bill, accountName, categoryName, categoryColor, today, accounts, cats, onChanged, setToast }) {
  const [upcoming, setUpcoming] = useState([])
  const [scopePrompt, setScopePrompt] = useState(null) // { occ, mode: 'edit'|'delete' }
  const [editing, setEditing] = useState(null) // { occ, scope } — after scope chosen
  const [editAmt, setEditAmt] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    listUpcomingOccurrences(bill.id, today, 3).then(setUpcoming).catch(() => setUpcoming([]))
  }, [bill.id, today])

  const hex = colorHex(categoryColor)

  function openEdit(occ) {
    setScopePrompt({ occ: { ...occ, series_id: bill.id }, mode: 'edit' })
  }

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
          if (result.undo) await undoSeriesDelete(result.undo)
          onChanged()
        },
      })
      return
    }

    // Edit: open the inline edit form with the chosen scope
    setEditing({ occ, scope })
    setEditAmt(String(Math.abs(Number(occ.amount || bill.amount))))
    setEditDesc(occ.description || bill.title || '')
  }

  async function handleEditSave(e) {
    e.preventDefault()
    const amt = parseFloat(editAmt)
    if (!amt || !editDesc.trim()) return
    const signedAmt = bill.txn_type === 'expense' ? -Math.abs(amt) : Math.abs(amt)
    const fields = {
      description: editDesc.trim(),
      amount: signedAmt,
      txn_type: bill.txn_type,
      account_id: bill.account_id,
      category_id: bill.category_id,
    }
    const result = await applyOccurrenceEdit(editing.scope, 'transaction', editing.occ, fields)
    if (result.error) { console.error(result.error); setEditing(null); return }
    if (result.undo) {
      setToast({
        text: `Edited ${editDesc.trim()}`,
        onUndo: async () => {
          setToast(null)
          await undoSeriesSplit(result.undo)
          onChanged()
        },
      })
    }
    setEditing(null)
    onChanged()
  }

  if (editing) {
    return (
      <div className="fin-bill-card">
        <form className="fin-bill-edit" onSubmit={handleEditSave}>
          <p className="fin-form-hint">
            {editing.scope === 'one' ? 'Edit this occurrence' : editing.scope === 'all' ? 'Edit all occurrences' : 'Edit this and following'}
          </p>
          <input className="fin-form-input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" autoFocus />
          <input className="fin-form-input fin-form-num" type="number" step="0.01" min="0.01" value={editAmt} onChange={(e) => setEditAmt(e.target.value)} placeholder="Amount (€)" />
          <div className="fin-form-actions">
            <button type="submit" className="fin-form-save" disabled={!editAmt || !editDesc.trim()}>Save</button>
            <button type="button" className="fin-form-cancel" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      </div>
    )
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
              <button className="fin-bill-occ-edit" onClick={() => openEdit(o)}>Edit</button>
              <button className="fin-bill-occ-del" onClick={() => setScopePrompt({ occ: { ...o, series_id: bill.id }, mode: 'delete' })}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="fin-bill-actions">
        {upcoming[0] && <button className="fin-bill-action" onClick={() => openEdit(upcoming[0])}>Edit bill</button>}
        <button className="fin-bill-action" onClick={() => {
          const occ = upcoming[0] || { id: null, series_id: bill.id }
          if (occ.id) setScopePrompt({ occ: { ...occ, series_id: bill.id }, mode: 'delete' })
        }}>Delete series</button>
      </div>

      {scopePrompt && (
        <SeriesScopePrompt kind="transaction" mode={scopePrompt.mode} onPick={handleScope} onCancel={() => setScopePrompt(null)} />
      )}
    </div>
  )
}
