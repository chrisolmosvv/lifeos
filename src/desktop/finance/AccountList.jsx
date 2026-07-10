import { useState } from 'react'
import AccountForm from './AccountForm'

// AccountList — the left pane of the Accounts split. Fixed order: cash first,
// then investment. "+ Add account" (terracotta) opens the create form inline.
// Archive toggle at the bottom (ink, not accent) shows/hides archived accounts.
export default function AccountList({ accounts, selectedId, onSelect, onCreate, archived, showArchived, onToggleArchived, onRestore }) {
  const [adding, setAdding] = useState(false)

  const cashAccounts = accounts.filter((a) => a.account_type === 'cash')
  const investAccounts = accounts.filter((a) => a.account_type === 'investment')

  return (
    <div className="fin-list">
      {adding ? (
        <AccountForm
          initial={null}
          onSave={async (fields) => { await onCreate(fields); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button className="fin-add-btn" onClick={() => setAdding(true)}>+ Add account</button>
      )}

      {cashAccounts.length > 0 && (
        <div className="fin-group">
          <p className="fin-group-label">Cash</p>
          {cashAccounts.map((a) => (
            <button key={a.id} className={'fin-row' + (a.id === selectedId ? ' is-selected' : '')} onClick={() => onSelect(a.id)}>
              <span className="fin-row-name">{a.name}</span>
              {a.institution && <span className="fin-row-inst">{a.institution}</span>}
            </button>
          ))}
        </div>
      )}

      {investAccounts.length > 0 && (
        <div className="fin-group">
          <p className="fin-group-label">Investment</p>
          {investAccounts.map((a) => (
            <button key={a.id} className={'fin-row' + (a.id === selectedId ? ' is-selected' : '')} onClick={() => onSelect(a.id)}>
              <span className="fin-row-name">{a.name}</span>
              {a.institution && <span className="fin-row-inst">{a.institution}</span>}
            </button>
          ))}
        </div>
      )}

      {showArchived ? (
        <div className="fin-archived">
          <button className="fin-archived-toggle" onClick={onToggleArchived}>Hide archived</button>
          {archived.map((a) => (
            <div className="fin-archived-row" key={a.id}>
              <span className="fin-archived-name">{a.name}</span>
              <button className="fin-restore-btn" onClick={() => onRestore(a.id)}>Restore</button>
            </div>
          ))}
          {archived.length === 0 && <p className="fin-no-match">No archived accounts.</p>}
        </div>
      ) : (
        <button className="fin-archived-toggle" onClick={onToggleArchived}>Show archived</button>
      )}
    </div>
  )
}
