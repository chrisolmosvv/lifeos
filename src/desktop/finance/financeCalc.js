// LifeOS — Finance calc layer (Piece 8a). Pure functions — no React, no Supabase.
// Takes already-fetched rows and returns computed series for the chart components.

const pad = (n) => String(n).padStart(2, '0')
const ymdOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// All calendar dates from `from` to `to` inclusive, as YYYY-MM-DD strings.
function datesBetween(from, to) {
  const out = []
  const d = new Date(from + 'T12:00:00Z')
  const end = new Date(to + 'T12:00:00Z')
  while (d <= end) {
    out.push(ymdOf(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

// ── Net worth by day (combined) ─────────────────────────────────────────────
// Cash: running balance = starting_balance + cumulative transaction sum.
// Investment: most recent snapshot value on or before each day (step function).
// Ruling 1: exclude any account for dates before its created_at; exclude
// investment accounts before their first snapshot.

export function netWorthByDay(transactions, snapshots, accounts, from, to) {
  const days = datesBetween(from, to)
  if (!days.length) return []

  const cashAccounts = accounts.filter((a) => a.account_type === 'cash')
  const investAccounts = accounts.filter((a) => a.account_type === 'investment')

  // Cash: build running balance per account per day.
  const cashByDay = buildCashBalancesByDay(transactions, cashAccounts, days)

  // Investment: step-function per account per day.
  const investByDay = buildInvestmentValuesByDay(snapshots, investAccounts, days)

  // Only include days where at least one account contributes (trim leading zeros
  // from before any account existed — avoids a long flat-at-zero stretch).
  const raw = days.map((day) => ({
    date: day,
    value: (cashByDay.get(day) || 0) + (investByDay.get(day) || 0),
    hasData: cashByDay.has(day) || investByDay.has(day),
  }))
  const firstIdx = raw.findIndex((p) => p.hasData)
  if (firstIdx < 0) return []
  return raw.slice(firstIdx).map(({ date, value }) => ({ date, value }))
}

// ── Net worth for a single account ──────────────────────────────────────────
export function netWorthByDayForAccount(transactions, snapshots, account, from, to) {
  const days = datesBetween(from, to)
  if (!days.length) return []

  const byDay = account.account_type === 'cash'
    ? buildCashBalancesByDay(transactions, [account], days)
    : buildInvestmentValuesByDay(snapshots, [account], days)

  // Trim leading days before the account contributed.
  const raw = days.map((day) => ({ date: day, value: byDay.get(day) || 0, hasData: byDay.has(day) }))
  const firstIdx = raw.findIndex((p) => p.hasData)
  if (firstIdx < 0) return []
  return raw.slice(firstIdx).map(({ date, value }) => ({ date, value }))
}

// ── Net worth split: cash vs investment ─────────────────────────────────────
export function netWorthSplitCashVsInvestment(transactions, snapshots, accounts, from, to) {
  const days = datesBetween(from, to)
  if (!days.length) return { cash: [], investment: [] }

  const cashAccounts = accounts.filter((a) => a.account_type === 'cash')
  const investAccounts = accounts.filter((a) => a.account_type === 'investment')

  const cashByDay = buildCashBalancesByDay(transactions, cashAccounts, days)
  const investByDay = buildInvestmentValuesByDay(snapshots, investAccounts, days)

  // Trim: start from the first day ANY account contributes.
  const firstIdx = days.findIndex((day) => cashByDay.has(day) || investByDay.has(day))
  if (firstIdx < 0) return { cash: [], investment: [] }
  const trimmed = days.slice(firstIdx)

  return {
    cash: trimmed.map((day) => ({ date: day, value: cashByDay.get(day) || 0 })),
    investment: trimmed.map((day) => ({ date: day, value: investByDay.get(day) || 0 })),
  }
}

// ── Internal: cash running balance per day ──────────────────────────────────
function buildCashBalancesByDay(transactions, cashAccounts, days) {
  const result = new Map() // day → total cash balance across all accounts

  for (const acct of cashAccounts) {
    const createdDay = acct.created_at ? acct.created_at.slice(0, 10) : days[0]
    const acctTxns = transactions
      .filter((t) => t.account_id === acct.id)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))

    let balance = Number(acct.starting_balance) || 0
    let txIdx = 0

    for (const day of days) {
      if (day < createdDay) continue // ruling 1: exclude before account existed
      // Add all transactions on or before this day that haven't been counted yet.
      while (txIdx < acctTxns.length && acctTxns[txIdx].entry_date <= day) {
        balance += Number(acctTxns[txIdx].amount)
        txIdx++
      }
      result.set(day, (result.get(day) || 0) + balance)
    }
  }

  return result
}

// ── Internal: investment step-function per day ──────────────────────────────
function buildInvestmentValuesByDay(snapshots, investAccounts, days) {
  const result = new Map()

  for (const acct of investAccounts) {
    const acctSnaps = snapshots
      .filter((s) => s.account_id === acct.id)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))

    if (!acctSnaps.length) continue // ruling 1: no snapshots → exclude entirely

    const firstSnapDay = acctSnaps[0].snapshot_date
    let snapIdx = 0
    let currentValue = 0

    for (const day of days) {
      if (day < firstSnapDay) continue // ruling 1: exclude before first snapshot
      // Advance to the most recent snapshot on or before this day.
      while (snapIdx < acctSnaps.length - 1 && acctSnaps[snapIdx + 1].snapshot_date <= day) {
        snapIdx++
      }
      currentValue = Number(acctSnaps[snapIdx].value)
      result.set(day, (result.get(day) || 0) + currentValue)
    }
  }

  return result
}
