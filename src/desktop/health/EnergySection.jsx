import { humanDayShort, shiftYMD } from "../../spine/logic/gymDates";
import { stackedDaily, avgPerDay, ENERGY_WINDOW } from "../../spine/logic/bodyEnergy";
import "../kit/energySection.css";

// LifeOS — Body V3 (Piece 8): the full-width Energy section. One horizontal band:
//   RING (grown, height-matched to the bars) — centre shows today's real active kcal +
//     "active today"; beneath it the goal context (% of goal · avg/day) or a set-goal link.
//   SPLIT — a thin vertical resting/active average bar, between the ring and the day bars.
//   BARS — one stacked bar/day (resting base + active on top) filling the full width, with
//     date labels beneath; window follows the range (Latest = a trailing 14 days).
// terracotta is reserved for the ring arc + today's bar. Compute-on-read.

const kcal = (v) => (Number.isFinite(v) ? Math.round(v) : "—");

// E6 — the move-goal ring.
function Ring({ today, goal, avg, onSetGoal }) {
  const R = 29;
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
        <div className="er-ring-center">
          <span className="er-ring-num">{kcal(today)}</span>
          <span className="er-ring-sub">active today</span>
        </div>
      </div>
      <div className="er-ring-cap">
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

// E8 — resting-vs-active average as a thin VERTICAL bar (resting base + active top),
// height-matched to the day bars, sitting between the ring and the bars.
function SplitBar({ restingAvg, activeAvg }) {
  const total = (restingAvg || 0) + (activeAvg || 0);
  if (total <= 0) return <div className="er-split er-split--empty" title="no energy data yet" />;
  const rPct = ((restingAvg || 0) / total) * 100;
  return (
    <div className="er-split" title={`avg/day — resting ${kcal(restingAvg)} + active ${kcal(activeAvg)}`}>
      <div className="er-split-bar">
        <span className="er-split-active" style={{ height: `${100 - rPct}%` }} />
        <span className="er-split-resting" style={{ height: `${rPct}%` }} />
      </div>
      <span className="er-split-cap">avg split</span>
    </div>
  );
}

// E1 — stacked bars filling the full width, with a few date labels beneath.
function Bars({ days }) {
  const max = Math.max(1, ...days.map((d) => d.total));
  const n = days.length;
  const labelIdx = new Set([0, Math.round((n - 1) * 0.25), Math.round((n - 1) * 0.5), Math.round((n - 1) * 0.75), n - 1]);
  return (
    <div className="er-bars-col">
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
      <div className="er-bar-dates">
        {days.map((d, i) => (
          <span key={d.ymd} className="er-bar-date">{labelIdx.has(i) ? humanDayShort(d.ymd) : ""}</span>
        ))}
      </div>
    </div>
  );
}

export default function EnergySection({ activity, activityRows, goalMap, today, range, onSetGoal }) {
  const days = ENERGY_WINDOW[range] ?? 14;
  const yesterday = shiftYMD(today, -1); // averages exclude today's partial day
  const active = activity?.active_energy;
  const goal = goalMap?.get("active_energy")?.target_value ?? null;
  const bars = stackedDaily(activityRows?.active_energy, activityRows?.resting_energy, today, days);
  const activeAvg = avgPerDay(activityRows?.active_energy, yesterday, days);
  const restingAvg = avgPerDay(activityRows?.resting_energy, yesterday, days);
  const restingHasData = (activityRows?.resting_energy?.length || 0) > 0;

  return (
    <section className="energy">
      <div className="energy-eyebrow">Energy <span className="energy-window">{days}-day</span></div>
      <div className="energy-top">
        <Ring today={active?.todaySoFar?.value ?? null} goal={goal} avg={activeAvg} onSetGoal={onSetGoal} />
        <SplitBar restingAvg={restingAvg} activeAvg={activeAvg} />
        <Bars days={bars} />
      </div>
      {!restingHasData && (
        <p className="energy-note">Resting energy isn’t syncing yet — bars and split show active only until it flows.</p>
      )}
    </section>
  );
}
