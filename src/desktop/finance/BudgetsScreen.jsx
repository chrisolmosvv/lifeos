import { useCallback, useEffect, useRef, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import Popover from '../kit/Popover'
import CategoryPicker from '../kit/CategoryPicker'
import { listBudgets, setBudget, thisMonthSpendByCategory } from './budgetData'
import { listCategories, createCategory } from './financeData'
import { fetchAllTransactions } from './financeTrendsData'
import { averageSpendBaseline } from './financeCalcSpend'
import { amsTodayYMD, shiftYMD } from '../../spine/logic/gymDates'
import './financeBudgets.css'

// BudgetsScreen — per-category monthly limits + spend bars (Piece 7a+7b).
// Append-only writes. Brick bar ONLY when spend STRICTLY EXCEEDS the limit
// (exactly 100% is NOT brick — per the locked spec).

function monthBounds() {
  const today = amsTodayYMD()
  const y = parseInt(today.slice(0, 4), 10)
  const m = parseInt(today.slice(5, 7), 10)
  const p = (n) => String(n).padStart(2, '0')
  const last = new Date(y, m, 0).getDate()
  return { from: `${y}-${p(m)}-01`, to: `${y}-${p(m)}-${p(last)}` }
}

export default function BudgetsScreen({ onBack }) {
  const [budgets, setBudgets] = useState(null)
  const [cats, setCats] = useState([])
  const [spend, setSpend] = useState(new Map()) // category_id → total expense (positive)
  const [baselines, setBaselines] = useState(new Map()) // category_id → avg monthly spend
  const [adding, setAdding] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [editVal, setEditVal] = useState('')
  const editRef = useRef(null)

  const catMap = new Map(cats.map((c) => [c.id, c]))

  const load = useCallback(async () => {
    const { from, to } = monthBounds()
    const today = amsTodayYMD()
    const histFrom = shiftYMD(today, -183) // ~6 months back for baseline
    const [b, c, s, histTxns] = await Promise.all([
      listBudgets(), listCategories(), thisMonthSpendByCategory(from, to),
      fetchAllTransactions(histFrom, today),
    ])
    setBudgets(b)
    setCats(c)
    setSpend(s)
    // Compute baselines for all budgeted categories.
    const bl = new Map()
    for (const budget of b) {
      const avg = averageSpendBaseline(histTxns, budget.category_id)
      if (avg != null) bl.set(budget.category_id, avg)
    }
    setBaselines(bl)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSet(categoryId, amount) {
    await setBudget(categoryId, amount)
    await load()
  }

  function openEdit(catId, currentLimit) { setEditCat(catId); setEditVal(String(currentLimit)) }
  async function submitEdit() {
    const amt = parseFloat(editVal)
    if (!amt || amt <= 0 || !editCat) return
    await handleSet(editCat, amt)
    setEditCat(null)
  }

  // "Everything else": total expense spend in categories WITHOUT a live budget + null-category.
  const budgetedCatIds = new Set((budgets || []).map((b) => b.category_id))
  let elseTotal = 0
  for (const [catId, total] of spend) {
    if (!budgetedCatIds.has(catId)) elseTotal += total
  }

  return (
    <div className="fin-budgets">
      <div className="fin-budgets-head">
        <SmallCapsLabel>Budgets</SmallCapsLabel>
        <button className="fin-ledger-accts-link" onClick={onBack}>← Ledger</button>
      </div>
      <HairlineRule />

      {adding ? (
        <BudgetSetForm cats={cats} existingCatIds={budgetedCatIds} onSet={async (catId, amt) => { await handleSet(catId, amt); setAdding(false) }} onCancel={() => setAdding(false)} />
      ) : (
        <button className="fin-add-btn" onClick={() => setAdding(true)}>+ Set a budget</button>
      )}

      {budgets === null ? (
        <p className="fin-loading">Loading…</p>
      ) : budgets.length === 0 ? (
        <p className="fin-budgets-empty">No budgets set yet. Pick a category and set a monthly limit.</p>
      ) : (
        <>
          <div className="fin-budgets-list">
            {budgets.map((b) => {
              const cat = catMap.get(b.category_id)
              const spent = spend.get(b.category_id) || 0
              const limit = Number(b.monthly_limit)
              const pct = limit > 0 ? (spent / limit) * 100 : 0
              // Strictly OVER the limit = brick. Exactly at 100% = NOT brick.
              const isOver = spent > limit && limit > 0
              return (
                <div className="fin-budget-row" key={b.category_id}>
                  <button className="fin-budget-label" ref={editCat === b.category_id ? editRef : null} onClick={() => openEdit(b.category_id, b.monthly_limit)}>
                    <span className="fin-budget-name">{cat?.name || 'Unknown'}</span>
                    <span className="fin-budget-limit tnum">€{fmtAmt(b.monthly_limit)}</span>
                  </button>
                  <div className="fin-budget-bar-wrap">
                    <div className="fin-budget-bar">
                      <span className={'fin-budget-bar-fill' + (isOver ? ' is-over' : '')} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className={'fin-budget-spend' + (isOver ? ' is-over' : '')}>
                      €{fmtAmt(spent)} of €{fmtAmt(limit)}{isOver ? ' — over budget' : ''}
                    </p>
                    {baselines.has(b.category_id) && (
                      <p className="fin-budget-baseline">typically €{fmtAmt(baselines.get(b.category_id))}/month</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="fin-budget-else">
            <span className="fin-budget-else-label">Everything else</span>
            <span className="fin-budget-else-amt tnum">€{fmtAmt(elseTotal)}</span>
          </div>
        </>
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
