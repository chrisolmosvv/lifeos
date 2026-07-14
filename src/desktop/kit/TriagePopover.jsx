import { useState } from 'react'
import Popover from './Popover'
import CategoryPicker from './CategoryPicker'
import './planningTriage.css'

// TriagePopover — the quick-triage chips for an Inbox rail card (P5). Tap a rail
// card → this opens on the existing Popover primitive: a one-tap DATE row (Today /
// This week / Later — dating a dump is the most common triage, so each is a single
// tap, never a form), a CATEGORY step (reuses CategoryPicker), and an "open full
// editor" escape hatch. The two axes stay independent: a date tap writes only
// due_date, a category pick writes only category_id. Writes happen in the parent
// (write-then-reload); this only calls the callbacks. Sealed kit block.
//
// Props: task, anchorRef, cats, inboxColor, onSetDate(lane), onSetCategory(catId),
//        onOpenEditor, onClose.
const DATE_CHIPS = [
  { lane: 'today', label: 'Today' },
  { lane: 'thisWeek', label: 'This week' },
  { lane: 'later', label: 'Later' },
]

export default function TriagePopover({ task, anchorRef, cats, inboxColor, onSetDate, onSetCategory, onOpenEditor, onClose }) {
  const [picking, setPicking] = useState(false)

  return (
    <Popover anchorRef={anchorRef} title={picking ? 'Pick a category' : 'Triage'} onClose={onClose}>
      {picking ? (
        <CategoryPicker
          cats={cats}
          value={task.category_id ?? null}
          inboxColor={inboxColor}
          onPick={(id) => onSetCategory(id)}
        />
      ) : (
        <div className="pl-triage">
          <span className="pl-triage-label">When</span>
          <div className="pl-triage-chips">
            {DATE_CHIPS.map((c) => (
              <button key={c.lane} className="pl-triage-chip" onClick={() => onSetDate(c.lane)}>
                {c.label}
              </button>
            ))}
          </div>
          <button className="pl-triage-cat" onClick={() => setPicking(true)}>Set category…</button>
          <button className="pl-triage-edit" onClick={onOpenEditor}>Open full editor</button>
        </div>
      )}
    </Popover>
  )
}
