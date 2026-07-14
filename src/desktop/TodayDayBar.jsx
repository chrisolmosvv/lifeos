import { dayNameFull, formatDayMonth } from '../spine/logic/dateUtils'

// TodayDayBar — the bar over the day sheet: the ‹ › day stepper pinned as ONE fixed
// cluster (so the arrows never shift when the day name's length changes), the day's
// headline, its dateline, and — only when you're away from today — a quiet "Back to
// today".
//
// The heading is ALWAYS the real weekday ("Tuesday"), today included — today used to
// be special-cased to the literal "The Day", which then read as a second title next to
// a dateline that already spelled the weekday out. One name, said once. The line beside
// it carries day + month only ("14 July"): no weekday repeat, no year.
//
// Props: viewed (the day on screen), isToday, onPrev, onNext, onBack.
export default function TodayDayBar({ viewed, isToday, onPrev, onNext, onBack }) {
  return (
    <div className="today-daybar">
      <span className="today-stepper">
        <button className="today-nav" onClick={onPrev} aria-label="Previous day">‹</button>
        <button className="today-nav" onClick={onNext} aria-label="Next day">›</button>
      </span>
      <h2 className="today-day-title">{dayNameFull(viewed)}</h2>
      <span className="today-viewdate">{formatDayMonth(viewed)}</span>
      {!isToday && (
        <button className="today-back" onClick={onBack}>
          Back to today
        </button>
      )}
    </div>
  )
}
