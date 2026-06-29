// PlanningModes — the calm time | board | category toggle for the Planning view.
// Time is the only live mode; board + category render as visibly-disabled "soon"
// affordances (no dead clicks). Sealed kit block; the parent owns the mode state.
//
// Props: mode (the active mode id), onSetTime (() => void).
const MODES = [
  { id: 'time', label: 'Time' },
  { id: 'board', label: 'Board' },
  { id: 'category', label: 'Category' },
]

export default function PlanningModes({ mode, onSetTime }) {
  return (
    <div className="pl-modes" role="tablist">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={'pl-mode' + (mode === m.id ? ' is-active' : '')}
          onClick={m.id === 'time' ? onSetTime : undefined}
          disabled={m.id !== 'time'}
          title={m.id === 'time' ? undefined : 'Coming soon'}
        >
          {m.label}
          {m.id !== 'time' && <span className="pl-soon">soon</span>}
        </button>
      ))}
    </div>
  )
}
