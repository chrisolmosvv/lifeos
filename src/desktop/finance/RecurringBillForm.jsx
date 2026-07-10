import { useState } from 'react'
import CategoryPicker from '../kit/CategoryPicker'
import RepeatField, { useRepeat } from '../kit/RepeatField'
import { colorHex } from '../../spine/logic/palette'
import { createSeriesAndMaterialise } from '../recur/series'
import { createCategory } from './financeData'

// RecurringBillForm — setup form for a new recurring bill. Type-first
// (income/expense ONLY — no transfer in V1). Reuses the calendar's
// RepeatField verbatim for the pattern (freq, weekdays, end condition).

export default function RecurringBillForm({ accounts, cats, onCreated, onCancel }) {
  const [type, setType] = useState('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [categoryId, setCategoryId] = useState(null)
  const [showPick, setShowPick] = useState(false)
  const [startDate, setStartDate] = useState(todayYMD())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [localCats, setLocalCats] = useState(cats)

  const repeat = useRepeat({}, true)
  const catName = categoryId ? (localCats.find((c) => c.id === categoryId)?.name || '') : 'Inbox'
  const catColor = categoryId ? colorHex(localCats.find((c) => c.id === categoryId)?.color) : null

  async function handleSubmit(e) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!title.trim() || !amt || !accountId || !startDate) return
    if (repeat.freq === 'none') { setErr('Pick a repeat pattern.'); return }

    setBusy(true)
    setErr('')
    const recipe = {
      target_kind: 'transaction',
      freq: repeat.freq,
      weekdays: repeat.freq === 'weekly' ? (repeat.weekdays.length ? repeat.weekdays : null) : null,
      end_kind: repeat.endKind,
      end_count: repeat.endKind === 'count' ? Math.max(1, parseInt(repeat.endCount, 10) || 1) : null,
      end_until: repeat.endKind === 'until' ? repeat.endUntil || null : null,
      start_date: startDate,
      timezone: 'Europe/Amsterdam',
      title: title.trim(),
      amount: type === 'expense' ? -Math.abs(amt) : Math.abs(amt),
      account_id: accountId,
      category_id: categoryId,
      txn_type: type,
    }
    const error = await createSeriesAndMaterialise(recipe)
    setBusy(false)
    if (error) { setErr(error); return }
    onCreated()
  }

  async function handleCreateCategory(name) {
    const created = await createCategory(name)
    setLocalCats((prev) => [...prev, created])
    setCategoryId(created.id)
  }

  return (
    <form className="fin-txn-form" onSubmit={handleSubmit}>
      <div className="fin-form-types">
        <button type="button" className={'fin-form-type' + (type === 'expense' ? ' is-on' : '')} onClick={() => setType('expense')}>Expense</button>
        <button type="button" className={'fin-form-type' + (type === 'income' ? ' is-on' : '')} onClick={() => setType('income')}>Income</button>
      </div>

      <input className="fin-form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Description (e.g. Netflix, Rent)" autoFocus />
      <input className="fin-form-input fin-form-num" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (€)" />

      <label className="fin-txn-label">Account</label>
      <select className="fin-txn-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      <label className="fin-txn-label">Category</label>
      <button type="button" className="fin-txn-cat-btn" onClick={() => setShowPick(!showPick)}>
        {catColor && <span className="fin-txn-cat-dot" style={{ background: catColor }} />}
        <span>{catName}</span>
      </button>
      {showPick && (
        <CategoryPicker cats={localCats} value={categoryId} inboxColor="slate"
          onPick={(id) => { setCategoryId(id); setShowPick(false) }}
          onCreate={handleCreateCategory} />
      )}

      <label className="fin-txn-label">Starts</label>
      <input className="fin-form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

      <RepeatField {...repeat} />

      {err && <p className="fin-form-err">{err}</p>}

      <div className="fin-form-actions">
        <button type="submit" className="fin-form-save" disabled={busy || !title.trim() || !amount || repeat.freq === 'none'}>
          {busy ? 'Creating…' : 'Create recurring bill'}
        </button>
        <button type="button" className="fin-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function todayYMD() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
