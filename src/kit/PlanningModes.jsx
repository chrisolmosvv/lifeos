// PlanningModes — the calm time | board | category toggle for the Planning view.
// `liveModes` lists which modes are selectable; the rest render as visibly-disabled
// "soon" affordances (no dead clicks). Sealed kit block; the parent owns the state.
//
// Props: mode (active id), onSelect(id), liveModes (array of live mode ids).
const MODES = [
  { id: 'time', label: 'Time' },
  { id: 'board', label: 'Board' },
  { id: 'category', label: 'Category' },
]

export default function PlanningModes({ mode, onSelect, liveModes }) {
  return (
    <div className="pl-modes" role="tablist">
      {MODES.map((m) => {
        const live = liveModes.includes(m.id)
        return (
          <button
            key={m.id}
            className={'pl-mode' + (mode === m.id ? ' is-active' : '')}
            onClick={live ? () => onSelect(m.id) : undefined}
            disabled={!live}
            title={live ? undefined : 'Coming soon'}
          >
            {m.label}
            {!live && <span className="pl-soon">soon</span>}
          </button>
        )
      })}
    </div>
  )
}
