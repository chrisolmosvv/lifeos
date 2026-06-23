import { useState } from 'react'
import CategoryTag from '../CategoryTag'
import StatusPill from './StatusPill'
import CategoryPicker from './CategoryPicker'
import SubtaskList from './SubtaskList'
import './todayForm.css'

// TodayForm — the Today-scoped create/edit form (a sealed kit block). Same form,
// prefilled, for both create and edit, for tasks and events. It is SEPARATE from
// the shared TaskPanel/EventPanel (which Calendar still uses) — by design, so
// changing Today never touches Calendar. Writes go out through onSave/onDelete,
// which the parent wires to the EXISTING task/event write paths.
//
// Props: kind ('task'|'event'), item (row or prefill), create (bool), cats,
//        inboxColor, busy, onSave(fields)=>msg|null, onDelete()=>void, onClose().
const PRIORITIES = [
  { id: null, label: 'None' },
  { id: 'low', label: 'Low' },
  { id: 'med', label: 'Med' },
  { id: 'high', label: 'High' },
]

export default function TodayForm({ kind, item, create, toggle, cats, inboxColor, busy, onSave, onDelete, onClose, subtasks, onSubtask, parentLabel }) {
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
            <button className="tk-form-back" onClick={() => setShowPick(false)}>
              ‹ Back
            </button>
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
                <button
                  type="button"
                  className={'tk-form-tog' + (k === 'event' ? ' is-on' : '')}
                  onClick={() => setK('event')}
                >
                  Event
                </button>
                <button
                  type="button"
                  className={'tk-form-tog' + (k === 'task' ? ' is-on' : '')}
                  onClick={() => setK('task')}
                >
                  Task
                </button>
              </div>
            )}
            {isSubtask && (
              <div className="tk-form-parent">↳ under {parentLabel || 'a task'}</div>
            )}

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

            {k === 'task' ? (
              <>
                <div className="tk-form-field">
                  <span className="tk-form-fieldlabel">Status</span>
                  <StatusPill status={status} onSet={setStatus} />
                </div>
                {!isSubtask && (
                  <div className="tk-form-field">
                    <span className="tk-form-fieldlabel">Priority</span>
                    <div className="tk-form-prios">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          className={'tk-form-prio' + ((priority ?? null) === p.id ? ' is-on' : '')}
                          onClick={() => setPriority(p.id)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="tk-form-field">
                  <span className="tk-form-fieldlabel">Due date</span>
                  <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </label>
                <div className="tk-form-field">
                  <span className="tk-form-fieldlabel">Schedule (optional)</span>
                  <div className="tk-form-times">
                    <input type="datetime-local" value={schStart} onChange={(e) => setSchStart(e.target.value)} aria-label="Scheduled start" />
                    <input type="datetime-local" value={schEnd} onChange={(e) => setSchEnd(e.target.value)} aria-label="Scheduled end" />
                  </div>
                </div>
                {!isSubtask && !create && onSubtask && (
                  <SubtaskList
                    subtasks={subtasks || []}
                    busy={busy}
                    onAdd={onSubtask.add}
                    onUpdate={onSubtask.update}
                    onSetStatus={onSubtask.setStatus}
                    onRemove={onSubtask.remove}
                  />
                )}
              </>
            ) : (
              <>
                <div className="tk-form-field">
                  <span className="tk-form-fieldlabel">Start / End</span>
                  <div className="tk-form-times">
                    <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} aria-label="Start" />
                    <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} aria-label="End" />
                  </div>
                </div>
                <label className="tk-form-field">
                  <span className="tk-form-fieldlabel">Location</span>
                  <input className="tk-form-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
                </label>
              </>
            )}

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
                <button className="tk-form-save" onClick={save} disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
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
