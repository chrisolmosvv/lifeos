import './todayKit.css'

// TintedBlock — an Apple-style soft tinted block on the day grid: the category
// colour as a low-opacity fill plus a full-strength coloured left bar. Used for
// both events and scheduled tasks. Sealed kit block; presentation only — all
// interaction (move/resize/tap) is wired by the caller via `bind` (a set of
// pointer/click handlers spread onto the root). `dragging`/`removing` are just
// visual states during a drag.
//
// Props: title, time, hex, done, top, height, col, cols, bind, dragging, removing,
//        selected (a quiet outline while this block's form is open).
export default function TintedBlock({ title, time, hex, done, top, height, col, cols, bind, dragging, removing, selected }) {
  const width = `calc(${100 / cols}% - 4px)`
  const left = `calc(${(col * 100) / cols}% + 2px)`
  const style = {
    top,
    height,
    left,
    width,
    background: tint(hex, 0.14),
    borderLeft: `3px solid ${hex}`,
  }
  return (
    <div
      className={
        'tk-block' +
        (done ? ' is-done' : '') +
        (dragging ? ' is-dragging' : '') +
        (removing ? ' is-removing' : '') +
        (selected ? ' is-selected' : '')
      }
      style={style}
      {...bind}
    >
      {height >= 30 && time && <div className="tk-block-time">{time}</div>}
      <div className="tk-block-title">{title}</div>
    </div>
  )
}

// A #rrggbb hex + alpha → an rgba() string (so the fill is a soft tint of the
// category colour). Falls back to a neutral if the hex is somehow malformed.
function tint(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return `rgba(120,120,120,${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
