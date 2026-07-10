import { colorHex } from '../../spine/logic/palette'

// LedgerRow — one transaction in the day-grouped ledger. Shows account name,
// category dot+tag, description, and the amount (tabular-figure formatted,
// coloured by sign). Tap to select (the parent wires edit/delete).
export default function LedgerRow({ txn, accountName, categoryName, categoryColor, isSelected, onSelect }) {
  const amt = Number(txn.amount)
  const sign = amt >= 0 ? '+' : ''
  const fmtAmt = sign + amt.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const hex = colorHex(categoryColor)
  const isTransfer = txn.txn_type === 'transfer'

  return (
    <button
      className={'fin-ledger-row' + (isSelected ? ' is-selected' : '')}
      onClick={() => onSelect(txn.id)}
    >
      <span className="fin-ledger-acct">{accountName}</span>
      {!isTransfer && (
        <span className="fin-ledger-cat">
          {hex && <span className="fin-ledger-dot" style={{ background: hex }} />}
          <span className="fin-ledger-cat-name">{categoryName || 'Inbox'}</span>
        </span>
      )}
      {isTransfer && <span className="fin-ledger-cat"><span className="fin-ledger-cat-name">Transfer</span></span>}
      <span className="fin-ledger-desc">{txn.description || ''}</span>
      <span className={'fin-ledger-amt tnum' + (amt >= 0 ? ' is-pos' : ' is-neg')}>€{fmtAmt}</span>
    </button>
  )
}
