// The category colour model (Phase 7, T13): shade-with-override. A category with
// an explicit `color` (a palette id) is CUSTOM/pinned. A category with NO color is
// DERIVED — at RENDER TIME it takes a lighter shade of its parent's resolved
// colour (so re-colouring a parent re-shades its derived children automatically).
// Derived colours are NEVER written to the DB — `color` stays null for them.
//
// Pure helpers, no data access. Used by the Settings category manager now; the
// other screens still read `color` as-is (they don't import this) — wiring derived
// colours into Today/All Tasks/Calendar is a deliberate later change.

import { colorHex } from './palette'

// Uncoloured top-level categories fall back to this calm neutral.
const DEFAULT_BASE = '#8C8275' // Stone
const STEP = 0.16 // each derived level lightens by this fraction (toward white)

export function isDerived(cat) {
  return !cat?.color
}

// The resolved hex for a category: its own palette colour if pinned, else a
// shade of its parent's resolved colour (top-level derived → the default base).
// `byId` is a Map of id → category row. Bounded against any stray cycle.
export function resolveColor(cat, byId, _depth = 0) {
  if (!cat || _depth > 8) return DEFAULT_BASE
  if (cat.color) return colorHex(cat.color) || DEFAULT_BASE
  const parent = cat.parent_id ? byId.get(cat.parent_id) : null
  if (!parent) return DEFAULT_BASE
  return lighten(resolveColor(parent, byId, _depth + 1), STEP)
}

// Mix a #rrggbb hex toward white by `amt` (0..1).
export function lighten(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return DEFAULT_BASE
  const n = parseInt(m[1], 16)
  const mix = (c) => Math.round(c + (255 - c) * amt)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}
