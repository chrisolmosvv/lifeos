import { supabase } from '../../spine/data/supabaseClient'

// LifeOS — Finance category auto-guess (Piece 5). For a set of descriptions on
// a given account, finds the most common category_id among existing transactions
// with an exact (case-insensitive) description match. Batched: one query for ALL
// unique descriptions, returns a Map<lowerDesc, categoryId>.

export async function guessCategoriesForDescriptions(accountId, descriptions) {
  const unique = [...new Set(descriptions.map((d) => d.trim().toLowerCase()).filter(Boolean))]
  if (!unique.length) return new Map()

  // Fetch all categorised transactions on this account whose description matches
  // any of the import's descriptions. PostgREST's `in` filter is case-sensitive,
  // so we compare on the JS side after a broader fetch scoped to the account.
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('description,category_id')
    .eq('account_id', accountId)
    .not('category_id', 'is', null)
    .is('archived_at', null)

  if (error || !data) return new Map()

  // Tally: for each lowercased description, count category_id occurrences.
  const tally = new Map() // lowerDesc → Map<category_id, count>
  for (const row of data) {
    const key = (row.description || '').trim().toLowerCase()
    if (!unique.includes(key)) continue
    if (!tally.has(key)) tally.set(key, new Map())
    const counts = tally.get(key)
    counts.set(row.category_id, (counts.get(row.category_id) || 0) + 1)
  }

  // Pick the most common category_id per description.
  const result = new Map()
  for (const [desc, counts] of tally) {
    let best = null, bestN = 0
    for (const [catId, n] of counts) {
      if (n > bestN) { best = catId; bestN = n }
    }
    if (best) result.set(desc, best)
  }
  return result
}
