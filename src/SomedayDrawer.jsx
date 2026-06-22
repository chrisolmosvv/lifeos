import { useState } from 'react'
import TaskBlock from './TaskBlock'

// The Someday bucket — "not now, but don't lose it". A quiet expander below This
// Week, collapsed by default, so it's reachable without competing for daily
// attention. Open it and it reveals the same task rows as Today/This Week (the
// shared TaskBlock, with its big headline suppressed), inside its own scroll
// region so the page never grows taller. Adding here lands the task in Someday.
export default function SomedayDrawer({ tasks, ...blockProps }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="someday">
      <button
        className="someday-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="someday-caret">{open ? '▾' : '▸'}</span>
        <span className="someday-label">Someday</span>
        <span className="someday-count tnum">{tasks.length}</span>
      </button>

      {open && (
        <div className="someday-body">
          <TaskBlock
            title="Someday"
            bucket="Someday"
            hideTitle
            emptyText="Nothing in Someday yet — add something to come back to."
            tasks={tasks}
            {...blockProps}
          />
        </div>
      )}
    </section>
  )
}
