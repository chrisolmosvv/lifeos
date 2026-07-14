import { dayNameFull, formatMastheadDate } from '../spine/logic/dateUtils'

// TodayDayBar — the bar over the day sheet: the ‹ › day stepper pinned as ONE fixed
// cluster (so the arrows never shift when the day name's length changes), the day's
// headline, its dateline, and — only when you're away from today — a quiet "Back to
// today". (Piece 0 split: moved verbatim out of Today.jsx; no behaviour changed.)
//
// Props: viewed (the day on screen), isToday, onPrev, onNext, onBack.
export default function TodayDayBar({ viewed, isToday, onPrev, onNext, onBack }) {
  return (
    <div className="today-daybar">
      <span className="today-stepper">
        <button className="today-nav" onClick={onPrev} aria-label="Previous day">‹</button>
        <button className="today-nav" onClick={onNext} aria-label="Next day">›</button>
      </span>
      <h2 className="today-day-title">{isToday ? 'The Day' : dayNameFull(viewed)}</h2>
      <span className="today-viewdate">{formatMastheadDate(viewed)}</span>
      {!isToday && (
        <button className="today-back" onClick={onBack}>
          Back to today
        </button>
      )}
    </div>
  )
}
