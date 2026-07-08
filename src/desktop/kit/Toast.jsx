import { useEffect } from 'react'
import './todayForm.css'

// Toast — a quiet "Deleted · Undo" message that auto-dismisses. Sealed kit block;
// it owns no data, just shows a message and an optional Undo action.
//
// Props: text, onUndo (optional), onDismiss, duration (ms, default 6000).
export default function Toast({ text, onUndo, onDismiss, duration = 6000 }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration)
    return () => clearTimeout(id)
  }, [onDismiss, duration])

  return (
    <div className="tk-toast" role="status">
      <span className="tk-toast-text">{text}</span>
      {onUndo && (
        <button className="tk-toast-undo" onClick={onUndo}>
          Undo
        </button>
      )}
    </div>
  )
}
