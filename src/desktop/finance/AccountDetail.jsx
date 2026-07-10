import { useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import AccountForm from './AccountForm'
import './financeDetail.css'

// AccountDetail — the right pane for a selected account. Shows name, type,
// institution, and starting_balance (cash only). "Edit" opens the form inline;
// "Archive" flips is_archived. Investment snapshot log is Commit B.
export default function AccountDetail({ account, onUpdate, onArchive }) {
  const [editing, setEditing] = useState(false)

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
        <button className="fin-detail-archive" onClick={() => onArchive(account.id, account.name)}>Archive</button>
      </div>
    </div>
  )
}
