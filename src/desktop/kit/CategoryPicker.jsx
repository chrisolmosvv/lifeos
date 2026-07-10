import { useState } from 'react'
import { colorHex } from '../../spine/logic/palette'
import './todayForm.css'

// CategoryPicker — a drill-in picker that READS the category tree (it never
// creates/nests/renames/deletes — that's the future Settings manager). One level
// at a time with a breadcrumb; tap a row's LABEL to pick that node (any level)
// and close; tap its CHEVRON to go deeper; leaves have no chevron. A search box
// filters across all nodes. "Inbox" maps to category_id = null (the data model's
// "uncategorised"). Sealed kit block. Colour shown as-is (no inheritance yet).
//
// Props: cats (flat rows), value (selected id | null), inboxColor, onPick(id|null),
//         onCreate(name) — optional; when present, a "+ New" affordance appears at
//         the bottom. The parent handles the actual insert + list refresh.
export default function CategoryPicker({ cats, value, inboxColor, onPick, onCreate }) {
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  // The real categories form the tree; the literal "Inbox" row is represented by
  // the null option instead (a task/event means Inbox by having no category).
  const real = cats.filter((c) => !(c.parent_id == null && c.name === 'Inbox'))
  const [parentId, setParentId] = useState(null) // current level (null = top)
  const [query, setQuery] = useState('')

  const childrenOf = (pid) =>
    real
      .filter((c) => (c.parent_id ?? null) === pid)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const hasKids = (id) => real.some((c) => c.parent_id === id)

  // Breadcrumb: walk parent links from the current level up to the root.
  const crumbs = []
  let walk = parentId
  while (walk) {
    const node = real.find((c) => c.id === walk)
    if (!node) break
    crumbs.unshift(node)
    walk = node.parent_id ?? null
  }

  const q = query.trim().toLowerCase()
  const searching = q.length > 0
  const results = searching
    ? real.filter((c) => c.name.toLowerCase().includes(q))
    : childrenOf(parentId)

  const Dot = ({ color }) => {
    const hex = colorHex(color)
    return (
      <span
        className={'tk-pick-dot' + (hex ? '' : ' is-empty')}
        style={hex ? { background: hex } : undefined}
      />
    )
  }

  return (
    <div className="tk-pick">
      <input
        className="tk-pick-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search categories…"
        aria-label="Search categories"
        autoFocus
      />

      {!searching && (
        <div className="tk-pick-crumbs">
          <button type="button" className="tk-pick-crumb" onClick={() => setParentId(null)}>
            All
          </button>
          {crumbs.map((c) => (
            <button
              type="button"
              key={c.id}
              className="tk-pick-crumb"
              onClick={() => setParentId(c.id)}
            >
              › {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="tk-pick-list">
        {/* Inbox lives at the top level (and in search), and maps to null. */}
        {!searching && parentId === null && (
          <div className={'tk-pick-row' + (value == null ? ' is-on' : '')}>
            <button type="button" className="tk-pick-label" onClick={() => onPick(null)}>
              <Dot color={inboxColor} />
              <span>Inbox</span>
            </button>
          </div>
        )}

        {results.map((c) => (
          <div key={c.id} className={'tk-pick-row' + (value === c.id ? ' is-on' : '')}>
            <button type="button" className="tk-pick-label" onClick={() => onPick(c.id)}>
              <Dot color={c.color} />
              <span>{c.name}</span>
              {searching && c.parent_id && (
                <span className="tk-pick-under">in {parentName(real, c.parent_id)}</span>
              )}
            </button>
            {!searching && hasKids(c.id) && (
              <button
                type="button"
                className="tk-pick-chev"
                aria-label={'Open ' + c.name}
                onClick={() => setParentId(c.id)}
              >
                ›
              </button>
            )}
          </div>
        ))}

        {results.length === 0 && (
          <p className="tk-pick-empty">
            {searching ? 'No matches.' : 'No sub-categories — pick a level above.'}
          </p>
        )}
      </div>
      {onCreate && !searching && parentId === null && (
        addingNew ? (
          <form className="tk-pick-create" onSubmit={(e) => {
            e.preventDefault()
            const n = newName.trim()
            if (!n) return
            onCreate(n)
            setNewName('')
            setAddingNew(false)
          }}>
            <input className="tk-pick-create-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Category name" autoFocus />
            <button type="submit" className="tk-pick-create-go" disabled={!newName.trim()}>Create</button>
            <button type="button" className="tk-pick-create-cancel" onClick={() => { setAddingNew(false); setNewName('') }}>Cancel</button>
          </form>
        ) : (
          <button type="button" className="tk-pick-create-btn" onClick={() => setAddingNew(true)}>+ New category</button>
        )
      )}
    </div>
  )
}

function parentName(cats, id) {
  return cats.find((c) => c.id === id)?.name ?? ''
}
