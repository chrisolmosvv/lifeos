// ConnectionWeb — a small bounded SVG web of direct connections (D10/2).
// This person centred, direct links as nodes around them, hairline lines.
// Nodes are clickable → open that person's file. Calm: thin lines, generous
// space, ink only (no colour beyond the theme). Omitted when empty.

const SIZE = 240
const CX = SIZE / 2
const CY = SIZE / 2
const RADIUS = 85
const NODE_R = 4
const LABEL_OFFSET = 14

export default function ConnectionWeb({ personName, connections, onOpenPerson }) {
  if (!connections || connections.length === 0) return null

  const nodes = connections.slice(0, 8) // cap at 8 for calm

  return (
    <svg className="cweb" viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-label={`${personName}'s connections`}>
      {/* Lines from centre to each node */}
      {nodes.map((c, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
        const x = CX + RADIUS * Math.cos(angle)
        const y = CY + RADIUS * Math.sin(angle)
        return <line key={c.id + '-line'} x1={CX} y1={CY} x2={x} y2={y} className="cweb-line" />
      })}

      {/* Centre node */}
      <circle cx={CX} cy={CY} r={NODE_R + 1} className="cweb-center" />
      <text x={CX} y={CY - NODE_R - 6} className="cweb-label cweb-label--center" textAnchor="middle">
        {personName.length > 14 ? personName.slice(0, 13) + '…' : personName}
      </text>

      {/* Outer nodes */}
      {nodes.map((c, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
        const x = CX + RADIUS * Math.cos(angle)
        const y = CY + RADIUS * Math.sin(angle)
        const labelY = y < CY ? y - LABEL_OFFSET : y + LABEL_OFFSET + 4
        const name = c.name.length > 12 ? c.name.slice(0, 11) + '…' : c.name
        return (
          <g key={c.id} className="cweb-node" onClick={() => onOpenPerson?.(c.personId)} style={{ cursor: onOpenPerson ? 'pointer' : 'default' }}>
            <circle cx={x} cy={y} r={NODE_R} className="cweb-dot" />
            <text x={x} y={labelY} className="cweb-label" textAnchor="middle">{name}</text>
          </g>
        )
      })}
    </svg>
  )
}
