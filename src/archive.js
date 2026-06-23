import { supabase } from './supabaseClient'

// The archive write helper (Phase 7, Archive A2). Soft-delete = archive: a delete
// stamps the affected rows with archived_at + a shared archive_batch_id so it can
// be restored as one unit. All writes go through the EXISTING Supabase client
// paths; nothing reads-to-hide (the active-only read filter is A3). Inbox is never
// archived (guarded by the caller).
//
// Atomic-ish: the browser client can't wrap several statements in one transaction,
// so we (1) insert the batch, then (2) stamp each table's rows in a single
// `.update().in(ids)` per table. If ANY stamp fails, we run the same compensation
// as undo — clear archived_at/batch for everything in that batch and delete the
// batch row — so we never leave a half-archived batch behind. The error is
// returned to the caller (surfaced in the UI), never swallowed.

async function archiveRows(label, sourceType, sets) {
  const total = sets.reduce((n, s) => n + s.ids.length, 0)
  if (total === 0) return { batchId: null, empty: true }

  const { data: batch, error: be } = await supabase
    .from('archive_batches')
    .insert({ label, source_type: sourceType })
    .select('id')
    .single()
  if (be) return { error: be }

  const stamp = { archived_at: new Date().toISOString(), archive_batch_id: batch.id }
  for (const { table, ids } of sets) {
    if (!ids.length) continue
    const { error } = await supabase.from(table).update(stamp).in('id', ids)
    if (error) {
      await unarchiveBatch(batch.id) // compensate — leave no half-archived batch
      return { error }
    }
  }
  return { batchId: batch.id }
}

// Reverse a batch: clear archived_at + archive_batch_id on every row in it (across
// all three tables), then delete the now-empty batch row. Used by the undo toast
// and as the failure-compensation above.
export async function unarchiveBatch(batchId) {
  for (const table of ['tasks', 'events', 'categories']) {
    const { error } = await supabase
      .from(table)
      .update({ archived_at: null, archive_batch_id: null })
      .eq('archive_batch_id', batchId)
    if (error) return { error }
  }
  const { error } = await supabase.from('archive_batches').delete().eq('id', batchId)
  if (error) return { error }
  return {}
}

// Archive a task and its (active) subtasks in one batch, so subtasks never orphan.
export async function archiveTask(id, label) {
  const { data: kids, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('parent_task_id', id)
    .is('archived_at', null)
  if (error) return { error }
  const ids = [id, ...(kids || []).map((k) => k.id)]
  return archiveRows(label || 'Task', 'task', [{ table: 'tasks', ids }])
}

export async function archiveEvent(id, label) {
  return archiveRows(label || 'Event', 'event', [{ table: 'events', ids: [id] }])
}

// Read-only walk of the parent_id tree from a category, gathering the ACTIVE
// sub-tree plus every active task/event whose category is anywhere in it.
export async function gatherCategoryBranch(rootId) {
  const { data: cats, error } = await supabase
    .from('categories')
    .select('id, parent_id')
    .is('archived_at', null)
  if (error) return { error }

  const active = new Set(cats.map((c) => c.id))
  const childrenOf = new Map()
  for (const c of cats) {
    const k = c.parent_id ?? null
    if (!childrenOf.has(k)) childrenOf.set(k, [])
    childrenOf.get(k).push(c.id)
  }
  const categoryIds = []
  const walk = (id) => {
    if (!active.has(id)) return // already archived → nothing to gather
    categoryIds.push(id)
    for (const ch of childrenOf.get(id) || []) walk(ch)
  }
  walk(rootId)

  if (categoryIds.length === 0) return { categoryIds: [], taskIds: [], eventIds: [] }
  const [tRes, eRes] = await Promise.all([
    supabase.from('tasks').select('id').in('category_id', categoryIds).is('archived_at', null),
    supabase.from('events').select('id').in('category_id', categoryIds).is('archived_at', null),
  ])
  if (tRes.error) return { error: tRes.error }
  if (eRes.error) return { error: eRes.error }
  return {
    categoryIds,
    taskIds: (tRes.data || []).map((r) => r.id),
    eventIds: (eRes.data || []).map((r) => r.id),
  }
}

// Archive a category's whole branch (category + descendants + their tasks/events)
// as ONE batch. Pass a pre-gathered branch (from the confirm dialog) to avoid a
// second read.
export async function archiveCategoryBranch(rootId, label, gathered) {
  const g = gathered || (await gatherCategoryBranch(rootId))
  if (g.error) return { error: g.error }
  return archiveRows(label || 'Category', 'category', [
    { table: 'tasks', ids: g.taskIds },
    { table: 'events', ids: g.eventIds },
    { table: 'categories', ids: g.categoryIds },
  ])
}
