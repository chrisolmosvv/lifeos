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

// ── Transactions ────────────────────────────────────────────────────────────

const TXN_COLS = 'id,account_id,entry_date,amount,txn_type,category_id,transfer_account_id,paired_transaction_id,description,notes,series_id,series_detached,source,archived_at,created_at,updated_at'

export async function listTransactions(from, to) {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select(TXN_COLS)
    .gte('entry_date', from)
    .lte('entry_date', to)
    .is('archived_at', null)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createTransaction(fields) {
  const { data, error } = await supabase
    .from('finance_transactions')
    .insert(fields)
    .select(TXN_COLS)
    .single()
  if (error) throw error
  return data
}

// A transfer = two rows: negative on source, positive on destination, linked.
export async function createTransfer({ account_id, transfer_account_id, entry_date, amount, description, notes }) {
  const abs = Math.abs(parseFloat(amount))
  const src = await createTransaction({
    account_id, entry_date, amount: -abs, txn_type: 'transfer',
    transfer_account_id, description, notes, source: 'manual',
  })
  const dst = await createTransaction({
    account_id: transfer_account_id, entry_date, amount: abs, txn_type: 'transfer',
    transfer_account_id: account_id, paired_transaction_id: src.id,
    description, notes, source: 'manual',
  })
  // patch the source row with the destination's id to complete the pair link
  await supabase.from('finance_transactions')
    .update({ paired_transaction_id: dst.id, updated_at: new Date().toISOString() })
    .eq('id', src.id)
  return { src, dst }
}

export async function updateTransaction(id, fields) {
  const { data, error } = await supabase
    .from('finance_transactions')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(TXN_COLS)
    .single()
  if (error) throw error
  return data
}

export async function fetchTransaction(id) {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select(TXN_COLS)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Soft-delete: stamp archived_at. For transfers, stamp BOTH rows.
export async function softDeleteTransaction(id, pairedId) {
  const stamp = { archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  const ids = pairedId ? [id, pairedId] : [id]
  const { error } = await supabase.from('finance_transactions').update(stamp).in('id', ids)
  if (error) throw error
  return ids
}

// Undo: clear archived_at on the id(s).
export async function restoreTransaction(ids) {
  const { error } = await supabase.from('finance_transactions')
    .update({ archived_at: null, updated_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw error
}

// ── Categories (read-only + inline create for the picker) ───────────────────

export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,parent_id,color,sort_order')
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createCategory(name) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select('id,name,parent_id,color,sort_order')
    .single()
  if (error) throw error
  return data
}
