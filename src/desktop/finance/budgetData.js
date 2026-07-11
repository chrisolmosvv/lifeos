import { supabase } from '../../spine/data/supabaseClient'

// LifeOS — Finance budget queries (Piece 7). Append-only: the newest row per
// category_id is the live budget. Setting a new limit = inserting a new row.

export async function listBudgets() {
  const { data, error } = await supabase
    .from('finance_budgets')
    .select('id,category_id,monthly_limit,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  // Resolve: newest row per category_id wins.
  const live = new Map()
  for (const row of data || []) {
    if (!live.has(row.category_id)) live.set(row.category_id, row)
  }
  return [...live.values()]
}

export async function setBudget(categoryId, monthlyLimit) {
  const { data, error } = await supabase
    .from('finance_budgets')
    .insert({ category_id: categoryId, monthly_limit: monthlyLimit })
    .select('id,category_id,monthly_limit,created_at')
    .single()
  if (error) throw error
  return data
}

// This month's expense spend per category (for the budget-vs-actual bars).
// Returns Map<category_id, totalSpend> (spend is a positive number, not signed).
export async function thisMonthSpendByCategory(monthFrom, monthTo) {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('category_id,amount')
    .eq('txn_type', 'expense')
    .gte('entry_date', monthFrom)
    .lte('entry_date', monthTo)
    .is('archived_at', null)
  if (error) throw error
  const map = new Map()
  for (const row of data || []) {
    const catId = row.category_id || '__none__'
    map.set(catId, (map.get(catId) || 0) + Math.abs(Number(row.amount)))
  }
  return map
}
