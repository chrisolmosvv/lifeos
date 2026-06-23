import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { isInbox } from './categoryTree'
import { resolveColor, isDerived } from './colorModel'
import CategoryManagerRow from './kit/CategoryManagerRow'
import './kit/categoryManager.css'

// The Settings category manager (Phase 7, T13). Create / rename / recolour /
// reorder / delete categories — all via the EXISTING category write paths. Reads
// tasks ONLY to guard delete. Colour is shade-with-override (colorModel): an empty
// `color` means "derived" (a computed shade, never written); a set `color` pins it.
// Depth-3 cap enforced in the UI (and by the DB trigger). Inbox can be renamed /
// recoloured / given children but NEVER deleted. Does not touch Today/All Tasks/
// Calendar or their read hooks.
export default function CategoryManager() {
  const [cats, setCats] = useState(null)
  const [taskCatIds, setTaskCatIds] = useState(new Set())
  const [expanded, setExpanded] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [addingTop, setAddingTop] = useState(false)
  const [topVal, setTopVal] = useState('')
  const [drag, setDrag] = useState(null) // {id, parentId}
  const [dropId, setDropId] = useState(null)

  async function load() {
    const [catRes, taskRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, parent_id, color, sort_order, created_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.from('tasks').select('category_id'),
    ])
    if (catRes.error) {
      setError(friendly(catRes.error))
      setCats([])
      return
    }
    setError('')
    setCats(catRes.data)
    setTaskCatIds(new Set((taskRes.data || []).map((t) => t.category_id).filter(Boolean)))
  }

  useEffect(() => {
    load()
  }, [])

  async function run(query) {
    setBusy(true)
    setError('')
    const { error } = await query
    setBusy(false)
    if (error) {
      setError(friendly(error))
      return false
    }
    await load()
    return true
  }

  const onRename = (id, name) =>
    run(supabase.from('categories').update({ name }).eq('id', id))
  const onRecolor = (id, color) =>
    run(supabase.from('categories').update({ color }).eq('id', id)) // null = derived
  const onAddChild = (parentId, name) =>
    run(supabase.from('categories').insert({ name, parent_id: parentId }))
  const onDelete = (id) =>
    run(supabase.from('categories').delete().eq('id', id))
  async function onAddTop(e) {
    e.preventDefault()
    const n = topVal.trim()
    if (!n || busy) return
    const ok = await run(supabase.from('categories').insert({ name: n }))
    if (ok) { setTopVal(''); setAddingTop(false) }
  }

  const list = cats || []
  const byId = new Map(list.map((c) => [c.id, c]))
  const childrenOf = (pid) =>
    list
      .filter((c) => (c.parent_id ?? null) === pid)
      .sort((a, b) => {
        const ai = isInbox(a) ? -1 : 0
        const bi = isInbox(b) ? -1 : 0
        if (ai !== bi) return ai - bi // Inbox always first
        return a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      })
  const hasChildren = (id) => list.some((c) => c.parent_id === id)
  const blockedReason = (cat) => {
    if (hasChildren(cat.id)) return 'It has sub-categories — move or remove them first.'
    if (taskCatIds.has(cat.id)) return 'It has tasks — move them first.'
    return null
  }

  // Reorder within the same parent (drag a sibling onto a sibling); persists sort_order.
  function onDragStart(cat) {
    setDrag({ id: cat.id, parentId: cat.parent_id ?? null })
  }
  function onDragOverRow(cat) {
    if (drag && (cat.parent_id ?? null) === drag.parentId && cat.id !== drag.id) setDropId(cat.id)
    else setDropId(null)
  }
  function onDragEnd() {
    setDrag(null)
    setDropId(null)
  }
  async function onDropRow(cat) {
    const d = drag
    setDrag(null)
    setDropId(null)
    if (!d || (cat.parent_id ?? null) !== d.parentId || cat.id === d.id) return
    const siblings = childrenOf(d.parentId)
    const ids = siblings.map((s) => s.id)
    const from = ids.indexOf(d.id)
    const to = ids.indexOf(cat.id)
    if (from < 0 || to < 0 || from === to) return
    ids.splice(from, 1)
    ids.splice(to, 0, d.id)
    setBusy(true)
    for (let i = 0; i < ids.length; i++) {
      const s = siblings.find((x) => x.id === ids[i])
      if (s.sort_order !== i) {
        const { error } = await supabase.from('categories').update({ sort_order: i }).eq('id', ids[i])
        if (error) { setError(friendly(error)); break }
      }
    }
    setBusy(false)
    await load()
  }

  function renderTree(parentId, depth) {
    const out = []
    for (const cat of childrenOf(parentId)) {
      out.push(
        <CategoryManagerRow
          key={cat.id}
          cat={cat}
          depth={depth}
          isInbox={isInbox(cat)}
          resolvedHex={resolveColor(cat, byId)}
          derived={isDerived(cat)}
          hasChildren={hasChildren(cat.id)}
          canAddChild={depth < 2} /* depth 0=top,1=sub can add; 2=sub-sub cannot (cap 3) */
          expanded={expanded.has(cat.id)}
          busy={busy}
          blockedReason={blockedReason(cat)}
          isDropTarget={dropId === cat.id}
          onToggle={() =>
            setExpanded((s) => {
              const n = new Set(s)
              n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id)
              return n
            })
          }
          onRename={onRename}
          onRecolor={onRecolor}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOverRow={onDragOverRow}
          onDropRow={onDropRow}
        />,
      )
      if (expanded.has(cat.id) && hasChildren(cat.id)) out.push(...renderTree(cat.id, depth + 1))
    }
    return out
  }

  return (
    <div className="cm">
      <div className="cm-head">
        <h1 className="cm-title">Categories</h1>
        <button className="cm-addtop" onClick={() => setAddingTop(true)}>+ add top-level</button>
      </div>
      <p className="cm-sub">
        Rename, recolour, nest, reorder (drag the grip), or remove a category. Inbox stays
        put. An uncoloured category takes a lighter shade of its parent's colour.
      </p>

      {addingTop && (
        <form className="cm-addrow" onSubmit={onAddTop}>
          <input
            value={topVal}
            autoFocus
            placeholder="New top-level category"
            onChange={(e) => setTopVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setAddingTop(false)}
            aria-label="New top-level category name"
          />
          <button type="submit" disabled={busy}>Add</button>
        </form>
      )}

      {cats === null ? (
        <p className="cm-note">Loading…</p>
      ) : (
        <ul className="cm-list">{renderTree(null, 0)}</ul>
      )}

      {error && <p className="cm-error">{error}</p>}
    </div>
  )
}

function friendly(error) {
  if (error.code === '23505') return 'A category with that name already exists here.'
  return error.message || 'Something went wrong.'
}
