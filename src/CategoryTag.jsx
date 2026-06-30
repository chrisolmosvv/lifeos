import { colorHex } from './palette'
import './categoryTag.css'

// The reusable category mark: a small coloured dot + a short uppercase tag,
// newspaper-section style. Calm and small — never a big block of colour.
// `color` is a palette id (e.g. 'teal'); falsy means uncoloured (a hollow dot).
// `hex` (V2-1, optional) is a resolved colour that OVERRIDES the palette lookup —
// it lets a caller pass a derived sub-branch shade (resolveColor) so the dot
// matches the grid block. Callers that don't pass it behave exactly as before.
export default function CategoryTag({ name, color, hex }) {
  const dot = hex || colorHex(color)
  return (
    <span className="cat-tag">
      <span
        className={'cat-dot' + (dot ? '' : ' is-empty')}
        style={dot ? { background: dot } : undefined}
      />
      <span className="cat-tag-label">{name}</span>
    </span>
  )
}
