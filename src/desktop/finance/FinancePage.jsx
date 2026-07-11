import { useCallback, useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import SplitPane from '../kit/SplitPane'
import Toast from '../kit/Toast'
import AccountList from './AccountList'
import AccountDetail from './AccountDetail'
import AccountForm from './AccountForm'
import Ledger from './Ledger'
import RecurringScreen from './RecurringScreen'
import BudgetsScreen from './BudgetsScreen'
import { listAccounts, listArchivedAccounts, createAccount, updateAccount, archiveAccount, restoreAccount } from './financeData'
import './finance.css'

// FinancePage — the Finance pillar shell. Zero accounts → empty-state invite.
// ≥1 account → sub-view: 'ledger' (default) or 'accounts' (Piece 3's screen).
// Mirrors HealthHub's sub-state pattern exactly.
export default function FinancePage() {
  const [accounts, setAccounts] = useState(null) // null = loading
  const [sub, setSub] = useState('ledger') // 'ledger' | 'accounts' | 'recurring' | 'budgets'
  const [selectedId, setSelectedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [archived, setArchived] = useState([])

  const load = useCallback(async () => {
    try {
      const a = await listAccounts()
      setAccounts(a)
    } catch (e) {
      console.error('Finance load:', e)
      setAccounts([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(fields) {
    const created = await createAccount(fields)
    await load()
    if (created?.id) setSelectedId(created.id)
  }

  async function handleUpdate(id, fields) {
    await updateAccount(id, fields)
    await load()
  }

  async function handleArchive(id, name) {
    await archiveAccount(id)
    setSelectedId(null)
    await load()
    setToast({ text: `Archived ${name}`, onUndo: async () => {
      setToast(null)
      await restoreAccount(id)
      await load()
    } })
  }

  async function handleToggleArchived() {
    if (showArchived) { setShowArchived(false); return }
    const a = await listArchivedAccounts()
    setArchived(a)
    setShowArchived(true)
  }

  async function handleRestore(id) {
    await restoreAccount(id)
    setArchived((prev) => prev.filter((a) => a.id !== id))
    await load()
    if (archived.length <= 1) setShowArchived(false)
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (accounts === null) {
    return (
      <div className="finance-page">
        <p className="fin-loading">Loading…</p>
      </div>
    )
  }

  // ── Empty state (zero accounts) ─────────────────────────────────────────
  if (accounts.length === 0 && !showArchived) {
    return (
      <div className="finance-page">
        <div className="fin-header">
          <SmallCapsLabel>Finance</SmallCapsLabel>
          <HairlineRule />
        </div>
        <FinanceEmpty onCreate={handleCreate} />
        {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
      </div>
    )
  }

  // ── Ledger (default landing) ────────────────────────────────────────────
  if (sub === 'ledger') {
    return (
      <div className="finance-page">
        <Ledger accounts={accounts} onNavigateAccounts={() => setSub('accounts')} onNavigateRecurring={() => setSub('recurring')} onNavigateBudgets={() => setSub('budgets')} />
        {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
      </div>
    )
  }

  // ── Recurring bills ──────────────────────────────────────────────────────
  if (sub === 'recurring') {
    return (
      <div className="finance-page">
        <RecurringScreen accounts={accounts} onBack={() => setSub('ledger')} />
      </div>
    )
  }

  // ── Budgets ─────────────────────────────────────────────────────────────
  if (sub === 'budgets') {
    return (
      <div className="finance-page">
        <BudgetsScreen onBack={() => setSub('ledger')} />
      </div>
    )
  }

  // ── Accounts screen ─────────────────────────────────────────────────────
  const selected = accounts.find((a) => a.id === selectedId)

  return (
    <div className="finance-page">
      <div className="fin-header">
        <div className="fin-header-top">
          <SmallCapsLabel>Accounts</SmallCapsLabel>
          <button className="fin-ledger-accts-link" onClick={() => setSub('ledger')}>← Ledger</button>
        </div>
        <HairlineRule />
      </div>
      <SplitPane
        left={
          <AccountList
            accounts={accounts}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={handleCreate}
            archived={archived}
            showArchived={showArchived}
            onToggleArchived={handleToggleArchived}
            onRestore={handleRestore}
          />
        }
        right={
          selected ? (
            <AccountDetail account={selected} onUpdate={handleUpdate} onArchive={handleArchive} />
          ) : (
            <div className="fin-rest">
              <p className="fin-rest-text">Pick an account, or add your first one.</p>
            </div>
          )
        }
      />
      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// The warm empty-state invite — mirrors Rolodex's first-run style.
function FinanceEmpty({ onCreate }) {
  const [adding, setAdding] = useState(false)

  if (adding) {
    return (
      <div className="fin-empty-form">
        <AccountForm initial={null} onSave={async (f) => { await onCreate(f); setAdding(false) }} onCancel={() => setAdding(false)} />
      </div>
    )
  }

  return (
    <div className="fin-empty">
      <p className="fin-empty-lead">No accounts yet.</p>
      <p className="fin-empty-hint">Add your first account to start tracking your money.</p>
      <button className="fin-empty-add" onClick={() => setAdding(true)}>+ Add your first account</button>
    </div>
  )
}
