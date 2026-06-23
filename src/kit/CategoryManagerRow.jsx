import { useState } from 'react'
import { PALETTE } from '../palette'
import './categoryManager.css'

// One row of the Settings category manager (Phase 7, T13). Sealed kit block.
// Inline rename + recolour + add-child + delete, all calling the manager's
// existing-path write handlers. The drag GRIP is the drag source (native DnD);
// the row is the drop target. `resolvedHex` is the computed colour (custom or a
// derived shade); `derived` marks it as not-pinned. `blockedReason` (string|null)
// is why delete is refused, computed by the manager (tasks/children present).
export default function CategoryManagerRow({
  cat, depth, isInbox, resolvedHex, derived, hasChildren, canAddChild, expanded,
  busy, isDropTarget,
  onToggle, onRename, onRecolor, onAddChild, onDelete,
  onDragStart, onDragEnd, onDragOverRow, onDropRow,
}) {
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(cat.name)
  const [pop, setPop] = useState(false)
  const [adding, setAdding] = useState(false)
  const [childVal, setChildVal] = useState('')

  function saveName() {
    const n = nameVal.trim()
    setEditing(false)
    if (n && n !== cat.name) onRename(cat.id, n)
    else setNameVal(cat.name)
  }
  async function addChild(e) {
    e.preventDefault()
    const n = childVal.trim()
    if (!n || busy) return
    const ok = await onAddChild(cat.id, n)
    if (ok !== false) { setChildVal(''); setAdding(false) }
  }

  return (
    <li>
      <div
        className={'cm-row' + (isDropTarget ? ' is-drop' : '')}
        style={{ paddingLeft: depth * 1.2 + 'rem' }}
        onDragOver={(e) => { e.preventDefault(); onDragOverRow(cat) }}
        onDrop={(e) => { e.preventDefault(); onDropRow(cat) }}
      >
        <span
          className="cm-grip"
          draggable
          onDragStart={() => onDragStart(cat)}
          onDragEnd={onDragEnd}
          title="Drag to reorder"
        >⠿</span>

        <button
          className={'cm-caret' + (hasChildren ? '' : ' is-leaf')}
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >{expanded ? '▾' : '▸'}</button>

        <span className="cm-pop">
          <button
            className={'cm-dot' + (derived ? ' is-derived' : '')}
            style={{ background: resolvedHex }}
            onClick={() => setPop((v) => !v)}
            aria-label="Colour"
            title={derived ? 'Derived colour' : 'Custom colour'}
          />
          {pop && (
            <span className="cm-swatches">
              {PALETTE.map((c) => (
                <button
                  key={c.id}
                  className={'cm-swatch' + (cat.color === c.id ? ' is-on' : '')}
                  style={{ background: c.light }}
                  title={c.name}
                  onClick={() => { onRecolor(cat.id, c.id); setPop(false) }}
                />
              ))}
              <button className="cm-derive" onClick={() => { onRecolor(cat.id, null); setPop(false) }}>
                Use derived shade
              </button>
            </span>
          )}
        </span>

        {editing ? (
          <input
            className="cm-name-input"
            value={nameVal}
            autoFocus
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setNameVal(cat.name); setEditing(false) } }}
          />
        ) : (
          <button className="cm-name" onClick={() => { setNameVal(cat.name); setEditing(true) }}>
            {cat.name}
          </button>
        )}

        {canAddChild && (
          <button className="cm-act" onClick={() => setAdding(true)}>+ child</button>
        )}
        {!isInbox && (
          <button className="cm-act cm-del" onClick={() => onDelete(cat)} disabled={busy}>
            Delete
          </button>
        )}
      </div>

      {adding && (
        <form className="cm-addrow" style={{ paddingLeft: (depth + 1) * 1.2 + 'rem' }} onSubmit={addChild}>
          <input
            value={childVal}
            autoFocus
            placeholder="New sub-category"
            onChange={(e) => setChildVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
            aria-label="New sub-category name"
          />
          <button type="submit" disabled={busy}>Add</button>
        </form>
      )}
    </li>
  )
}
