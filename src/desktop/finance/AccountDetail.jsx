import { useRef, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import AccountForm from './AccountForm'
import SnapshotLog from './SnapshotLog'
import ImportPreview from './ImportPreview'
import { parseRevolutCsv } from './csvParsers'
import './financeDetail.css'

// AccountDetail — the right pane for a selected account. Cash accounts show
// an "Import" action that opens a file picker, parses the CSV, and hands the
// parsed rows to ImportPreview. Currently Revolut only (ING stubbed — Piece 5c).
export default function AccountDetail({ account, onUpdate, onArchive, onImported }) {
  const [editing, setEditing] = useState(false)
  const [importData, setImportData] = useState(null) // { parsedRows, skippedState, skippedCurrency }
  const [importError, setImportError] = useState('')
  const fileRef = useRef(null)

  if (editing) {
    return (
      <div className="fin-detail">
        <AccountForm
          initial={account}
          onSave={async (fields) => { await onUpdate(account.id, fields); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  if (importData) {
    return (
      <div className="fin-detail">
        <ImportPreview
          accountId={account.id}
          parsedRows={importData.parsedRows}
          skippedState={importData.skippedState}
          skippedCurrency={importData.skippedCurrency}
          onDone={() => { setImportData(null); onImported?.() }}
          onCancel={() => setImportData(null)}
        />
      </div>
    )
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const text = await file.text()
      const { rows, skippedState, skippedCurrency } = parseRevolutCsv(text)
      if (!rows.length) { setImportError('No importable rows found in this file.'); return }
      setImportData({ parsedRows: rows, skippedState, skippedCurrency })
    } catch (err) {
      setImportError(err.message || 'Could not read this file.')
    }
    // Reset the input so re-selecting the same file triggers onChange again.
    if (fileRef.current) fileRef.current.value = ''
  }

  const isCash = account.account_type === 'cash'
  const fmtBal = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
  }

  return (
    <div className="fin-detail">
      <SmallCapsLabel>{isCash ? 'Cash account' : 'Investment account'}</SmallCapsLabel>
      <h2 className="fin-detail-name">{account.name}</h2>
      {account.institution && <p className="fin-detail-inst">{account.institution}</p>}
      <HairlineRule />
      {isCash && (
        <div className="fin-detail-row">
          <span className="fin-detail-label">Starting balance</span>
          <span className="fin-detail-value tnum">€{fmtBal(account.starting_balance)}</span>
        </div>
      )}
      <div className="fin-detail-actions">
        <button className="fin-detail-edit" onClick={() => setEditing(true)}>Edit</button>
        {isCash && (
          <label className="fin-detail-edit fin-import-label">
            Import (Revolut)
            <input ref={fileRef} type="file" accept=".csv" className="fin-import-file-input" onChange={handleFileChange} />
          </label>
        )}
        <button className="fin-detail-archive" onClick={() => onArchive(account.id, account.name)}>Archive</button>
      </div>
      {importError && <p className="fin-import-error">{importError}</p>}
      {!isCash && <SnapshotLog accountId={account.id} />}
    </div>
  )
}
