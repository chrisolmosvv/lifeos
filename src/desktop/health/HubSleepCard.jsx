import HubCard from "../kit/HubCard";
import { hm } from "../../spine/logic/healthFormat";

// Sleep card (the richest). Headline = LAST NIGHT's duration only — last night is
// the night whose wake-up date is today; if there's no row for it we show "no
// data" and DO NOT fall back to an older night (locked empty-state rule). Below:
// a tiny stage split, the 7-day average (only with ≥3 days of data), and a goal
// progress bar (only when a sleep goal exists).
export default function HubSleepCard({ sleep, onClick }) {
  const isLastNight = sleep?.lastNight && sleep.lastNight.nightDate === sleep.today;
  const ln = isLastNight ? sleep.lastNight : null;

  const avg7 = sleep?.rolling?.[7];
  const showAvg = avg7 && avg7.values.length >= 3 && Number.isFinite(avg7.avg);

  const goal = sleep?.durationVsGoal; // null if no active sleep_duration goal
  const showBar = !!ln && !!goal && Number.isFinite(goal.target) && goal.target > 0;
  const pct = showBar ? Math.max(0, Math.min(1, ln.asleepMinutes / goal.target)) : 0;

  const stage = (s) => (Number.isFinite(s?.min) ? `${s.min}m` : "—");

  return (
    <HubCard label="last night" headline={ln ? hm(ln.asleepMinutes) : "no data"} onClick={onClick}>
      {ln && (
        <div className="hub-stages">
          REM {stage(ln.stages.rem)} · Core {stage(ln.stages.core)} · Deep {stage(ln.stages.deep)}
        </div>
      )}
      {showAvg && <div className="hub-support">7-day average {hm(avg7.avg)}</div>}
      {showBar && (
        <div className="hub-goalbar" aria-hidden="true">
          <div className="hub-goalbar-fill" style={{ width: `${pct * 100}%` }} />
        </div>
      )}
    </HubCard>
  );
}
