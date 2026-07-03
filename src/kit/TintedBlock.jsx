import './blockKit.css'

// TintedBlock — an Apple-style soft tinted block on the day grid: the category
// colour as a low-opacity fill plus a full-strength coloured left bar. Used for
// both events and scheduled tasks. Sealed kit block; presentation only — all
// interaction (move/resize/tap) is wired by the caller via `bind` (a set of
// pointer/click handlers spread onto the root). `dragging`/`removing` are just
// visual states during a drag.
//
// Props: title, time, hex, done, top, height, col, cols, bind, dragging, removing,
//        selected (a quiet outline while this block's form is open),
//        appearDelay (V2-2: a number of ms → this block fades in with that stagger
//        delay; undefined → no appear animation. Decided by useBlockAppearance).
// V2-0b: a short block keeps a minimum GRAB area without inflating what you see.
// The interactive element (the one `bind` is spread onto, so useGridDrag reads its
// rect for move/resize edges) is a transparent wrapper at least HIT_MIN tall; the
// visible tinted block sits inside at its TRUE height, centred. For any block
// already >= HIT_MIN the wrapper equals the block exactly → byte-for-byte as before
// (HIT_MIN = 24px = the old 30-min floor, i.e. today's grab size unchanged). The
// drag engine is untouched. Centring is a top-offset (not a transform) so it never
// collides with the drag-lift scale() on the week.
const HIT_MIN = 24

export default function TintedBlock({ title, time, hex, done, top, height, col, cols, bind, dragging, removing, selected, appearDelay }) {
  const width = `calc(${100 / cols}% - 4px)`
  const left = `calc(${(col * 100) / cols}% + 2px)`
  const hitH = Math.max(height, HIT_MIN)
  const inset = (hitH - height) / 2 // visual's offset inside the (taller) hit box
  const appearing = appearDelay != null
  return (
    <div
      className="tk-block-hit"
      style={{ position: 'absolute', top: top - inset, height: hitH, left, width }}
      {...bind}
    >
      <div
        className={
          'tk-block' +
          (done ? ' is-done' : '') +
          (dragging ? ' is-dragging' : '') +
          (removing ? ' is-removing' : '') +
          (selected ? ' is-selected' : '') +
          (appearing ? ' is-appearing' : '')
        }
        style={{
          position: 'absolute',
          top: inset,
          height,
          left: 0,
          right: 0,
          background: tint(hex, 0.14),
          borderLeft: `3px solid ${hex}`,
          ...(appearing ? { animationDelay: `${appearDelay}ms` } : null),
        }}
      >
        {height >= 30 && time && <div className="tk-block-time">{time}</div>}
        <div className="tk-block-title">{title}</div>
      </div>
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
