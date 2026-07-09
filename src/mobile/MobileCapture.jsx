// Capture router — the ➕ tab's front door.
// Create: shows a type chooser → routes to the right form.
// Edit: receives editItem + editKind → routes straight to the form in edit mode.
import { useState } from 'react'
import MobileFoodCapture from './MobileFoodCapture'
import MobileTaskCapture from './MobileTaskCapture'
import MobileEventCapture from './MobileEventCapture'
import MobileNoteCapture from './MobileNoteCapture'

const TYPES = [
  { id: 'task', label: 'Task' },
  { id: 'event', label: 'Event' },
  { id: 'food', label: 'Food' },
  { id: 'note', label: 'Note' },
]

// A live recurring instance (series member, not yet detached) must NOT be edited
// on mobile — the scope prompt (this one / all / following) isn't built yet.
function isLiveRecurring(item) {
  return item && item.series_id && !item.series_detached
}

export default function MobileCapture({ onDone, editItem, editKind, createPrefill }) {
  const [captureType, setCaptureType] = useState(null)

  // Create-prefill mode (long-press from grid): open Event form with prefilled time.
  if (createPrefill)
    return <MobileEventCapture onDone={onDone} onBack={onDone} prefill={createPrefill} />

  // Edit mode: route directly to the right form (bypass the chooser).
  if (editItem) {
    if (isLiveRecurring(editItem))
      return (
        <div className="mc-recurring-block">
          <button className="mc-back" onClick={onDone} type="button"
            aria-label="Close">&lsaquo;</button>
          <p className="mc-recurring-msg">This {editKind || 'item'} repeats — edit it on desktop.</p>
        </div>
      )

    if (editKind === 'task')
      return <MobileTaskCapture item={editItem} onDone={onDone} onBack={onDone} />
    if (editKind === 'event')
      return <MobileEventCapture item={editItem} onDone={onDone} onBack={onDone} />
  }

  // Create mode: chooser → form.
  if (captureType === 'food')
    return <MobileFoodCapture onDone={onDone} />

  if (captureType === 'task')
    return <MobileTaskCapture onDone={onDone} onBack={() => setCaptureType(null)} />

  if (captureType === 'event')
    return <MobileEventCapture onDone={onDone} onBack={() => setCaptureType(null)} />

  if (captureType === 'note')
    return <MobileNoteCapture onDone={onDone} onBack={() => setCaptureType(null)} />

  return (
    <div className="mc-chooser">
      <button className="mc-dismiss" onClick={onDone} aria-label="Cancel">&lsaquo;</button>
      <p className="mc-kicker">Capture</p>
      <ul className="mc-list">
        {TYPES.map((t) => (
          <li key={t.id}>
            <button className="mc-option" onClick={() => setCaptureType(t.id)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
