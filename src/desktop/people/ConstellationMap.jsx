import { useMemo, useState } from 'react'
import { computeLayout } from './constellationLayout'
import './constellation.css'

// ConstellationMap — the whole-web view (D13). All people on one map,
// clustered by home circle, connections revealed on hover. Calm at rest:
// NO lines drawn until you focus a person — then only their ties light up
// and the rest dims. The single terracotta mark is the focused person.

const VW = 1000
const VH = 660
const DOT_R = 2.5

export default function ConstellationMap({ people, circles, connections, onOpenPerson }) {
  const [focused, setFocused] = useState(null)
  const [chip, setChip] = useState(null) // null = All
  const [query, setQuery] = useState('')

  // Filter by active circle chip
  const visible = useMemo(() => {
    if (!chip) return people
    if (chip === '__unfiled') return people.filter((p) => !p.home_circle_id)
    return people.filter((p) => p.home_circle_id === chip)
  }, [people, chip])

  const { clusters, nodes } = useMemo(
    () => computeLayout(visible, circles, VW, VH),
    [visible, circles]
  )

  const visibleIds = useMemo(() => new Set(visible.map((p) => p.id)), [visible])
  const visConns = useMemo(
    () => connections.filter((c) => visibleIds.has(c.person_a_id) && visibleIds.has(c.person_b_id)),
    [connections, visibleIds]
  )

  // Direct ties of the focused person
  const ties = useMemo(() => {
    if (!focused) return new Set()
    const s = new Set()
    for (const c of connections) {
      if (c.person_a_id === focused) s.add(c.person_b_id)
      if (c.person_b_id === focused) s.add(c.person_a_id)
    }
    return s
  }, [focused, connections])

  // Search highlight
  const sq = query.toLowerCase().trim()
  const matches = sq
    ? new Set(visible.filter((p) => p.name.toLowerCase().includes(sq)).map((p) => p.id))
    : null

  const hasUnfiled = people.some((p) => !p.home_circle_id)

  function nCls(id) {
    if (focused) {
      if (id === focused) return 'cmap-node cmap-node--focus'
      if (ties.has(id)) return 'cmap-node cmap-node--tie'
      return 'cmap-node cmap-node--dim'
    }
    if (matches) return matches.has(id) ? 'cmap-node cmap-node--match' : 'cmap-node cmap-node--dim'
    return 'cmap-node'
  }

  function lCls(c) {
    if (!focused) return 'cmap-line cmap-line--rest'
    return (c.person_a_id === focused || c.person_b_id === focused)
      ? 'cmap-line cmap-line--active'
      : 'cmap-line cmap-line--hide'
  }

  const chipCls = (k) => 'cmap-chip' + (chip === k ? ' cmap-chip--on' : '')
  const trunc = (s, max) => s.length > max ? s.slice(0, max - 1) + '\u2026' : s

  return (
    <div className="cmap">
      <div className="cmap-bar">
        <input className="cmap-search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search\u2026" aria-label="Search the map" />
        <div className="cmap-chips">
          <button className={chipCls(null)} onClick={() => setChip(null)}>All</button>
          {circles.map((c) => (
            <button key={c.id} className={chipCls(c.id)} onClick={() => setChip(c.id)}>{c.name}</button>
          ))}
          {hasUnfiled && (
            <button className={chipCls('__unfiled')} onClick={() => setChip('__unfiled')}>Unfiled</button>
          )}
        </div>
      </div>

      <svg className="cmap-svg" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet">
        {/* Connection lines */}
        {visConns.map((c) => {
          const a = nodes.get(c.person_a_id), b = nodes.get(c.person_b_id)
          if (!a || !b) return null
          return <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={lCls(c)} />
        })}

        {/* Cluster labels */}
        {clusters.map((cl) => (
          <text key={cl.key} x={cl.x} y={cl.y - 6} className="cmap-label" textAnchor="middle">
            {cl.label}
          </text>
        ))}

        {/* Person nodes */}
        {visible.map((p) => {
          const pos = nodes.get(p.id)
          if (!pos) return null
          return (
            <g key={p.id} className={nCls(p.id)}
               onMouseEnter={() => setFocused(p.id)}
               onMouseLeave={() => setFocused(null)}
               onClick={() => onOpenPerson?.(p.id)}
               style={{ cursor: 'pointer' }}>
              <circle cx={pos.x} cy={pos.y} r={DOT_R} />
              <text x={pos.x} y={pos.y - 8} textAnchor="middle">{trunc(p.name, 16)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
