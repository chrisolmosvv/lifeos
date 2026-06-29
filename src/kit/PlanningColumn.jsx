// PlanningColumn — one labelled column of task rows for the Planning view (P1):
// the Inbox side rail (variant="rail") and each of the four time lanes (a
// <section>). Presentational only — it renders the supplied rows via the caller's
// `renderRow`, so all state/writes stay in Planning. Sealed kit block.
//
// Props: tag ('aside' | 'section'), className, label, count, items, emptyText,
//        renderRow (task => node).
export default function PlanningColumn({ tag = 'section', className, label, count, items, emptyText, renderRow }) {
  const Tag = tag
  return (
    <Tag className={className}>
      <span className="pl-col-label">
        {label} <span className="pl-col-n tnum">{count}</span>
      </span>
      {items.length === 0 ? (
        <p className="pl-col-empty">{emptyText}</p>
      ) : (
        items.map(renderRow)
      )}
    </Tag>
  )
}
