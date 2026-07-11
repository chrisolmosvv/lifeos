// LifeOS — Finance calc: spending analysis (split from financeCalc.js, Pieces 8b+8c).
// Pure functions — no React, no Supabase.

const pad = (n) => String(n).padStart(2, '0')

// ── Spending by category by month ────────────────────────────────────────────
// Returns [{ month:'YYYY-MM', categories:[{ id, name, color, total }] }] sorted by month.
// Only expenses (txn_type='expense'), transfers excluded.
export function spendByCategoryByMonth(transactions, categories, from, to) {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const months = new Map()
  for (const t of transactions) {
    if (t.txn_type !== 'expense') continue
    if (t.entry_date < from || t.entry_date > to) continue
    const m = t.entry_date.slice(0, 7)
    if (!months.has(m)) months.set(m, new Map())
    const catId = t.category_id || '__none__'
    const buckets = months.get(m)
    buckets.set(catId, (buckets.get(catId) || 0) + Math.abs(Number(t.amount)))
  }
  return [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, buckets]) => ({
      month,
      categories: [...buckets.entries()].map(([id, total]) => {
        const cat = catMap.get(id)
        return { id, name: cat?.name || 'Uncategorised', color: cat?.color || null, total }
      }).sort((a, b) => b.total - a.total),
    }))
}

// ── Income vs expense by month ──────────────────────────────────────────────
export function incomeVsExpenseByMonth(transactions, from, to) {
  const months = new Map()
  for (const t of transactions) {
    if (t.txn_type === 'transfer') continue
    if (t.entry_date < from || t.entry_date > to) continue
    const m = t.entry_date.slice(0, 7)
    if (!months.has(m)) months.set(m, { income: 0, expense: 0 })
    const bucket = months.get(m)
    if (t.txn_type === 'income') bucket.income += Number(t.amount)
    else bucket.expense += Math.abs(Number(t.amount))
  }
  return [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, income: v.income, expense: v.expense }))
}

// ── Top N categories by total expense spend ─────────────────────────────────
export function topCategories(transactions, categories, from, to, n = 5) {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const totals = new Map()
  for (const t of transactions) {
    if (t.txn_type !== 'expense') continue
    if (t.entry_date < from || t.entry_date > to) continue
    const catId = t.category_id || '__none__'
    totals.set(catId, (totals.get(catId) || 0) + Math.abs(Number(t.amount)))
  }
  return [...totals.entries()]
    .map(([id, total]) => {
      const cat = catMap.get(id)
      return { id, name: cat?.name || 'Uncategorised', color: cat?.color || null, total }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
}

// ── Month-over-month category deltas ─────────────────────────────────────────
export function monthOverMonthDeltas(transactions, categories, currentMonth) {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const [y, m] = currentMonth.split('-').map(Number)
  const priorY = m === 1 ? y - 1 : y
  const priorM = m === 1 ? 12 : m - 1
  const priorMonth = `${priorY}-${pad(priorM)}`

  const cur = new Map(), pri = new Map()
  for (const t of transactions) {
    if (t.txn_type !== 'expense') continue
    const tm = t.entry_date.slice(0, 7)
    const catId = t.category_id || '__none__'
    const amt = Math.abs(Number(t.amount))
    if (tm === currentMonth) cur.set(catId, (cur.get(catId) || 0) + amt)
    else if (tm === priorMonth) pri.set(catId, (pri.get(catId) || 0) + amt)
  }

  const allCatIds = new Set([...cur.keys(), ...pri.keys()])
  return [...allCatIds].map((id) => {
    const cat = catMap.get(id)
    const current = cur.get(id) || 0
    const prior = pri.get(id) || 0
    return { id, name: cat?.name || 'Uncategorised', color: cat?.color || null, current, prior, delta: current - prior }
  }).filter((d) => d.current > 0 || d.prior > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

// ── Average spend baseline (trailing N months) ──────────────────────────────
export function averageSpendBaseline(transactions, categoryId, months = 6) {
  const now = new Date()
  const totals = []
  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mo = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    let total = 0
    for (const t of transactions) {
      if (t.txn_type !== 'expense') continue
      if ((t.category_id || '__none__') !== categoryId) continue
      if (t.entry_date.slice(0, 7) === mo) total += Math.abs(Number(t.amount))
    }
    totals.push(total)
  }
  const withSpend = totals.filter((t) => t > 0)
  if (!withSpend.length) return null
  return withSpend.reduce((s, v) => s + v, 0) / withSpend.length
}
