import { supabase } from '../../spine/data/supabaseClient'

// LifeOS — Finance recurring-bill queries (split from financeData.js, Piece 6c).

const REC_COLS = 'id,target_kind,freq,weekdays,end_kind,end_count,end_until,start_date,wall_time,timezone,title,notes,category_id,amount,account_id,transfer_account_id,txn_type,generated_until,created_at'

export async function listRecurringBills() {
  const { data, error } = await supabase
    .from('recurrences')
    .select(REC_COLS)
    .eq('target_kind', 'transaction')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listUpcomingOccurrences(seriesId, todayStr, limit = 3) {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('id,entry_date,amount,description,series_detached')
    .eq('series_id', seriesId)
    .gte('entry_date', todayStr)
    .is('archived_at', null)
    .order('entry_date', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data || []
}
