import { useCallback, useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import Toast from '../kit/Toast'
import RecurringBillForm from './RecurringBillForm'
import RecurringBillCard from './RecurringBillCard'
import { listCategories } from './financeData'
import { listRecurringBills } from './financeRecurringData'
import { todayYMD } from './ledgerRange'
import './financeRecurring.css'

// RecurringScreen — the list of active recurring bills (target_kind='transaction'
// recipes). Each shows description, amount, frequency, account, category, and the
// next 3 upcoming occurrences. "+ New recurring bill" opens the setup form.

export default function RecurringScreen({ accounts, onBack }) {
  const [bills, setBills] = useState(null)
  const [cats, setCats] = useState([])
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState(null)

  const acctMap = new Map(accounts.map((a) => [a.id, a]))

  const load = useCallback(async () => {
    const [b, c] = await Promise.all([listRecurringBills(), listCategories()])
    setBills(b)
    setCats(c)
  }, [])

  useEffect(() => { load() }, [load])

  const catMap = new Map(cats.map((c) => [c.id, c]))
  const today = todayYMD()

  return (
    <div className="fin-recurring">
      <div className="fin-recurring-head">
        <SmallCapsLabel>Recurring</SmallCapsLabel>
        <button className="fin-ledger-accts-link" onClick={onBack}>← Ledger</button>
      </div>
      <HairlineRule />

      {adding ? (
        <div className="fin-recurring-form-wrap">
          <RecurringBillForm
            accounts={accounts}
            cats={cats}
            onCreated={() => { setAdding(false); load() }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button className="fin-add-btn" onClick={() => setAdding(true)}>+ New recurring bill</button>
      )}

      {bills === null ? (
        <p className="fin-loading">Loading…</p>
      ) : bills.length === 0 ? (
        <p className="fin-recurring-empty">No recurring bills yet.</p>
      ) : (
        <div className="fin-recurring-list">
          {bills.map((b) => (
            <RecurringBillCard
              key={b.id}
              bill={b}
              accountName={acctMap.get(b.account_id)?.name || '?'}
              categoryName={catMap.get(b.category_id)?.name}
              categoryColor={catMap.get(b.category_id)?.color}
              today={today}
              accounts={accounts}
              cats={cats}
              onChanged={load}
              setToast={setToast}
            />
          ))}
        </div>
      )}

      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  )
}
