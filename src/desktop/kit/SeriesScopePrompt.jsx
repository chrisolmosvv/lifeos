import './seriesScopePrompt.css'

// The "apply your change to…" scope prompt for editing a repeat occurrence (T10,
// Piece 3a). Calm + hairline (broadsheet — paper, rules, no box/shadow/fill). Shows
// only when saving an edit to an occurrence that belongs to a series. onPick returns
// 'one' | 'following' | 'all'; onCancel aborts the save (nothing written).
export default function SeriesScopePrompt({ kind, mode = 'edit', onPick, onCancel }) {
  const one = kind === 'transaction' ? 'This occurrence' : (kind === 'task' ? 'This task' : 'This event')
  const all = kind === 'transaction' ? 'All occurrences' : (kind === 'task' ? 'All tasks' : 'All events')
  const heading = mode === 'delete' ? 'Delete…' : 'Apply your change to…'
  return (
    <div className="tk-form-scrim" onClick={onCancel}>
      <div className="ssp" onClick={(e) => e.stopPropagation()}>
        <p className="ssp-q">{heading}</p>
        <button className="ssp-opt" onClick={() => onPick('one')}>{one}</button>
        <button className="ssp-opt" onClick={() => onPick('following')}>This and following</button>
        <button className="ssp-opt" onClick={() => onPick('all')}>{all}</button>
        <button className="ssp-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
