// The curated category palette — ONE editable source of truth. Change a `light`
// value here and it updates everywhere (the DB stores the colour *id*, e.g.
// 'teal', not a hex, so re-tuning a hue never needs a data migration).
//
// Muted, editorial "magazine-section" colours against the warm paper — never
// neon. Each entry is an object so a per-colour `dark` variant (the evening
// edition) can be added later without a rewrite. Light-mode values only now.
//
// Honest note for the art director: 16 hues is reachable, but a few sit as
// close pairs. The first 12 (the "core") are the truly at-a-glance-distinct
// set; the last 4 are deliberate LIGHTER SHADES of existing families (green,
// blue, purple, gold), handy for sub-categories but not independently distinct.
// Recommendation: lock the 12 as core, keep the 4 as shades — don't force 16.
//
// The warm reds here (brick/wine) are kept darker/browner than the terracotta
// ACCENT (#C8643D) on purpose, so a category dot never reads as "urgent/now".

export const PALETTE = [
  // --- Core 12 (distinct at a glance) ---
  { id: 'slate', name: 'Slate', light: '#6B7280' }, // Inbox's default
  { id: 'stone', name: 'Stone', light: '#8C8275' },
  { id: 'teal', name: 'Teal', light: '#3B6B6B' }, // doc: Uni
  { id: 'pine', name: 'Pine', light: '#41705A' },
  { id: 'sage', name: 'Sage', light: '#6E8B5A' }, // doc: Health
  { id: 'olive', name: 'Olive', light: '#87833F' },
  { id: 'ochre', name: 'Ochre', light: '#A87B3A' }, // doc: Admin
  { id: 'brick', name: 'Brick', light: '#A85C44' },
  { id: 'wine', name: 'Wine', light: '#874E58' },
  { id: 'plum', name: 'Plum', light: '#9A6A7B' }, // doc: Social
  { id: 'mauve', name: 'Mauve', light: '#7E6597' },
  { id: 'steel', name: 'Steel', light: '#4E789C' },
  // --- 4 shades (lighter family variants, for sub-categories) ---
  { id: 'moss', name: 'Moss', light: '#9AAC7B' },
  { id: 'sky', name: 'Sky', light: '#84A6C4' },
  { id: 'lilac', name: 'Lilac', light: '#B08FB8' },
  { id: 'sand', name: 'Sand', light: '#C2A56B' },
]

// How many of the entries above are the distinct "core" (the rest are shades).
export const CORE_COUNT = 12

// Inbox's sensible default colour (per the design doc: slate).
export const INBOX_COLOR = 'slate'

const BY_ID = Object.fromEntries(PALETTE.map((c) => [c.id, c]))

// Hex for a stored colour id (or null if unset/unknown).
export function colorHex(id) {
  return BY_ID[id]?.light ?? null
}

// Human name for a stored colour id (or null).
export function colorName(id) {
  return BY_ID[id]?.name ?? null
}
