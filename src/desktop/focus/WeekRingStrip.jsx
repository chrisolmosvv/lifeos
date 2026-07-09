import { weekdayNarrow } from "../../spine/logic/gymDates";
import { formatDuration, hoursMins, trendLine } from "./focusFormat.js";

// WeekRingStrip (redesign P5) — the full-width week glance under the chart: one ring per
// rolling day. The ring ARC = that day's progress toward the daily goal; the day's focus
// total shows INSIDE the ring as H:MM; the ring fills TERRACOTTA when the day's goal is
// MET. TODAY carries a subtle hairline OUTLINE (not terracotta — terracotta now means
// "met", so the two must stay distinguishable). Tapping a ring FILTERS the chart + ledger
// to that day (tap again, or "clear day", to reset). The right-hand summary keeps the
// week total + the vs-average trend.
//
// Props: strip [{ymd, focusSeconds}] (oldest→today), dailyGoalSeconds (|null), trend
//   (weekVsTrailingAvg result), todayYmd, selectedDay (|null), onPickDay(ymd), onClearDay.
export default function WeekRingStrip({ strip, dailyGoalSeconds, weeklyGoalSeconds, trend, todayYmd, selectedDay, onPickDay, onClearDay }) {
  const peak = Math.max(1, ...strip.map((d) => d.focusSeconds));
  const denom = dailyGoalSeconds || peak; // arc vs the daily goal, else vs the week's peak
  const tl = trendLine(trend);

  return (
    <div className="focus-weekstrip">
      <div className="focus-weekstrip-rings">
        {strip.map((d) => {
          const frac = Math.min(1, d.focusSeconds / denom);
          const met = dailyGoalSeconds != null && d.focusSeconds >= dailyGoalSeconds;
          return (
            <button key={d.ymd} type="button" className="focus-mini" aria-pressed={d.ymd === selectedDay}
              onClick={() => onPickDay(d.ymd)}>
              <MiniRing frac={frac} met={met} today={d.ymd === todayYmd} selected={d.ymd === selectedDay}
                label={d.focusSeconds > 0 ? hoursMins(d.focusSeconds) : ""} />
              <span className="focus-mini-day">{weekdayNarrow(d.ymd)}</span>
            </button>
          );
        })}
      </div>
      <div className="focus-weekstrip-foot">
        <span className="tnum">{tl.total}{weeklyGoalSeconds != null ? ` / ${formatDuration(weeklyGoalSeconds)}` : " this week"}</span>
        <span className="focus-weektrend"> · {tl.delta || tl.note}</span>
        {selectedDay && <button type="button" className="focus-linkbtn focus-weekstrip-clear" onClick={onClearDay}>clear day</button>}
      </div>
    </div>
  );
}

function MiniRing({ frac, met, today, selected, label }) {
  const R = 11, C = 2 * Math.PI * R;
  return (
    <svg className="focus-mini-svg" viewBox="0 0 28 28">
      {(selected || today) && (
        <circle cx="14" cy="14" r="13.2" fill="none" className={selected ? "focus-mini-sel" : "focus-mini-today"} />
      )}
      <circle cx="14" cy="14" r={R} className="focus-mini-track" fill="none" />
      <circle cx="14" cy="14" r={R} fill="none" className={"focus-mini-fill" + (met ? " is-met" : "")}
        strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 14 14)" />
      {label && <text x="14" y="14" className="focus-mini-val" textAnchor="middle" dominantBaseline="central">{label}</text>}
    </svg>
  );
}
