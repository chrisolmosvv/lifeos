// LoggerMasthead — the ONE masthead across every logger page (V2 P4). A broadsheet nameplate:
// an eyebrow + serif date/range headline (left), the Day/Week/Month switcher + date-nav ‹ › (right).
// Pure chrome — no data, no getters. The consumer supplies the label + handlers.
export default function LoggerMasthead({ ranges, range, onRange, dateLabel, isToday, atToday, onPrev, onNext }) {
  return (
    <header className="lmast">
      <div className="lmast-plate">
        <span className="lmast-eyebrow">Nutrition</span>
        <h1 className="lmast-headline">
          {dateLabel}
          {isToday && <span className="lmast-today">Today</span>}
        </h1>
      </div>

      <div className="lmast-controls">
        <div className="lmast-tabs" role="tablist" aria-label="Range">
          {ranges.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={r.id === range}
              className={r.id === range ? "lmast-tab is-active" : "lmast-tab"} onClick={() => onRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="lmast-nav">
          <button type="button" className="lmast-arrow" aria-label="Previous" onClick={onPrev}>‹</button>
          <button type="button" className="lmast-arrow" aria-label="Next" disabled={atToday} onClick={onNext}>›</button>
        </div>
      </div>
    </header>
  );
}
