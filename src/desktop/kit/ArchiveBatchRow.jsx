import { useState } from 'react'
import './archiveScreen.css'

// One batch (delete action) on the Archive screen (Phase 7, A4). Shows the label,
// what it holds, and when it was archived, with Restore (safe) and Delete-now
// (irreversible — gated behind an explicit naming confirm). Sealed kit block; it
// only calls onRestore/onHardDelete.
export default function ArchiveBatchRow({ batch, busy, onRestore, onHardDelete }) {
  const [confirming, setConfirming] = useState(false)
  const c = batch.counts

  return (
    <li className="ar-row">
      <div className="ar-main">
        <div className="ar-line">
          <span className="ar-type">{batch.source_type}</span>
          <span className="ar-label">{batch.label || '(untitled)'}</span>
          <span className="ar-when">{ago(batch.created_at)}</span>
        </div>
        <div className="ar-counts">{summary(c)}</div>
      </div>

      {confirming ? (
        <div className="ar-confirm">
          <span className="ar-confirm-text">
            Permanently delete <b>{batch.label || 'this'}</b> — {summary(c)}? This cannot be undone.
          </span>
          <button className="ar-danger" disabled={busy} onClick={() => { setConfirming(false); onHardDelete(batch.id) }}>
            Delete forever
          </button>
          <button className="ar-cancel" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      ) : (
        <div className="ar-actions">
          <button className="ar-restore" disabled={busy} onClick={() => onRestore(batch.id)}>Restore</button>
          <button className="ar-delnow" disabled={busy} onClick={() => setConfirming(true)}>Delete now</button>
        </div>
      )}
    </li>
  )
}

// "3 categories, 8 tasks, 1 event" (omit zero parts; fall back to "0 items").
function summary(c) {
  const parts = []
  if (c.categories) parts.push(plural(c.categories, 'category', 'categories'))
  if (c.tasks) parts.push(plural(c.tasks, 'task', 'tasks'))
  if (c.events) parts.push(plural(c.events, 'event', 'events'))
  return parts.length ? parts.join(', ') : '0 items'
}
function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

// A calm relative time: "today", "yesterday", "3 days ago", else a date.
function ago(iso) {
  const then = new Date(iso)
  const now = new Date()
  const days = Math.floor((startOfDay(now) - startOfDay(then)) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MO[then.getMonth()]} ${then.getDate()}`
}
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
