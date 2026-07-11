import { supabase } from '../../spine/data/supabaseClient'

// LifeOS — Finance trends data layer (Piece 8a). Raw Supabase queries for the
// analysis/chart screens. financeCalc.js takes these results and computes the
// chart series — this file only fetches.

export async function fetchAllTransactions(from, to) {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('id,account_id,entry_date,amount,txn_type,category_id')
    .gte('entry_date', from)
    .lte('entry_date', to)
    .is('archived_at', null)
    .order('entry_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchAllSnapshots(from, to) {
  const { data, error } = await supabase
    .from('finance_account_snapshots')
    .select('id,account_id,snapshot_date,value')
    .gte('snapshot_date', from)
    .lte('snapshot_date', to)
    .order('snapshot_date', { ascending: true })
  if (error) throw error
  return data || []
}

// Also fetch snapshots BEFORE the range start for the step-function (the value
// on day 1 of the range may be set by a snapshot from before the range).
export async function fetchLatestSnapshotsBefore(from) {
  // For each investment account, get the most recent snapshot on or before `from`.
  // We fetch all snapshots before `from` and let the calc layer pick the latest per account.
  const { data, error } = await supabase
    .from('finance_account_snapshots')
    .select('id,account_id,snapshot_date,value')
    .lt('snapshot_date', from)
    .order('snapshot_date', { ascending: false })
  if (error) throw error
  return data || []
}
