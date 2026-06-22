// Pure helpers for arranging the flat category list into a readable tree.
// No data access here — just shaping the rows the manager renders.

// Inbox = the top-level bucket literally named 'Inbox' (matches the DB guard).
export function isInbox(c) {
  return (c.parent_id === null || c.parent_id === undefined) && c.name === 'Inbox'
}

function groupByParent(cats) {
  const byParent = new Map()
  for (const c of cats) {
    const key = c.parent_id ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(c)
  }
  return byParent
}

// Flatten into display order, each row tagged with its `depth`. Inbox is forced
// to the top of the top level; everything else sorts by sort_order then name.
export function orderedTree(cats) {
  const byParent = groupByParent(cats)
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      const ai = isInbox(a) ? -1 : 0
      const bi = isInbox(b) ? -1 : 0
      if (ai !== bi) return ai - bi
      return (a.sort_order - b.sort_order) || a.name.localeCompare(b.name)
    })
  }
  const out = []
  const walk = (key, depth) => {
    for (const c of byParent.get(key) || []) {
      out.push({ ...c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

// All ids beneath `id` (its whole sub-tree). Used to stop you nesting a
// category inside one of its own descendants (which would make a cycle).
export function descendantIds(cats, id) {
  const byParent = groupByParent(cats)
  const out = new Set()
  const walk = (pid) => {
    for (const c of byParent.get(pid) || []) {
      out.add(c.id)
      walk(c.id)
    }
  }
  walk(id)
  return out
}
