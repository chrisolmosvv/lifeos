import { aggregateDaily, aggMode } from "../../spine/logic/healthActivity";
import { statsForRange } from "../../spine/logic/healthStats";

// LifeOS — Gym V2 (Piece 1): the Activity SIDE column. Avg Flights, avg Stand minutes, avg
// Walking Heart Rate — each averaged over WHATEVER window the time switcher is set to (the
// parent passes the window's [start, end]). It PAGES with the switcher. The vertical steps
// bar chart is Piece 4. walking_speed (the mislabeled pace) and walking_step_length (stride)
// are gone by design — this column never renders them.
//
// AVERAGE = the mean of the daily values in-window (flights/stand are daily SUMS; walk-HR is
// a daily active-hour mean — aggMode picks the right per-day rule). A window with no data
// yields null → an honest "—", never a fabricated 0. So paging before late June (activity's
// start) shows a real sparse/empty state, not invented numbers.

const METRICS = [
  { key: "flights_climbed", label: "flights", unit: "", round: true },
  { key: "stand_minutes", label: "stand", unit: "m", round: true },
  { key: "walking_heart_rate_avg", label: "walk HR", unit: " bpm", round: true },
];

function windowAvg(rows, metric, start, end) {
  if (!rows || !start || !end) return null;
  const daily = aggregateDaily(rows, aggMode(metric));
  return statsForRange(daily, start, end).avg;
}

export default function GymActivity({ activityRows, windowStart, windowEnd }) {
  const cells = METRICS.map((m) => {
    const avg = windowAvg(activityRows?.[m.key], m.key, windowStart, windowEnd);
    const val = Number.isFinite(avg) ? `${Math.round(avg).toLocaleString("en-GB")}${m.unit}` : "—";
    return { ...m, val };
  });
  const anyData = cells.some((c) => c.val !== "—");

  return (
    <section className="gym-zone gym-activity">
      <span className="gym-kicker">Activity · avg / day</span>
      {anyData ? (
        <div className="gym-act-cells">
          {cells.map((c) => (
            <div className="gym-act-cell" key={c.key}>
              <span className="gym-act-label">{c.label}</span>
              <b className="gym-act-val">{c.val}</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="gym-ph">No activity data in this window yet.</p>
      )}
    </section>
  );
}
