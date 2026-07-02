import { humanDayShort } from "../gym/gymDates.js";
import { formatDuration } from "./focusFormat.js";

// WeekRingStrip (spec §L foot band) — the full-width week glance beneath the dial:
// one mini ring per day of the rolling 7-day week, filled by that day's focus vs the
// daily goal (or vs the week's own peak when there's no goal), with the weekly-target
// marker. Today is emphasised. Pure presentation over the weekRingStrip getter.
//
// Props: strip [{ymd, focusSeconds}] (oldest→today), dailyGoalSeconds (|null),
//   weeklyGoalSeconds (|null), weekTotalSeconds, todayYmd.
export default function WeekRingStrip({ strip, dailyGoalSeconds, weeklyGoalSeconds, weekTotalSeconds, todayYmd }) {
  const peak = Math.max(1, ...strip.map((d) => d.focusSeconds));
  const denom = dailyGoalSeconds || peak; // fill vs the daily goal, else vs the week's peak
  const weekMet = weeklyGoalSeconds != null && weekTotalSeconds >= weeklyGoalSeconds;

  return (
    <div className="focus-weekstrip">
      <div className="focus-weekstrip-rings">
        {strip.map((d) => {
          const frac = Math.min(1, d.focusSeconds / denom);
          const met = dailyGoalSeconds != null && d.focusSeconds >= dailyGoalSeconds;
          const isToday = d.ymd === todayYmd;
          return (
            <div key={d.ymd} className={"focus-mini" + (isToday ? " is-today" : "")}>
              <MiniRing frac={frac} met={met} />
              <span className="focus-mini-day">{humanDayShort(d.ymd).split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
      <div className="focus-weekstrip-foot">
        <span className="tnum">{formatDuration(weekTotalSeconds)} this week</span>
        {weeklyGoalSeconds != null && (
          <span className={"focus-weektarget" + (weekMet ? " is-met" : "")}>
            {weekMet ? "· weekly target met" : `· of ${formatDuration(weeklyGoalSeconds)} target`}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniRing({ frac, met }) {
  const R = 11, C = 2 * Math.PI * R;
  return (
    <svg className="focus-mini-svg" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r={R} className="focus-mini-track" fill="none" />
      <circle cx="14" cy="14" r={R} fill="none"
        className={"focus-mini-fill" + (met ? " is-met" : "")}
        strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
        transform="rotate(-90 14 14)" />
    </svg>
  );
}
