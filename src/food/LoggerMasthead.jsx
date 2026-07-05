// LoggerMasthead (Piece 2) — one row: date + ‹ › left, then Day/Week/Month tabs, then
// Log/Cookbook tabs (both as matching plain-text underline tabs). Pure chrome.
export default function LoggerMasthead({ ranges, range, onRange, dateLabel, isToday, atToday, onPrev, onNext, foodTabs, foodTab, onFoodTab }) {
  return (
    <header className="lmast">
      <div className="lmast-row">
        <div className="lmast-date-group">
          <h1 className="lmast-date">{dateLabel}</h1>
          <div className="lmast-nav">
            <button type="button" className="lmast-arrow" aria-label="Previous" onClick={onPrev}>‹</button>
            <button type="button" className="lmast-arrow" aria-label="Next" disabled={atToday} onClick={onNext}>›</button>
          </div>
        </div>

        <div className="lmast-right">
          <div className="lmast-tabs" role="tablist" aria-label="Range">
            {ranges.map((r) => (
              <button key={r.id} type="button" role="tab" aria-selected={r.id === range}
                className={r.id === range ? "lmast-tab is-active" : "lmast-tab"} onClick={() => onRange(r.id)}>
                {r.label}
              </button>
            ))}
          </div>

          {foodTabs && (
            <div className="lmast-tabs lmast-food-tabs" role="tablist" aria-label="Food section">
              {foodTabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={t.id === foodTab}
                  className={t.id === foodTab ? "lmast-tab is-active" : "lmast-tab"} onClick={() => onFoodTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
