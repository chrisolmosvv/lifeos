import { useCallback, useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import Toast from '../kit/Toast'
import LedgerRow from './LedgerRow'
import TransactionForm from './TransactionForm'
import { listTransactions, createTransaction, createTransfer, updateTransaction, fetchTransaction, softDeleteTransaction, restoreTransaction, listCategories, createCategory } from './financeData'
import './financeLedger.css'

// Ledger — the day-grouped transaction list (Piece 4a+4b). Fetches this
// calendar month (range switcher comes in 4c). Edit inline, delete with Toast
// undo, transfer-pair-aware on both operations.

const LAST_ACCT_KEY = 'lifeos.finance.lastAccount'

function monthRange() {
  const d = new Date()
  const y = d.getFullYear(), m = d.getMonth()
  const p = (n) => String(n).padStart(2, '0')
  return { from: `${y}-${p(m + 1)}-01`, to: `${y}-${p(m + 1)}-${new Date(y, m + 1, 0).getDate()}` }
}

function groupByDay(txns) {
  const map = new Map()
  for (const t of txns) {
    const day = t.entry_date
    if (!map.has(day)) map.set(day, [])
    map.get(day).push(t)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function fmtDayLabel(ymd) {
  try {
    return new Date(ymd + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return ymd }
}

function lastAccount(accounts) {
  try {
    const id = localStorage.getItem(LAST_ACCT_KEY)
    if (id && accounts.some((a) => a.id === id)) return id
  } catch { /* */ }
  return accounts[0]?.id || ''
}
function saveLastAccount(id) {
  try { localStorage.setItem(LAST_ACCT_KEY, id) } catch { /* */ }
}

export default function Ledger({ accounts, onNavigateAccounts }) {
  const [txns, setTxns] = useState(null)
  const [cats, setCats] = useState([])
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editInitial, setEditInitial] = useState(null)
  const [toast, setToast] = useState(null)

  const acctMap = new Map(accounts.map((a) => [a.id, a]))
  const catMap = new Map(cats.map((c) => [c.id, c]))

  const load = useCallback(async () => {
    const { from, to } = monthRange()
    const [t, c] = await Promise.all([listTransactions(from, to), listCategories()])
    setTxns(t)
    setCats(c)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Create ──────────────────────────────────────────────────────────────
  async function handleSave(fields) {
    saveLastAccount(fields.account_id)
    if (fields.txn_type === 'transfer') {
      await createTransfer({
        account_id: fields.account_id,
        transfer_account_id: fields.transfer_account_id,
        entry_date: fields.entry_date, amount: fields.amount,
        description: fields.description,
      })
    } else {
      const signedAmt = fields.txn_type === 'expense' ? -Math.abs(fields.amount) : Math.abs(fields.amount)
      await createTransaction({
        account_id: fields.account_id, entry_date: fields.entry_date,
        amount: signedAmt, txn_type: fields.txn_type,
        category_id: fields.category_id, description: fields.description, source: 'manual',
      })
    }
    setAdding(false)
    await load()
  }

  // ── Edit ────────────────────────────────────────────────────────────────
  async function openEdit(id) {
    if (editingId === id) { setEditingId(null); setEditInitial(null); return }
    const txn = txns.find((t) => t.id === id)
    if (!txn) return
    // For transfers, load the paired row so the form can show both accounts
    if (txn.txn_type === 'transfer' && txn.paired_transaction_id) {
      try {
        const pair = await fetchTransaction(txn.paired_transaction_id)
        setEditInitial({ ...txn, _pair: pair })
      } catch { setEditInitial(txn) }
    } else {
      setEditInitial(txn)
    }
    setEditingId(id)
  }

  async function handleEdit(fields) {
    const txn = editInitial
    if (txn.txn_type === 'transfer') {
      // Update both legs: date, amount (signed correctly), description
      const abs = Math.abs(fields.amount)
      const isSource = Number(txn.amount) < 0
      await updateTransaction(txn.id, {
        entry_date: fields.entry_date, amount: isSource ? -abs : abs,
        description: fields.description,
      })
      if (txn.paired_transaction_id) {
        await updateTransaction(txn.paired_transaction_id, {
          entry_date: fields.entry_date, amount: isSource ? abs : -abs,
          description: fields.description,
        })
      }
    } else {
      const signedAmt = fields.txn_type === 'expense' ? -Math.abs(fields.amount) : Math.abs(fields.amount)
      await updateTransaction(txn.id, {
        entry_date: fields.entry_date, amount: signedAmt,
        category_id: fields.category_id, description: fields.description,
      })
    }
    setEditingId(null)
    setEditInitial(null)
    await load()
  }

  // ── Delete (soft) + Undo ────────────────────────────────────────────────
  async function handleDelete(txn) {
    const ids = await softDeleteTransaction(txn.id, txn.paired_transaction_id)
    setEditingId(null)
    setEditInitial(null)
    await load()
    setToast({
      text: `Deleted ${txn.description || 'transaction'}`,
      onUndo: async () => {
        setToast(null)
        await restoreTransaction(ids)
        await load()
      },
    })
  }

  async function handleCreateCategory(name) {
    const created = await createCategory(name)
    const fresh = await listCategories()
    setCats(fresh)
    return created
  }

  const days = txns ? groupByDay(txns) : []

  return (
    <div className="fin-ledger">
      <div className="fin-ledger-head">
        <SmallCapsLabel>Finance</SmallCapsLabel>
        <button className="fin-ledger-accts-link" onClick={onNavigateAccounts}>Accounts</button>
      </div>
      <HairlineRule />

      {adding ? (
        <div className="fin-ledger-form-wrap">
          <TransactionForm
            accounts={accounts} cats={cats}
            defaultAccountId={lastAccount(accounts)}
            onSave={handleSave}
            onCreateCategory={handleCreateCategory}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button className="fin-add-btn" onClick={() => { setAdding(true); setEditingId(null) }}>+ Add transaction</button>
      )}

      {txns === null ? (
        <p className="fin-loading">Loading…</p>
      ) : days.length === 0 ? (
        <p className="fin-ledger-empty">No transactions this month.</p>
      ) : (
        <div className="fin-ledger-days">
          {days.map(([day, rows]) => (
            <div className="fin-ledger-day" key={day}>
              <p className="fin-ledger-day-label">{fmtDayLabel(day)}</p>
              {rows.map((t) => {
                const acct = acctMap.get(t.account_id)
                const cat = catMap.get(t.category_id)
                if (editingId === t.id && editInitial) {
                  return (
                    <div className="fin-ledger-form-wrap" key={t.id}>
                      <TransactionForm
                        accounts={accounts} cats={cats}
                        initial={editInitial}
                        onSave={handleEdit}
                        onCreateCategory={handleCreateCategory}
                        onCancel={() => { setEditingId(null); setEditInitial(null) }}
                      />
                      <button className="fin-ledger-delete" onClick={() => handleDelete(t)}>Delete</button>
                    </div>
                  )
                }
                return (
                  <LedgerRow key={t.id} txn={t}
                    accountName={acct?.name || '?'}
                    categoryName={cat?.name}
                    categoryColor={cat?.color}
                    isSelected={editingId === t.id}
                    onSelect={openEdit} />
                )
              })}
            </div>
          ))}
        </div>
      )}

      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  )
}
