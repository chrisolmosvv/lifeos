import TaskEditForm from './TaskEditForm'
import './eventPanel.css'

// The task editor as a calm overlay on the calendar — same fields as the list
// row (TaskEditForm), so a scheduled task can be edited from the grid. It stays
// a task; this just edits its details. Saves inline (text on blur, chips/
// priority on tap); a Close button dismisses it. Reuses the event panel's shell.
export default function TaskPanel({ task, pickable, inboxColor, busy, onUpdate, onClose }) {
  return (
    <div className="ep-scrim" onClick={onClose}>
      <div className="ep" onClick={(e) => e.stopPropagation()}>
        <div className="ep-head">
          <h3 className="ep-title">Edit task</h3>
          <button className="ep-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <TaskEditForm
          task={task}
          pickable={pickable}
          inboxColor={inboxColor}
          busy={busy}
          onUpdate={onUpdate}
        />

        <div className="ep-actions">
          <span />
          <div className="ep-actions-right">
            <button className="ep-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
