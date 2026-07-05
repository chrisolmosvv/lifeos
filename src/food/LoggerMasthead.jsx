// LoggerMasthead (Piece 4) — Calendar-quality header. Fixed stepper (arrows never shift),
// small-caps date label, "Today" back-affordance when navigated away, Day/Week/Month +
// Log/Cookbook as quiet text tabs. Modeled after CalendarWeek's toolbar pattern.
export default function LoggerMasthead({ ranges, range, onRange, dateLabel, isToday, atToday, onPrev, onNext, onToday, foodTabs, foodTab, onFoodTab }) {
  return (
    <header className="lmast">
      <div className="lmast-row">
        <div className="lmast-stepper">
          <button type="button" className="lmast-step" aria-label="Previous" onClick={onPrev}>‹</button>
          <button type="button" className="lmast-step" aria-label="Next" disabled={atToday} onClick={onNext}>›</button>
        </div>

        <span className="lmast-range">{dateLabel}</span>

        {!isToday && onToday && (
          <button type="button" className="lmast-today" onClick={onToday}>Today</button>
        )}

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
            <div className="lmast-tabs" role="tablist" aria-label="Food section">
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
