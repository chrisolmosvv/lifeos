import { useCallback, useEffect, useRef, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import Popover from '../kit/Popover'
import CategoryPicker from '../kit/CategoryPicker'
import { listBudgets, setBudget } from './budgetData'
import { listCategories, createCategory } from './financeData'
import './financeBudgets.css'

// BudgetsScreen — per-category monthly limits (Piece 7a). Append-only writes:
// editing a limit inserts a new finance_budgets row (never an update). No clear/
// remove UI — budgets can only be changed, not deleted, per spec.

export default function BudgetsScreen({ onBack }) {
  const [budgets, setBudgets] = useState(null)
  const [cats, setCats] = useState([])
  const [adding, setAdding] = useState(false)
  const [editCat, setEditCat] = useState(null) // category_id being edited
  const [editVal, setEditVal] = useState('')
  const editRef = useRef(null)

  const catMap = new Map(cats.map((c) => [c.id, c]))

  const load = useCallback(async () => {
    const [b, c] = await Promise.all([listBudgets(), listCategories()])
    setBudgets(b)
    setCats(c)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSet(categoryId, amount) {
    await setBudget(categoryId, amount)
    await load()
  }

  function openEdit(catId, currentLimit) {
    setEditCat(catId)
    setEditVal(String(currentLimit))
  }

  async function submitEdit() {
    const amt = parseFloat(editVal)
    if (!amt || amt <= 0 || !editCat) return
    await handleSet(editCat, amt)
    setEditCat(null)
  }

  return (
    <div className="fin-budgets">
      <div className="fin-budgets-head">
        <SmallCapsLabel>Budgets</SmallCapsLabel>
        <button className="fin-ledger-accts-link" onClick={onBack}>← Ledger</button>
      </div>
      <HairlineRule />

      {adding ? (
        <BudgetSetForm cats={cats} existingCatIds={new Set((budgets || []).map((b) => b.category_id))} onSet={async (catId, amt) => { await handleSet(catId, amt); setAdding(false) }} onCancel={() => setAdding(false)} />
      ) : (
        <button className="fin-add-btn" onClick={() => setAdding(true)}>+ Set a budget</button>
      )}

      {budgets === null ? (
        <p className="fin-loading">Loading…</p>
      ) : budgets.length === 0 ? (
        <p className="fin-budgets-empty">No budgets set yet. Pick a category and set a monthly limit.</p>
      ) : (
        <div className="fin-budgets-list">
          {budgets.map((b) => {
            const cat = catMap.get(b.category_id)
            return (
              <div className="fin-budget-row" key={b.category_id}>
                <button className="fin-budget-label" ref={editCat === b.category_id ? editRef : null} onClick={() => openEdit(b.category_id, b.monthly_limit)}>
                  <span className="fin-budget-name">{cat?.name || 'Unknown'}</span>
                  <span className="fin-budget-limit tnum">€{fmtAmt(b.monthly_limit)}</span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {editCat && (
        <Popover anchorRef={editRef} title="Edit limit" onClose={() => setEditCat(null)}>
          <form className="fin-budget-edit" onSubmit={(e) => { e.preventDefault(); submitEdit() }}>
            <input className="fin-form-input fin-form-num" type="number" step="0.01" min="0.01" value={editVal} onChange={(e) => setEditVal(e.target.value)} autoFocus />
            <div className="fin-form-actions">
              <button type="submit" className="fin-form-save" disabled={!editVal || parseFloat(editVal) <= 0}>Save</button>
              <button type="button" className="fin-form-cancel" onClick={() => setEditCat(null)}>Cancel</button>
            </div>
          </form>
        </Popover>
      )}
    </div>
  )
}

// Mini-form: pick a category + enter amount.
function BudgetSetForm({ cats, existingCatIds, onSet, onCancel }) {
  const [catId, setCatId] = useState(null)
  const [amount, setAmount] = useState('')
  const [showPick, setShowPick] = useState(true)
  const [localCats, setLocalCats] = useState(cats)

  async function handleCreateCategory(name) {
    const created = await createCategory(name)
    setLocalCats((prev) => [...prev, created])
    setCatId(created.id)
    setShowPick(false)
  }

  if (showPick && !catId) {
    return (
      <div className="fin-budget-set">
        <p className="fin-form-hint">Pick a category to budget</p>
        <CategoryPicker cats={localCats} value={catId} inboxColor="slate" onPick={(id) => { setCatId(id); setShowPick(false) }} onCreate={handleCreateCategory} />
        <button className="fin-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    )
  }

  const catName = catId ? (localCats.find((c) => c.id === catId)?.name || 'Category') : 'Inbox'

  return (
    <div className="fin-budget-set">
      <p className="fin-form-hint">Budget for {catName}</p>
      <input className="fin-form-input fin-form-num" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monthly limit (€)" autoFocus />
      <div className="fin-form-actions">
        <button className="fin-form-save" disabled={!amount || parseFloat(amount) <= 0} onClick={() => onSet(catId, parseFloat(amount))}>Set budget</button>
        <button className="fin-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function fmtAmt(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
}
