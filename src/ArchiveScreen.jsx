import { useEffect, useState } from 'react'
import { listArchiveBatches, unarchiveBatch, hardDeleteBatch } from './archive'
import ArchiveBatchRow from './kit/ArchiveBatchRow'
import Toast from './kit/Toast'
import './kit/archiveScreen.css'

// The Archive screen (Phase 7, A4). Lists every delete action (batch), newest
// first. Restore brings a batch back (reuses the A2 unarchiveBatch — no parallel
// restore). Delete-now permanently hard-deletes one batch behind an explicit
// naming confirm (the row owns that confirm). Reached from Settings; back returns.
export default function ArchiveScreen({ onBack }) {
  const [batches, setBatches] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  async function load() {
    const res = await listArchiveBatches()
    if (res.error) {
      setError(friendly(res.error))
      setBatches([])
      return
    }
    setError('')
    setBatches(res.batches)
  }

  useEffect(() => {
    load()
  }, [])

  // Restore = reuse the A2 helper. (A task/event whose category was meanwhile
  // hard-deleted already has category_id = null via the FK's ON DELETE SET NULL,
  // so it simply returns as Inbox — no orphan, no error, no special handling.)
  async function onRestore(batchId) {
    setBusy(true)
    const r = await unarchiveBatch(batchId)
    setBusy(false)
    if (r?.error) return setError(friendly(r.error))
    await load()
    setToast({ text: 'Restored' })
  }

  // The one irreversible action — scoped strictly to this batch's archived rows.
  async function onHardDelete(batchId) {
    setBusy(true)
    const r = await hardDeleteBatch(batchId)
    setBusy(false)
    if (r?.error) {
      setError(
        r.partial
          ? 'Some items were deleted; the rest are still in Archive — try again.'
          : friendly(r.error),
      )
      await load()
      return
    }
    await load()
  }

  return (
    <div className="ar">
      <div className="ar-top">
        <button className="ar-back" onClick={onBack}>‹ Back to Settings</button>
      </div>
      <h2 className="ar-title">Archive</h2>
      <p className="ar-sub">
        Deleted things, grouped by when you removed them. Restore brings a group back;
        Delete now removes it for good (no undo).
      </p>

      {batches === null ? (
        <p className="ar-empty">Loading…</p>
      ) : batches.length === 0 ? (
        <p className="ar-empty">Nothing archived.</p>
      ) : (
        <ul className="ar-list">
          {batches.map((b) => (
            <ArchiveBatchRow
              key={b.id}
              batch={b}
              busy={busy}
              onRestore={onRestore}
              onHardDelete={onHardDelete}
            />
          ))}
        </ul>
      )}

      {error && <p className="ar-error">{error}</p>}
      {toast && <Toast text={toast.text} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function friendly(error) {
  return error.message || 'Something went wrong.'
}
