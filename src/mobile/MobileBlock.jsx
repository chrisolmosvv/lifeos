// One category-tinted block on the mobile day grid. Positioned absolutely by the
// caller (top/height/col/cols from layoutEvents). Coloured left bar + light fill.
// Tap is INERT in Phase 2 (edit is the ➕ form, Phase 3).

import { resolveColor, lighten } from '../spine/logic/colorModel'
import { colorHex, INBOX_COLOR } from '../spine/logic/palette'
import { timeRange } from '../spine/logic/dateUtils'

export default function MobileBlock({ item, cat, catById, top, height, col, cols, isPast }) {
  const hex = cat ? resolveColor(cat, catById) : (colorHex(INBOX_COLOR) || '#6B7280')
  const fill = lighten(hex, 0.85)
  const label = timeRange(item.start_at, item.end_at)
  const done = item.status === 'done'

  const style = {
    position: 'absolute',
    top,
    height: Math.max(height, 20),
    left: (col / cols) * 100 + '%',
    width: (1 / cols) * 100 + '%',
  }

  return (
    <div className={'m-block' + (done || isPast ? ' m-block--past' : '')} style={style}>
      <div className="m-block-bar" style={{ background: hex }} />
      <div className="m-block-body" style={{ background: fill }}>
        <span className="m-block-title">{item.title}</span>
        {height > 28 && <span className="m-block-time">{label}</span>}
      </div>
    </div>
  )
}
