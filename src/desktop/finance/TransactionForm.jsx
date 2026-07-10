import { useState } from 'react'
import CategoryPicker from '../kit/CategoryPicker'
import { colorHex } from '../../spine/logic/palette'

// TransactionForm — type-first create/edit form for a transaction.
// Income/Expense: date, amount, account, category (with inline create), description.
// Transfer: date, amount, from-account, to-account, description (no category).
// Props: accounts, cats, initial (null=create), defaultAccountId,
//        onSave(fields), onCreate(name) — category inline create, onCancel.
export default function TransactionForm({ accounts, cats, initial, defaultAccountId, onSave, onCreateCategory, onCancel }) {
  const editing = !!initial
  const [type, setType] = useState(initial?.txn_type || 'expense')
  const [date, setDate] = useState(initial?.entry_date || todayYMD())
  const [amount, setAmount] = useState(initial ? String(Math.abs(Number(initial.amount))) : '')
  const [accountId, setAccountId] = useState(initial?.account_id || defaultAccountId || accounts[0]?.id || '')
  const [transferTo, setTransferTo] = useState(initial?.transfer_account_id || '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? null)
  const [description, setDescription] = useState(initial?.description || '')
  const [showPick, setShowPick] = useState(false)
  const [busy, setBusy] = useState(false)

  const catName = categoryId ? (cats.find((c) => c.id === categoryId)?.name || '') : 'Inbox'
  const catColor = categoryId ? colorHex(cats.find((c) => c.id === categoryId)?.color) : null

  async function handleSubmit(e) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || !accountId || !date) return
    setBusy(true)
    try {
      await onSave({ txn_type: type, entry_date: date, amount: amt, account_id: accountId,
        transfer_account_id: type === 'transfer' ? transferTo : null,
        category_id: type === 'transfer' ? null : categoryId,
        description: description.trim() || null })
    } finally { setBusy(false) }
  }

  const isTransfer = type === 'transfer'

  return (
    <form className="fin-txn-form" onSubmit={handleSubmit}>
      {!editing && (
        <div className="fin-form-types">
          {['expense', 'income', 'transfer'].map((t) => (
            <button key={t} type="button" className={'fin-form-type' + (type === t ? ' is-on' : '')}
              onClick={() => setType(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      )}
      {editing && <p className="fin-form-hint">{type[0].toUpperCase() + type.slice(1)}</p>}

      <input className="fin-form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input className="fin-form-input fin-form-num" type="number" step="0.01" min="0.01"
        value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (€)" />

      <label className="fin-txn-label">{isTransfer ? 'From' : 'Account'}</label>
      <select className="fin-txn-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {isTransfer && (
        <>
          <label className="fin-txn-label">To</label>
          <select className="fin-txn-select" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
            <option value="">Pick an account…</option>
            {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </>
      )}

      {!isTransfer && (
        <>
          <label className="fin-txn-label">Category</label>
          <button type="button" className="fin-txn-cat-btn" onClick={() => setShowPick(!showPick)}>
            {catColor && <span className="fin-txn-cat-dot" style={{ background: catColor }} />}
            <span>{catName}</span>
          </button>
          {showPick && (
            <CategoryPicker cats={cats} value={categoryId} inboxColor="slate"
              onPick={(id) => { setCategoryId(id); setShowPick(false) }}
              onCreate={onCreateCategory} />
          )}
        </>
      )}

      <input className="fin-form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />

      <div className="fin-form-actions">
        <button type="submit" className="fin-form-save" disabled={busy || !amount || !accountId || (isTransfer && !transferTo)}>
          {editing ? 'Save' : 'Add'}
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
