import { humanDayShort } from "../../spine/logic/gymDates";
import { stackedDaily, ENERGY_WINDOW } from "../../spine/logic/bodyEnergy";
import "../kit/energySection.css";

// LifeOS — Body V3 (Piece 5): the Energy section — the page's SECONDARY block (visibly
// quieter than Composition: smaller type, no hero numbers). Three coordinated parts:
//   E6 RING  — today's active energy vs the move goal (terracotta arc), % + period avg.
//   E1 BARS  — one stacked bar/day (resting base + active on top) over the range window;
//              today's bar is terracotta. Window follows the page range (Latest = 7).
//   E8 SPLIT — one bar of the resting-vs-active make-up, AVERAGED over the same window.
// terracotta is reserved here for the ring arc + today's bar ONLY. Compute-on-read.

const kcal = (v) => (Number.isFinite(v) ? Math.round(v) : "—");

// E6 — the move-goal ring. No goal set → shows the raw number + avg + a "set a move goal"
// affordance (never an invented default goal).
function Ring({ today, goal, avg, onSetGoal }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const pct = goal && Number.isFinite(today) ? today / goal : null;
  const arc = pct != null ? Math.max(0, Math.min(1, pct)) * C : 0;
  return (
    <div className="er-ring">
      <div className="er-ring-dial">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle className="er-ring-track" cx="32" cy="32" r={R} fill="none" strokeWidth="6" />
          {pct != null && (
            <circle
              className="er-ring-arc" cx="32" cy="32" r={R} fill="none" strokeWidth="6"
              strokeLinecap="round" transform="rotate(-90 32 32)"
              strokeDasharray={`${arc.toFixed(1)} ${(C - arc).toFixed(1)}`}
            />
          )}
        </svg>
        <span className="er-ring-num">{kcal(today)}</span>
      </div>
      <div className="er-ring-cap">
        <span className="er-ring-unit">kcal active today</span>
        {goal != null ? (
          <span>{pct != null ? `${Math.round(pct * 100)}% of goal` : "—"} · avg {kcal(avg)}/day</span>
        ) : (
          <button type="button" className="er-setgoal" onClick={(e) => onSetGoal?.(e.currentTarget)}>
            avg {kcal(avg)}/day · set a move goal
          </button>
        )}
      </div>
    </div>
  );
}

// E1 — one stacked bar per day: resting (base) + active (top), height = total daily burn.
function Bars({ days }) {
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="er-bars">
      {days.map((d) => (
        <div
          key={d.ymd}
          className={`er-bar${d.isToday ? " er-bar--today" : ""}`}
          title={`${humanDayShort(d.ymd)} · ${kcal(d.total)} kcal (rest ${kcal(d.resting)} + active ${kcal(d.active)})`}
        >
          <span className="er-bar-active" style={{ height: `${(d.active / max) * 100}%` }} />
          <span className="er-bar-resting" style={{ height: `${(d.resting / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

// E8 — the resting-vs-active make-up, AVERAGED over the selected window.
function Split({ restingAvg, activeAvg }) {
  const total = (restingAvg || 0) + (activeAvg || 0);
  if (total <= 0) return <p className="er-split-empty">No energy data for this period yet.</p>;
  const rPct = ((restingAvg || 0) / total) * 100;
  return (
    <div className="er-split">
      <div className="er-split-bar" role="img" aria-label="average resting vs active split">
        <span className="er-split-resting" style={{ width: `${rPct}%` }} />
        <span className="er-split-active" style={{ width: `${100 - rPct}%` }} />
      </div>
      <div className="er-split-legend">
        <span><i className="er-key er-key-resting" /> resting {kcal(restingAvg)}</span>
        <span><i className="er-key er-key-active" /> active {kcal(activeAvg)}</span>
        <span className="er-split-note">avg / day</span>
      </div>
    </div>
  );
}

export default function EnergySection({ activity, activityRows, goalMap, today, range, onSetGoal }) {
  const days = ENERGY_WINDOW[range] ?? 7;
  const active = activity?.active_energy;
  const resting = activity?.resting_energy;
  const goal = goalMap?.get("active_energy")?.target_value ?? null;
  const bars = stackedDaily(activityRows?.active_energy, activityRows?.resting_energy, today, days);
  const restingHasData = (activityRows?.resting_energy?.length || 0) > 0;

  return (
    <section className="energy">
      <div className="energy-eyebrow">Energy <span className="energy-window">{days === 7 ? "7-day" : `${days}-day`}</span></div>
      <div className="energy-top">
        <Ring
          today={active?.todaySoFar?.value ?? null}
          goal={goal}
          avg={active?.rolling?.[days]?.avg ?? null}
          onSetGoal={onSetGoal}
        />
        <Bars days={bars} />
      </div>
      <Split restingAvg={resting?.rolling?.[days]?.avg ?? null} activeAvg={active?.rolling?.[days]?.avg ?? null} />
      {!restingHasData && (
        <p className="energy-note">Resting energy isn’t syncing yet — bars and split show active only until it flows.</p>
      )}
    </section>
  );
}
