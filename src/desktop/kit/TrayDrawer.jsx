import { useState } from 'react'
import { isInbox } from '../categoryTree'
import { resolveColor } from '../colorModel'
import { colorHex, INBOX_COLOR } from '../palette'
import './trayDrawer.css'

// The unscheduled tray (Phase 7, C5) — a right-side drawer of loose / this-week
// tasks that aren't time-blocked yet, ordered due-soonest (undated last). A
// working mini-list: "+ add" a loose task, tick to complete, DRAG a row onto the
// grid to schedule it (trayBind), or CLICK a row to edit it (the shared form;
// trayBind's onClick handles click-vs-drag). Empty = blank (spec §15). Sealed kit.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function TrayDrawer({ open, tasks, cats, busy, onAdd, onComplete, trayBind }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const byId = new Map(cats.map((c) => [c.id, c]))

  function submit() {
    const t = title.trim()
    if (t) onAdd(t)
    setTitle('')
    setAdding(false)
  }

  // V2-6: always mounted; the squeeze animates the outer width 0↔280 (driving the
  // grid's narrowing as one motion). The inner stays a fixed 280px so the contents
  // don't reflow mid-glide — the outer just clips/reveals them. Closed → hidden.
  return (
    <aside className={'wv-tray' + (open ? ' is-open' : '')} aria-hidden={!open}>
     <div className="wv-tray-inner">
      <div className="wv-tray-head">
        <span className="wv-tray-title">Unscheduled</span>
        <button className="wv-tray-add" onClick={() => setAdding(true)}>+ add</button>
      </div>

      {adding && (
        <input
          className="wv-tray-input"
          value={title}
          autoFocus
          placeholder="New task"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') { setTitle(''); setAdding(false) }
          }}
        />
      )}

      <div className="wv-tray-list">
        {tasks.map((t) => {
          const cat = t.category_id ? byId.get(t.category_id) : null
          const hex = cat ? resolveColor(cat, byId) : colorHex(INBOX_COLOR) || '#6B7280'
          const tag = cat && !isInbox(cat) ? cat.name : 'Inbox'
          const done = t.status === 'done'
          return (
            <div key={t.id} className={'wv-tray-row' + (done ? ' is-done' : '')} {...trayBind(t)}>
              <button
                className={'wv-tray-tick' + (done ? ' is-done' : '')}
                aria-label={done ? 'Mark not done' : 'Mark done'}
                disabled={busy}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onComplete(t.id, done) }}
              >
                {done ? '✓' : ''}
              </button>
              <span className="wv-tray-dot" style={{ background: hex }} />
              <span className="wv-tray-tag">{tag}</span>
              <span className="wv-tray-rowtitle">{t.title}</span>
              {t.due_date && <span className="wv-tray-due">{shortDue(t.due_date)}</span>}
            </div>
          )
        })}
      </div>
     </div>
    </aside>
  )
}

function shortDue(d) {
  const [, m, day] = d.split('-').map(Number)
  return `${day} ${MONTHS[m - 1]}`
}
