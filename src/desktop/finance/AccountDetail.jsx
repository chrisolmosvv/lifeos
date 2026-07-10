import { useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import AccountForm from './AccountForm'
import SnapshotLog from './SnapshotLog'
import ImportPreview from './ImportPreview'
import './financeDetail.css'

// AccountDetail — the right pane for a selected account. Shows name, type,
// institution, and starting_balance (cash only). "Edit" opens the form inline;
// "Archive" flips is_archived. Investment accounts show a SnapshotLog. Cash
// accounts show an "Import" action that opens the CSV import preview.
export default function AccountDetail({ account, onUpdate, onArchive, onImported }) {
  const [editing, setEditing] = useState(false)
  const [importing, setImporting] = useState(false)

  if (editing) {
    return (
      <div className="fin-detail">
        <AccountForm
          initial={account}
          onSave={async (fields) => {
            await onUpdate(account.id, fields)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  if (importing) {
    return (
      <div className="fin-detail">
        <ImportPreview
          accountId={account.id}
          onDone={() => { setImporting(false); onImported?.() }}
          onCancel={() => setImporting(false)}
        />
      </div>
    )
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
      {account.institution && (
        <p className="fin-detail-inst">{account.institution}</p>
      )}
      <HairlineRule />
      {isCash && (
        <div className="fin-detail-row">
          <span className="fin-detail-label">Starting balance</span>
          <span className="fin-detail-value tnum">€{fmtBal(account.starting_balance)}</span>
        </div>
      )}
      <div className="fin-detail-actions">
        <button className="fin-detail-edit" onClick={() => setEditing(true)}>Edit</button>
        {isCash && <button className="fin-detail-edit" onClick={() => setImporting(true)}>Import</button>}
        <button className="fin-detail-archive" onClick={() => onArchive(account.id, account.name)}>Archive</button>
      </div>
      {!isCash && <SnapshotLog accountId={account.id} />}
    </div>
  )
}
