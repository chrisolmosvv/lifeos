// Pull-up half-sheet for untimed tasks. Tap the handle (sticky at the bottom of
// the scroll area) → sheet rises; drag the notch down → dismiss; tap backdrop →
// close. Today | Upcoming switcher inside. Status-cycle is the only write.

import { useRef, useState } from 'react'
import MSwitcher from './MSwitcher'
import MobileTaskRow from './MobileTaskRow'

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
]

export default function MobileTaskSheet({
  open, onClose,
  todayItems, next7, undated, total,
  catById, inboxColor, busy,
  dispCat, progressFn, parentTitleFn,
  onSetStatus, onEdit,
}) {
  const [tab, setTab] = useState('today')
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startYRef = useRef(0)

  function onDragStart(e) {
    startYRef.current = e.touches[0].clientY
    setDragging(true)
  }
  function onDragMove(e) {
    if (!dragging) return
    const dy = e.touches[0].clientY - startYRef.current
    setDragY(Math.max(0, dy))
    e.preventDefault()
  }
  function onDragEnd() {
    setDragging(false)
    if (dragY > 100) onClose()
    setDragY(0)
  }

  if (!open) return null

  const sheetStyle = dragging
    ? { transform: `translateY(${dragY}px)`, transition: 'none' }
    : {}

  const rows = tab === 'today' ? todayItems : next7
  const showUndated = tab === 'upcoming' && undated.length > 0

  return (
    <>
      <div className="m-sheet-overlay" onClick={onClose} />
      <div className="m-sheet" style={sheetStyle}>
        <div
          className="m-sheet-drag"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="m-sheet-notch" />
          <span className="m-sheet-header">Tasks</span>
        </div>
        <MSwitcher items={TABS} active={tab} onSelect={setTab} />
        <div className="m-sheet-body">
          {rows.length === 0 && !showUndated ? (
            <p className="m-empty">
              {tab === 'today' ? 'Nothing on the list today.' : 'The week ahead is clear.'}
            </p>
          ) : (
            rows.map((t) => (
              <MobileTaskRow
                key={t.id}
                task={t} cat={dispCat(t)} catById={catById}
                inboxColor={inboxColor} busy={busy}
                onSetStatus={onSetStatus} onEdit={onEdit}
                progress={progressFn(t)}
                isSub={!!t.parent_task_id}
                subLabel={t.parent_task_id ? parentTitleFn(t) : undefined}
              />
            ))
          )}
          {showUndated && undated.map((t) => (
            <MobileTaskRow
              key={t.id}
              task={t} cat={dispCat(t)} catById={catById}
              inboxColor={inboxColor} busy={busy}
              onSetStatus={onSetStatus}
              progress={progressFn(t)}
              isSub={!!t.parent_task_id}
              subLabel={t.parent_task_id ? parentTitleFn(t) : undefined}
              badge="undated"
            />
          ))}
        </div>
        <div className="m-sheet-footer">All tasks · {total} →</div>
      </div>
    </>
  )
}
