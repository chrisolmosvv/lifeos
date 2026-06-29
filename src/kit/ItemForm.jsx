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
  // Today/Park chips (Piece 3b): a plain-language pair that quietly sets the HIDDEN
  // time_bucket — Today='Today', Park='Someday' — without ever saying "bucket". They
  // touch ONLY time_bucket (never due_date/scheduled_*). `origBucket` is the value on
  // open; de-selecting an active chip reverts to it (the Piece-1 no-forced-default
  // guarantee). NOT NULL spine → t.time_bucket is always truthy on edit; the `||
  // 'Someday'` here is the SAME create fallback Piece 1 set (relocated from save, not
  // a second one) — so save writes a clean `time_bucket: bucket`.
  const origBucket = t.time_bucket || 'Someday'
  const [bucket, setBucket] = useState(origBucket)
  // event-only
  const [startAt, setStartAt] = useState(toInput(t.start_at))
  const [endAt, setEndAt] = useState(toInput(t.end_at))
  const [location, setLocation] = useState(t.location || '')
  // all-day (C7): a flag + date-only fields. The inclusive last date shown is
  // end_at − 1ms (storage is end-EXCLUSIVE midnight).
  const [allDay, setAllDay] = useState(!!t.all_day)
  const [startDate, setStartDate] = useState(dateOf(t.start_at) || todayStr())
  const [endDate, setEndDate] = useState(
    t.all_day && t.end_at ? dateOf(new Date(new Date(t.end_at).getTime() - 1)) : dateOf(t.start_at) || todayStr(),
  )
  // Progressive disclosure (Piece 3a): "more" is collapsed on CREATE, but on EDIT
  // it AUTO-EXPANDS when a behind-"more" field already holds data, so populated
  // fields are never silently hidden. Status + the disabled Repeat don't count
  // (Status always has a value; Repeat holds none). Pure read of the item.
  const [expanded, setExpanded] = useState(
    () => !create && !!(t.scheduled_start || t.priority || t.location || t.notes || (subtasks && subtasks.length)),
  )

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
        time_bucket: bucket, // the chip state (init = origBucket); chips set only this
      }
    } else if (allDay) {
      if (!startDate) return setErr('Pick a date.')
      const ed = endDate && endDate >= startDate ? endDate : startDate
      fields = {
        title: ttl,
        notes: notes.trim() || null,
        category_id: categoryId || null,
        location: location.trim() || null,
        all_day: true,
        start_at: midnightIso(startDate),
        end_at: midnightIso(addDayStr(ed, 1)), // end-exclusive midnight
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
        all_day: false,
      }
    }
    const msg = await onSave(fields, k)
    if (msg) setErr(msg)
  }

  const heading = (create ? 'New ' : 'Edit ') + k
  // Same field props feed both the core and the "more" render of ItemTypeFields —
  // identical inputs/setters, only the grouping differs (so what-saves is unchanged).
  const typeProps = {
    k,
    isSubtask,
    create,
    busy,
    task: { status, setStatus, priority, setPriority, due, setDue, schStart, setSchStart, schEnd, setSchEnd, bucket, setBucket, origBucket },
    event: { allDay, setAllDay, startAt, setStartAt, endAt, setEndAt, startDate, setStartDate, endDate, setEndDate, location, setLocation },
    subtask: { subtasks, onSubtask },
    notes: { notes, setNotes },
  }

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

            <ItemTypeFields slot="core" {...typeProps} />

            <button
              type="button"
              className="tk-form-moretoggle"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Fewer details' : 'More details'}
              <span className="tk-form-morechev">{expanded ? '▴' : '▾'}</span>
            </button>

            {expanded && (
              <div className="tk-form-more">
                <ItemTypeFields slot="more" {...typeProps} />
              </div>
            )}

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
// A timestamp/Date → "YYYY-MM-DD" (local), or '' when absent. (C7 all-day fields.)
function dateOf(v) {
  if (!v) return ''
  const d = new Date(v)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function todayStr() {
  return dateOf(new Date())
}
// "YYYY-MM-DD" → local-midnight ISO; +n days helper for the end-exclusive store.
function midnightIso(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toISOString()
}
function addDayStr(s, n) {
  const [y, m, d] = s.split('-').map(Number)
  const x = new Date(y, m - 1, d)
  x.setDate(x.getDate() + n)
  const p = (k) => String(k).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}
