// Reusable mobile category picker — standalone, used by Task/Event/Note capture.
// Shows the category tree with colour dots and depth indentation.
import { useState } from 'react'
import { orderedTree, isInbox } from '../spine/logic/categoryTree'
import { resolveColor } from '../spine/logic/colorModel'
import { colorHex } from '../spine/logic/palette'
import { INBOX_COLOR } from '../spine/logic/palette'

export default function MobileCategoryPicker({ cats, value, onPick }) {
  const [open, setOpen] = useState(false)
  const tree = orderedTree(cats)
  const catById = new Map(cats.map((c) => [c.id, c]))

  const selected = value ? catById.get(value) : null
  const selectedName = selected ? selected.name : 'Inbox'
  const selectedHex = selected
    ? resolveColor(selected, catById)
    : colorHex(INBOX_COLOR)

  function pick(id) {
    onPick(id)
    setOpen(false)
  }

  return (
    <div className="mc-cat">
      <button className="mc-cat-btn" type="button" onClick={() => setOpen(!open)}>
        <span className="mc-cat-dot" style={{ background: selectedHex }} />
        <span className="mc-cat-name">{selectedName}</span>
        <span className="mc-cat-caret">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <ul className="mc-cat-list">
          <li>
            <button
              className={'mc-cat-row' + (value === null ? ' mc-cat-row--on' : '')}
              type="button"
              onClick={() => pick(null)}
            >
              <span className="mc-cat-dot" style={{ background: colorHex(INBOX_COLOR) }} />
              Inbox
            </button>
          </li>
          {tree.filter((c) => !isInbox(c)).map((c) => (
            <li key={c.id}>
              <button
                className={'mc-cat-row' + (value === c.id ? ' mc-cat-row--on' : '')}
                type="button"
                onClick={() => pick(c.id)}
                style={{ paddingLeft: 12 + c.depth * 16 }}
              >
                <span className="mc-cat-dot" style={{ background: resolveColor(c, catById) }} />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
