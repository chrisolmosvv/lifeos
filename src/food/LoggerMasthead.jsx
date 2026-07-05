// LoggerMasthead (Slice 1a rebuild) — the date line and range switcher. Date at ~15px in
// Fraunces, Day/Week/Month as an understated switcher with a thin underline on the active one.
// Generous space beneath before the band starts. Pure chrome — no data, no getters.
export default function LoggerMasthead({ ranges, range, onRange, dateLabel, isToday, atToday, onPrev, onNext }) {
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

        <div className="lmast-tabs" role="tablist" aria-label="Range">
          {ranges.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={r.id === range}
              className={r.id === range ? "lmast-tab is-active" : "lmast-tab"} onClick={() => onRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
