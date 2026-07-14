import { useState } from 'react'
import './planningColumn.css'

// PlanningColumn — one labelled column of task rows for the Planning view: the
// Inbox side rail (variant="rail") and each of the four time lanes (a <section>).
// Presentational; the caller's `renderRow` draws each row, so all state/writes
// stay in Planning. P2 adds drag: the four LANES are both drag sources (each card
// is wrapped `draggable`) and — except Overdue — drop targets (`dropLane` set).
// The rail passes neither, so it stays display-only. Sealed kit block.
//
// Props: tag, className, label, count, items, emptyText, renderRow,
//        dropLane (string | undefined), onDropTask(lane), draggable (bool),
//        onDragStartTask(task), onDragEndTask, draggingId.
export default function PlanningColumn({
  tag = 'section',
  className,
  label,
  count,
  items,
  emptyText,
  renderRow,
  dropLane,
  onDropTask,
  draggable,
  onDragStartTask,
  onDragEndTask,
  draggingId,
}) {
  const Tag = tag
  const [over, setOver] = useState(false)

  const dropProps = dropLane
    ? {
        onDragOver: (e) => {
          e.preventDefault()
          if (!over) setOver(true)
        },
        onDragLeave: (e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return // still inside
          setOver(false)
        },
        onDrop: (e) => {
          e.preventDefault()
          setOver(false)
          onDropTask(dropLane)
        },
      }
    : {}

  return (
    <Tag className={className + (over ? ' is-drop-over' : '')} {...dropProps}>
      <span className="pl-col-label">
        {label} <span className="pl-col-n tnum">{count}</span>
      </span>
      {items.length === 0 ? (
        <p className="pl-col-empty">{emptyText}</p>
      ) : (
        items.map((t) =>
          draggable ? (
            <div
              key={t.id}
              className={'pl-card' + (draggingId === t.id ? ' is-dragging' : '')}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', String(t.id))
                onDragStartTask(t)
              }}
              onDragEnd={onDragEndTask}
            >
              {renderRow(t)}
            </div>
          ) : (
            renderRow(t)
          ),
        )
      )}
    </Tag>
  )
}
