// Mobile rebuild of desktop StatusCycle. Same cycle logic (open → in_progress →
// done → open), m- CSS prefix, tap-only (no label text — just the mark glyph).
// Calls onSet(nextStatus); the caller owns the write.

const NEXT = { open: 'in_progress', in_progress: 'done', done: 'open' }

function Mark({ status }) {
  if (status === 'done') {
    return (
      <svg className="m-stat-mark" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill="currentColor" />
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <svg className="m-stat-mark" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 1.5 A4.5 4.5 0 0 1 6 10.5 Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className="m-stat-mark" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function MobileStatusCycle({ status, onSet, busy }) {
  const cur = NEXT[status] ? status : 'open'
  return (
    <button
      type="button"
      className={'m-stat is-' + cur}
      aria-label={'Status: ' + cur + '. Tap to advance.'}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation()
        onSet(NEXT[cur])
      }}
    >
      <Mark status={cur} />
    </button>
  )
}
