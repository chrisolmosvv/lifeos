import { useState } from 'react'

// AccountForm — type-first create/edit form for a finance account.
// Create: type toggle (cash/investment) → name → institution → starting_balance (cash only).
// Edit: same fields but type is locked (can't change cash↔investment after creation).
// Props: initial (null = create), onSave({ name, account_type, institution, starting_balance }),
//        onCancel.
export default function AccountForm({ initial, onSave, onCancel }) {
  const editing = !!initial
  const [type, setType] = useState(initial?.account_type || 'cash')
  const [name, setName] = useState(initial?.name || '')
  const [institution, setInstitution] = useState(initial?.institution || '')
  const [balance, setBalance] = useState(initial?.starting_balance ?? '')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onSave({
        name: name.trim(),
        account_type: type,
        institution: institution.trim() || null,
        starting_balance: type === 'cash' ? (parseFloat(balance) || 0) : 0,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="fin-form" onSubmit={handleSubmit}>
      {!editing && (
        <div className="fin-form-types">
          <button type="button" className={'fin-form-type' + (type === 'cash' ? ' is-on' : '')} onClick={() => setType('cash')}>Cash</button>
          <button type="button" className={'fin-form-type' + (type === 'investment' ? ' is-on' : '')} onClick={() => setType('investment')}>Investment</button>
        </div>
      )}
      {editing && (
        <p className="fin-form-hint">{type === 'cash' ? 'Cash account' : 'Investment account'}</p>
      )}
      <input
        className="fin-form-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Account name"
        autoFocus
      />
      <input
        className="fin-form-input"
        value={institution}
        onChange={(e) => setInstitution(e.target.value)}
        placeholder="Institution (optional)"
      />
      {type === 'cash' && (
        <input
          className="fin-form-input fin-form-num"
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="Starting balance (€)"
        />
      )}
      <div className="fin-form-actions">
        <button type="submit" className="fin-form-save" disabled={busy || !name.trim()}>
          {editing ? 'Save' : 'Add account'}
        </button>
        <button type="button" className="fin-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
