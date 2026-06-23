import { colorHex } from '../palette'
import './allTasksKit.css'

// CategoryDrillRow — a row on the All Tasks screen you tap to drill into a
// category: its colour dot, name, the whole-sub-tree active-task count, and a
// chevron. Sealed kit block; presentation + an onClick only. `color` is a palette
// id (or null/inboxColor for Inbox).
export default function CategoryDrillRow({ name, color, count, onClick }) {
  const hex = colorHex(color)
  return (
    <button className="at-drill" onClick={onClick}>
      <span
        className={'at-drill-dot' + (hex ? '' : ' is-empty')}
        style={hex ? { background: hex } : undefined}
      />
      <span className="at-drill-name">{name}</span>
      <span className="at-drill-count tnum">{count}</span>
      <span className="at-drill-chev">›</span>
    </button>
  )
}
