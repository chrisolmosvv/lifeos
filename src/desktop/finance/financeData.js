import { supabase } from '../../spine/data/supabaseClient'

// LifeOS — Finance data layer. All Supabase queries for the Finance module.
// Direct client calls, same pattern as peopleLoad/peopleWrite. No new plumbing.

const ACCT_COLS = 'id,name,account_type,institution,starting_balance,is_archived,source,created_at,updated_at'
const SNAP_COLS = 'id,account_id,snapshot_date,value,notes,source,created_at'

// ── Accounts ────────────────────────────────────────────────────────────────

export async function listAccounts() {
  const { data, error } = await supabase
    .from('finance_accounts')
    .select(ACCT_COLS)
    .eq('is_archived', false)
    .order('account_type', { ascending: true })  // cash before investment
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function listArchivedAccounts() {
  const { data, error } = await supabase
    .from('finance_accounts')
    .select(ACCT_COLS)
    .eq('is_archived', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createAccount({ name, account_type, institution, starting_balance }) {
  const row = { name, account_type, institution: institution || null, starting_balance: starting_balance ?? 0 }
  const { data, error } = await supabase.from('finance_accounts').insert(row).select(ACCT_COLS).single()
  if (error) throw error
  return data
}

export async function updateAccount(id, fields) {
  const { data, error } = await supabase
    .from('finance_accounts')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ACCT_COLS)
    .single()
  if (error) throw error
  return data
}

export async function archiveAccount(id) {
  return updateAccount(id, { is_archived: true })
}

export async function restoreAccount(id) {
  return updateAccount(id, { is_archived: false })
}

// ── Snapshots (investment accounts) ─────────────────────────────────────────

export async function listSnapshots(accountId) {
  const { data, error } = await supabase
    .from('finance_account_snapshots')
    .select(SNAP_COLS)
    .eq('account_id', accountId)
    .order('snapshot_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function upsertSnapshot({ account_id, snapshot_date, value }) {
  const { data, error } = await supabase
    .from('finance_account_snapshots')
    .upsert({ account_id, snapshot_date, value, source: 'manual' }, { onConflict: 'account_id,snapshot_date' })
    .select(SNAP_COLS)
    .single()
  if (error) throw error
  return data
}

export async function deleteSnapshot(id) {
  const { error } = await supabase.from('finance_account_snapshots').delete().eq('id', id)
  if (error) throw error
}
