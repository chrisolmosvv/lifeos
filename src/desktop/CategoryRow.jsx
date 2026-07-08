import { useEffect, useState } from 'react'
import { descendantIds, orderedTree, isInbox } from '../spine/logic/categoryTree'
import { PALETTE, INBOX_COLOR } from '../spine/logic/palette'
import CategoryTag from './CategoryTag'

// One category line. Tap it to expand calm inline actions: rename, move it
// inside another bucket, add a sub-category, or delete it. Inbox is shown
// protected — no actions. Cycle-safe: the "Inside" list hides this category
// and its own descendants (the database blocks cycles too, as a backstop).
export default function CategoryRow({
  cat,
  inbox,
  allCats,
  expanded,
  busy,
  onToggle,
  onRename,
  onAddChild,
  onMove,
  onSetColor,
  onDelete,
}) {
  const [rename, setRename] = useState(cat.name)
  const [child, setChild] = useState('')

  // Keep the rename box in step with the data when it reloads.
  useEffect(() => {
    setRename(cat.name)
  }, [cat.name])

  const indent = { paddingLeft: `${cat.depth * 1.25 + 0.25}rem` }

  if (inbox) {
    return (
      <li className="cats-item is-inbox" style={indent}>
        <CategoryTag name={cat.name} color={cat.color || INBOX_COLOR} />
        <span className="cats-tag">default bucket</span>
      </li>
    )
  }

  // Valid "move inside" targets: top level, or any category that isn't this one,
  // one of its descendants, or the Inbox.
  const blocked = descendantIds(allCats, cat.id)
  const targets = orderedTree(allCats).filter(
    (t) => t.id !== cat.id && !blocked.has(t.id) && !isInbox(t),
  )

  function submitRename(e) {
    e.preventDefault()
    const n = rename.trim()
    if (!n || n === cat.name) return
    onRename(cat.id, n)
  }

  function submitChild(e) {
    e.preventDefault()
    const n = child.trim()
    if (!n) return
    onAddChild(cat.id, n).then((ok) => {
      if (ok) setChild('')
    })
  }

  return (
    <li className="cats-item" style={indent}>
      <button className="cats-rowhead" onClick={onToggle} aria-expanded={expanded}>
        <span className="cats-caret">{expanded ? '▾' : '▸'}</span>
        <CategoryTag name={cat.name} color={cat.color} />
      </button>

      {expanded && (
        <div className="cats-panel">
          <form className="cats-field" onSubmit={submitRename}>
            <input
              className="cats-input"
              value={rename}
              onChange={(e) => setRename(e.target.value)}
              aria-label="Rename category"
            />
            <button className="cats-btn ghost" type="submit" disabled={busy}>
              Rename
            </button>
          </form>

          <label className="cats-move">
            <span>Inside</span>
            <select
              value={cat.parent_id ?? ''}
              disabled={busy}
              onChange={(e) => onMove(cat.id, e.target.value || null)}
            >
              <option value="">Top level</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {' '.repeat(t.depth * 2)}
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <form className="cats-field" onSubmit={submitChild}>
            <input
              className="cats-input"
              value={child}
              onChange={(e) => setChild(e.target.value)}
              placeholder="Add a sub-category"
              aria-label="Add a sub-category"
            />
            <button className="cats-btn ghost" type="submit" disabled={busy}>
              Add inside
            </button>
          </form>

          <div className="cats-colour">
            <span className="cats-collabel">Colour</span>
            <div className="cats-swatches">
              <button
                type="button"
                title="No colour"
                className={'cats-swatch is-none' + (cat.color ? '' : ' is-on')}
                disabled={busy}
                onClick={() => onSetColor(cat.id, null)}
              />
              {PALETTE.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  title={p.name}
                  className={'cats-swatch' + (cat.color === p.id ? ' is-on' : '')}
                  style={{ background: p.light }}
                  disabled={busy}
                  onClick={() => onSetColor(cat.id, p.id)}
                />
              ))}
            </div>
          </div>

          <button
            className="cats-delete"
            onClick={() => onDelete(cat.id)}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      )}
    </li>
  )
}
