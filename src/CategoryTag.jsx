import { colorHex } from './palette'
import './categoryTag.css'

// The reusable category mark: a small coloured dot + a short uppercase tag,
// newspaper-section style. Calm and small — never a big block of colour.
// `color` is a palette id (e.g. 'teal'); falsy means uncoloured (a hollow dot).
// Built so the calendar can reuse the exact look later — NOT wired there yet.
export default function CategoryTag({ name, color }) {
  const hex = colorHex(color)
  return (
    <span className="cat-tag">
      <span
        className={'cat-dot' + (hex ? '' : ' is-empty')}
        style={hex ? { background: hex } : undefined}
      />
      <span className="cat-tag-label">{name}</span>
    </span>
  )
}
