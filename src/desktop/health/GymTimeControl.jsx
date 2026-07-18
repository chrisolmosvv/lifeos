import RangeSwitcher from "../kit/RangeSwitcher";
import "../kit/bodyRangeControl.css";

// LifeOS — Gym V2 (Piece 1): the Gym time control. Today / 3 Months / 6 Months / 1 Year,
// with prev/next paging (active only on the windowed views), a date-range label, and a
// "back to today" shortcut once paged away. Gym-LOCAL — reuses the shared RangeSwitcher
// chrome + the .brc paging styles (same as Body's Piece 9) but owns its OWN state; it does
// NOT touch Body's or Sleep's switchers. Backward paging caps at the earliest gym session.

export const GYM_RANGES = [
  { id: "today", label: "Today" },
  { id: "3mo", label: "3 Months" },
  { id: "6mo", label: "6 Months" },
  { id: "1yr", label: "1 Year" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthYear(ymd) {
  const [y, m] = String(ymd).split("-");
  return { mon: MONTHS[Number(m) - 1] || "", year: y };
}
// "Jan–Mar 2026" (same year) or "Dec 2025 – Feb 2026" (spanning) or "Jan 2026" (one month).
function rangeLabel(startYmd, endYmd) {
  if (!startYmd || !endYmd) return "";
  const a = monthYear(startYmd);
  const b = monthYear(endYmd);
  if (a.year === b.year) return a.mon === b.mon ? `${a.mon} ${a.year}` : `${a.mon}–${b.mon} ${b.year}`;
  return `${a.mon} ${a.year} – ${b.mon} ${b.year}`;
}

export default function GymTimeControl({
  win, onWin, onPrev, onNext, prevDisabled, nextDisabled,
  viewStart, viewEnd, showBackToToday, onBackToToday,
}) {
  const paging = win !== "today";
  return (
    <div className="brc">
      {paging && <span className="brc-label">{rangeLabel(viewStart, viewEnd)}</span>}
      {showBackToToday && (
        <button type="button" className="brc-today" onClick={onBackToToday}>back to today</button>
      )}
      {paging && (
        <button type="button" className="brc-arrow" onClick={onPrev} disabled={prevDisabled} aria-label="Earlier period">‹</button>
      )}
      <RangeSwitcher ranges={GYM_RANGES} value={win} ariaLabel="Gym time range" onChange={onWin} />
      {paging && (
        <button type="button" className="brc-arrow" onClick={onNext} disabled={nextDisabled} aria-label="Later period">›</button>
      )}
    </div>
  );
}
