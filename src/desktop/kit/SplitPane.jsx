import './splitPane.css'

// SplitPane — a two-pane desktop layout separated by a single vertical hairline.
// Sealed kit block: presentation only, no data. The left pane is narrower (the
// directory); the right pane fills the rest (the focus / detail area). Takes
// `left` and `right` as render props. Desktop only — responsive stacking is
// deferred to the mobile layer.
export default function SplitPane({ left, right }) {
  return (
    <div className="kit-split">
      <div className="kit-split-left">{left}</div>
      <div className="kit-split-divider" />
      <div className="kit-split-right">{right}</div>
    </div>
  )
}
