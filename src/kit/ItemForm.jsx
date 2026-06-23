import { useState } from 'react'
import CategoryTag from '../CategoryTag'
import CategoryPicker from './CategoryPicker'
import ItemTypeFields from './ItemTypeFields'
import './todayForm.css'

// ItemForm — the ONE shared create/edit form (Phase 7, C3), used by BOTH Today and
// Calendar. Promoted from the old Today-only TodayForm: same presentation, same
// writes (onSave(fields, kind) / onDelete), now canonical for both screens so the
// two never drift. The task/event toggle shows only while CREATING (`toggle`); on
// edit the type is locked (no event↔task conversion). New items default to event.
// Type-specific fields live in ItemTypeFields (incl. the disabled all-day + repeat
// placeholders). The parent wires onSave/onDelete to the existing write paths.
//
// Props: kind, item, create, toggle, cats, inboxColor, busy,
//        onSave(fields,kind)=>msg|null, onDelete()=>void, onClose(),
//        subtasks?, onSubtask?, parentLabel?  (Today-only subtask wiring; optional).
export default function ItemForm({ kind, item, create, toggle, cats, inboxColor, busy, onSave, onDelete, onClose, subtasks, onSubtask, parentLabel }) {
  const t = item || {}
  // A subtask's own form: no category (it inherits the parent's), no priority, and
  // no nested-subtasks section. One level — enforced here and in the DB.
  const isSubtask = !!t.parent_task_id
  const [k, setK] = useState(kind) // the effective kind (a toggle can flip it on create)
  const [title, setTitle] = useState(t.title || '')
  const [notes, setNotes] = useState(t.notes || '')
  const [categoryId, setCategoryId] = useState(t.category_id ?? null)
  const [showPick, setShowPick] = useState(false)
  const [err, setErr] = useState('')
  // task-only
  const [status, setStatus] = useState(t.status || 'open')
  const [priority, setPriority] = useState(t.priority ?? null)
  const [due, setDue] = useState(t.due_date || '')
  const [schStart, setSchStart] = useState(toInput(t.scheduled_start))
  const [schEnd, setSchEnd] = useState(toInput(t.scheduled_end))
  // event-only
  const [startAt, setStartAt] = useState(toInput(t.start_at))
  const [endAt, setEndAt] = useState(toInput(t.end_at))
  const [location, setLocation] = useState(t.location || '')

  const selectedCat = categoryId ? cats.find((c) => c.id === categoryId) : null
  const catTag = selectedCat
    ? { name: selectedCat.name, color: selectedCat.color }
    : { name: 'Inbox', color: inboxColor }

  async function save() {
    const ttl = title.trim()
    if (!ttl) return setErr('Give it a title.')
    let fields
    if (k === 'task') {
      let ss = null
      let se = null
      if (schStart) {
        ss = new Date(schStart).toISOString()
        se = new Date(schEnd || new Date(new Date(schStart).getTime() + 3600000)).toISOString()
      }
      fields = {
        title: ttl,
        notes: notes.trim() || null,
        category_id: categoryId || null,
        status,
        priority: priority || null,
        due_date: due || null,
        scheduled_start: ss,
        scheduled_end: se,
        time_bucket: t.time_bucket || 'Today',
      }
    } else {
      if (!startAt || !endAt) return setErr('An event needs a start and end.')
      fields = {
        title: ttl,
        notes: notes.trim() || null,
        category_id: categoryId || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        location: location.trim() || null,
      }
    }
    const msg = await onSave(fields, k)
    if (msg) setErr(msg)
  }

  const heading = (create ? 'New ' : 'Edit ') + k

  return (
    <div className="tk-form-scrim" onClick={onClose}>
      <div className="tk-form" onClick={(e) => e.stopPropagation()}>
        <div className="tk-form-head">
          <h3 className="tk-form-title">{heading}</h3>
          <button className="tk-form-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        {showPick ? (
          <div className="tk-form-body">
            <button className="tk-form-back" onClick={() => setShowPick(false)}>‹ Back</button>
            <CategoryPicker
              cats={cats}
              value={categoryId}
              inboxColor={inboxColor}
              onPick={(id) => {
                setCategoryId(id)
                setShowPick(false)
              }}
            />
          </div>
        ) : (
          <div className="tk-form-body">
            {toggle && (
              <div className="tk-form-toggle">
                <button type="button" className={'tk-form-tog' + (k === 'event' ? ' is-on' : '')} onClick={() => setK('event')}>Event</button>
                <button type="button" className={'tk-form-tog' + (k === 'task' ? ' is-on' : '')} onClick={() => setK('task')}>Task</button>
              </div>
            )}
            {isSubtask && <div className="tk-form-parent">↳ under {parentLabel || 'a task'}</div>}

            <input
              className="tk-form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={k === 'task' ? 'Task title' : 'Event title'}
              aria-label="Title"
              autoFocus
            />

            {!isSubtask && (
              <button className="tk-form-catbtn" onClick={() => setShowPick(true)}>
                <span className="tk-form-fieldlabel">Category</span>
                <CategoryTag name={catTag.name} color={catTag.color} />
                <span className="tk-form-catchev">›</span>
              </button>
            )}

            <ItemTypeFields
              k={k}
              isSubtask={isSubtask}
              create={create}
              busy={busy}
              task={{ status, setStatus, priority, setPriority, due, setDue, schStart, setSchStart, schEnd, setSchEnd }}
              event={{ startAt, setStartAt, endAt, setEndAt, location, setLocation }}
              subtask={{ subtasks, onSubtask }}
            />

            <textarea
              className="tk-form-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              aria-label="Notes"
              rows={2}
            />

            {err && <p className="tk-form-err">{err}</p>}

            <div className="tk-form-actions">
              {!create ? (
                <button className="tk-form-del" onClick={onDelete} disabled={busy}>Delete</button>
              ) : (
                <span />
              )}
              <div className="tk-form-actions-right">
                <button className="tk-form-cancel" onClick={onClose}>Cancel</button>
                <button className="tk-form-save" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// A timestamp (ISO or Date) → "YYYY-MM-DDTHH:MM" for a datetime-local input, or
// '' when absent.
function toInput(v) {
  if (!v) return ''
  const d = new Date(v)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
