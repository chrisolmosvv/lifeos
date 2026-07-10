import { useCallback, useEffect, useState } from 'react'
import HairlineRule from '../kit/HairlineRule'
import RangeSwitcher from '../kit/RangeSwitcher'
import Toast from '../kit/Toast'
import LedgerRow from './LedgerRow'
import TransactionForm from './TransactionForm'
import { dateRange, rangeLabel, isCurrentPeriod } from './ledgerRange'
import { listTransactions, createTransaction, createTransfer, updateTransaction, fetchTransaction, softDeleteTransaction, restoreTransaction, listCategories, createCategory } from './financeData'
import './financeLedger.css'
import './financeLedgerFilters.css'

// Ledger — the day-grouped transaction list (Piece 4c). Range switcher
// (Month/Quarter/Year) + prev/next arrows + inline filters (account/category/
// type) + text search. Filters are client-side over the fetched range data.

const RANGES = [
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
]
const LAST_ACCT_KEY = 'lifeos.finance.lastAccount'

function groupByDay(txns) {
  const map = new Map()
  for (const t of txns) {
    if (!map.has(t.entry_date)) map.set(t.entry_date, [])
    map.get(t.entry_date).push(t)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}
function fmtDayLabel(ymd) {
  try { return new Date(ymd + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return ymd }
}
function lastAccount(accounts) {
  try { const id = localStorage.getItem(LAST_ACCT_KEY); if (id && accounts.some((a) => a.id === id)) return id } catch { /* */ }
  return accounts[0]?.id || ''
}
function saveLastAccount(id) { try { localStorage.setItem(LAST_ACCT_KEY, id) } catch { /* */ } }

export default function Ledger({ accounts, onNavigateAccounts }) {
  const [txns, setTxns] = useState(null)
  const [cats, setCats] = useState([])
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editInitial, setEditInitial] = useState(null)
  const [toast, setToast] = useState(null)

  // Range state
  const [rangeUnit, setRangeUnit] = useState('month')
  const [rangeOffset, setRangeOffset] = useState(0)

  // Filter state (client-side)
  const [filterAcct, setFilterAcct] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')

  const acctMap = new Map(accounts.map((a) => [a.id, a]))
  const catMap = new Map(cats.map((c) => [c.id, c]))

  const load = useCallback(async () => {
    const { from, to } = dateRange(rangeUnit, rangeOffset)
    const [t, c] = await Promise.all([listTransactions(from, to), listCategories()])
    setTxns(t)
    setCats(c)
  }, [rangeUnit, rangeOffset])

  useEffect(() => { load() }, [load])

  function changeRange(unit) { setRangeUnit(unit); setRangeOffset(0) }

  // ── Client-side filtering ──────────────────────────────────────────────
  function filtered() {
    if (!txns) return null
    let list = txns
    if (filterAcct) list = list.filter((t) => t.account_id === filterAcct)
    if (filterCat) list = list.filter((t) => t.category_id === filterCat)
    if (filterType) list = list.filter((t) => t.txn_type === filterType)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((t) => (t.description || '').toLowerCase().includes(q))
    }
    return list
  }
  const hasFilters = filterAcct || filterCat || filterType || search.trim()
  function clearFilters() { setFilterAcct(''); setFilterCat(''); setFilterType(''); setSearch('') }

  // ── Create ──────────────────────────────────────────────────────────────
  async function handleSave(fields) {
    saveLastAccount(fields.account_id)
    if (fields.txn_type === 'transfer') {
      await createTransfer({ account_id: fields.account_id, transfer_account_id: fields.transfer_account_id, entry_date: fields.entry_date, amount: fields.amount, description: fields.description })
    } else {
      const signedAmt = fields.txn_type === 'expense' ? -Math.abs(fields.amount) : Math.abs(fields.amount)
      await createTransaction({ account_id: fields.account_id, entry_date: fields.entry_date, amount: signedAmt, txn_type: fields.txn_type, category_id: fields.category_id, description: fields.description, source: 'manual' })
    }
    setAdding(false); await load()
  }

  // ── Edit ────────────────────────────────────────────────────────────────
  async function openEdit(id) {
    if (editingId === id) { setEditingId(null); setEditInitial(null); return }
    const txn = txns.find((t) => t.id === id)
    if (!txn) return
    if (txn.txn_type === 'transfer' && txn.paired_transaction_id) {
      try { const pair = await fetchTransaction(txn.paired_transaction_id); setEditInitial({ ...txn, _pair: pair }) }
      catch { setEditInitial(txn) }
    } else { setEditInitial(txn) }
    setEditingId(id)
  }
  async function handleEdit(fields) {
    const txn = editInitial
    if (txn.txn_type === 'transfer') {
      const abs = Math.abs(fields.amount); const isSource = Number(txn.amount) < 0
      await updateTransaction(txn.id, { entry_date: fields.entry_date, amount: isSource ? -abs : abs, description: fields.description })
      if (txn.paired_transaction_id) await updateTransaction(txn.paired_transaction_id, { entry_date: fields.entry_date, amount: isSource ? abs : -abs, description: fields.description })
    } else {
      const signedAmt = fields.txn_type === 'expense' ? -Math.abs(fields.amount) : Math.abs(fields.amount)
      await updateTransaction(txn.id, { entry_date: fields.entry_date, amount: signedAmt, category_id: fields.category_id, description: fields.description })
    }
    setEditingId(null); setEditInitial(null); await load()
  }

  // ── Delete (soft) + Undo ────────────────────────────────────────────────
  async function handleDelete(txn) {
    const ids = await softDeleteTransaction(txn.id, txn.paired_transaction_id)
    setEditingId(null); setEditInitial(null); await load()
    setToast({ text: `Deleted ${txn.description || 'transaction'}`, onUndo: async () => { setToast(null); await restoreTransaction(ids); await load() } })
  }

  async function handleCreateCategory(name) {
    const created = await createCategory(name); setCats(await listCategories()); return created
  }

  // ── Unique values for filter dropdowns ──────────────────────────────────
  const usedCatIds = txns ? [...new Set(txns.map((t) => t.category_id).filter(Boolean))] : []

  const vis = filtered()
  const days = vis ? groupByDay(vis) : []
  const label = rangeLabel(rangeUnit, rangeOffset)
  const atCurrent = isCurrentPeriod(rangeOffset)

  return (
    <div className="fin-ledger">
      {/* ── Masthead: arrows + label + range switcher + Accounts link ──── */}
      <div className="fin-ledger-head">
        <div className="fin-ledger-stepper">
          <button className="fin-ledger-step" onClick={() => setRangeOffset((o) => o - 1)} aria-label="Previous">‹</button>
          <button className="fin-ledger-step" onClick={() => setRangeOffset((o) => o + 1)} disabled={atCurrent} aria-label="Next">›</button>
          <span className="fin-ledger-label">{label}</span>
        </div>
        <div className="fin-ledger-right">
          <RangeSwitcher ranges={RANGES} value={rangeUnit} ariaLabel="Ledger range" onChange={changeRange} />
          <button className="fin-ledger-accts-link" onClick={onNavigateAccounts}>Accounts</button>
        </div>
      </div>
      <HairlineRule />

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="fin-filters">
        <select className="fin-filter" value={filterAcct} onChange={(e) => setFilterAcct(e.target.value)}>
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="fin-filter" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {usedCatIds.map((id) => <option key={id} value={id}>{catMap.get(id)?.name || id}</option>)}
        </select>
        <select className="fin-filter" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <input className="fin-filter fin-filter-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
        {hasFilters && <button className="fin-filter-clear" onClick={clearFilters}>Clear</button>}
      </div>

      {/* ── Add button ──────────────────────────────────────────────────── */}
      {adding ? (
        <div className="fin-ledger-form-wrap">
          <TransactionForm accounts={accounts} cats={cats} defaultAccountId={lastAccount(accounts)} onSave={handleSave} onCreateCategory={handleCreateCategory} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button className="fin-add-btn" onClick={() => { setAdding(true); setEditingId(null) }}>+ Add transaction</button>
      )}

      {/* ── Day-grouped rows ────────────────────────────────────────────── */}
      {vis === null ? (
        <p className="fin-loading">Loading…</p>
      ) : days.length === 0 ? (
        <p className="fin-ledger-empty">{hasFilters ? 'No matching transactions.' : `No transactions in ${label.toLowerCase()}.`}</p>
      ) : (
        <div className="fin-ledger-days">
          {days.map(([day, rows]) => (
            <div className="fin-ledger-day" key={day}>
              <p className="fin-ledger-day-label">{fmtDayLabel(day)}</p>
              {rows.map((t) => {
                const acct = acctMap.get(t.account_id); const cat = catMap.get(t.category_id)
                if (editingId === t.id && editInitial) {
                  return (
                    <div className="fin-ledger-form-wrap" key={t.id}>
                      <TransactionForm accounts={accounts} cats={cats} initial={editInitial} onSave={handleEdit} onCreateCategory={handleCreateCategory} onCancel={() => { setEditingId(null); setEditInitial(null) }} />
                      <button className="fin-ledger-delete" onClick={() => handleDelete(t)}>Delete</button>
                    </div>
                  )
                }
                return <LedgerRow key={t.id} txn={t} accountName={acct?.name || '?'} categoryName={cat?.name} categoryColor={cat?.color} isSelected={editingId === t.id} onSelect={openEdit} />
              })}
            </div>
          ))}
        </div>
      )}

      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  )
}
