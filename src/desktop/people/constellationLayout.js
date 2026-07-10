// LifeOS — constellation map layout (D13). Pure: data in, positions out.
// Deterministic, no physics. Clusters arranged on an ellipse, people
// spiraled within each cluster using the golden angle for natural spacing.

const GOLDEN = 2.399963 // golden angle in radians (~137.5deg)

// Returns { clusters: [{key, x, y, label}], nodes: Map<id, {x, y}> }
export function computeLayout(people, circles, W, H) {
  const byCircle = new Map()
  for (const p of people) {
    const key = p.home_circle_id || '__unfiled'
    if (!byCircle.has(key)) byCircle.set(key, [])
    byCircle.get(key).push(p)
  }

  const cNames = new Map(circles.map((c) => [c.id, c.name]))
  const keys = []
  for (const c of circles) { if (byCircle.has(c.id)) keys.push(c.id) }
  if (byCircle.has('__unfiled')) keys.push('__unfiled')

  const n = keys.length
  if (n === 0) return { clusters: [], nodes: new Map() }

  const cx = W / 2, cy = H / 2
  const rx = W * 0.32, ry = H * 0.28

  const clusters = []
  const nodes = new Map()

  keys.forEach((key, i) => {
    const members = byCircle.get(key)
    let clx, cly
    if (n === 1) { clx = cx; cly = cy }
    else {
      const a = (2 * Math.PI * i) / n - Math.PI / 2
      clx = cx + rx * Math.cos(a)
      cly = cy + ry * Math.sin(a)
    }
    clusters.push({
      key, x: clx, y: cly,
      label: key === '__unfiled' ? 'Unfiled' : (cNames.get(key) || ''),
    })

    const count = members.length
    members.forEach((p, j) => {
      let nx, ny
      if (count === 1) { nx = clx; ny = cly + 22 }
      else {
        const a = j * GOLDEN
        const r = 28 + 22 * Math.sqrt(j)
        nx = clx + r * Math.cos(a)
        ny = cly + 18 + r * Math.sin(a)
      }
      nodes.set(p.id, { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 })
    })
  })

  return { clusters, nodes }
}
