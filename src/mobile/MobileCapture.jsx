// Capture router — the ➕ tab's front door.
// Shows a type chooser; routes to the right capture form.
import { useState } from 'react'
import MobileFoodCapture from './MobileFoodCapture'
import MobileTaskCapture from './MobileTaskCapture'

const TYPES = [
  { id: 'task', label: 'Task' },
  { id: 'event', label: 'Event' },
  { id: 'food', label: 'Food' },
  { id: 'note', label: 'Note' },
]

export default function MobileCapture({ onDone }) {
  const [captureType, setCaptureType] = useState(null)

  if (captureType === 'food')
    return <MobileFoodCapture onDone={onDone} />

  if (captureType === 'task')
    return <MobileTaskCapture onDone={onDone} onBack={() => setCaptureType(null)} />

  if (captureType)
    return (
      <div className="mc-placeholder">
        <button className="mc-back" onClick={() => setCaptureType(null)}
          aria-label="Back to chooser">&lsaquo;</button>
        <p className="mc-placeholder-label">{TYPES.find((t) => t.id === captureType)?.label} capture</p>
        <p className="mc-placeholder-hint">coming soon</p>
      </div>
    )

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
