import { aggregateDaily, aggMode } from "../../spine/logic/healthActivity";
import { statsForRange } from "../../spine/logic/healthStats";
import { shiftYMD } from "../../spine/logic/gymDates";

// LifeOS — Gym V2 (Piece 1 + Piece 7): the Activity SIDE column, a dense STAT STRIP. Three
// rows — Flights / Stand / Walk HR — each = its window-scoped average (pages with the switcher)
// + a trend delta "vs typical". No charts, no sparklines: deliberately the terse, numbers-
// forward option, distinct from Training/Balance.
//
// AVERAGE = the mean of the daily values in-window (flights/stand are daily SUMS; walk-HR is a
// daily active-hour mean — aggMode picks the right per-day rule). "vs typical" = this window's
// avg vs the IMMEDIATELY PRIOR window of equal length (adopting Body-Part Balance's locked
// comparison basis — FLAGGED as an adopted pattern, not Activity-specified). A window with no
// data → honest "—"; a prior window with no data (e.g. before activity's late-June start) →
// the value shows with NO delta, never a fabricated one. Up reads terracotta (a gain, same
// convention as the lift table); down/steady stay muted.

const DAY = 86400000;
// `lowerIsBetter` flips which direction reads as a GAIN (terracotta). More flights/stand is
// the win; a LOWER walking HR at similar effort is the fitness-positive direction, so its
// gain is DOWN. The arrow itself always shows the real numeric direction (↑/↓) — only the
// COLOUR is gain-aware.
const METRICS = [
  { key: "flights_climbed", label: "flights", unit: "" },
  { key: "stand_minutes", label: "stand", unit: "m" },
  { key: "walking_heart_rate_avg", label: "walk HR", unit: " bpm", lowerIsBetter: true },
];

function avgOver(daily, start, end) {
  return statsForRange(daily, start, end).avg;
}

export default function GymActivity({ activityRows, windowStart, windowEnd }) {
  const len = windowStart && windowEnd
    ? Math.round((Date.parse(windowEnd) - Date.parse(windowStart)) / DAY) + 1
    : 0;
  const priorEnd = windowStart ? shiftYMD(windowStart, -1) : null;
  const priorStart = priorEnd && len ? shiftYMD(priorEnd, -(len - 1)) : null;

  const cells = METRICS.map((m) => {
    const rows = activityRows?.[m.key];
    if (!rows || !windowStart || !windowEnd) return { ...m, val: "—", delta: null };
    const daily = aggregateDaily(rows, aggMode(m.key));
    const cur = avgOver(daily, windowStart, windowEnd);
    const prior = priorStart ? avgOver(daily, priorStart, priorEnd) : null;
    const val = Number.isFinite(cur) ? `${Math.round(cur).toLocaleString("en-GB")}${m.unit}` : "—";
    const delta = Number.isFinite(cur) && Number.isFinite(prior) ? Math.round(cur - prior) : null;
    // GAIN = movement in the fitness-positive direction for this metric (colour only).
    const gain = delta == null || delta === 0 ? null : (m.lowerIsBetter ? delta < 0 : delta > 0);
    return { ...m, val, delta, gain };
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
              <span className="gym-act-line">
                <b className="gym-act-val">{c.val}</b>
                {c.delta != null && (
                  c.delta === 0 ? (
                    <span className="gym-act-delta gym-act-delta--flat">≈ typical</span>
                  ) : (
                    <span className={`gym-act-delta ${c.gain ? "gym-act-delta--gain" : "gym-act-delta--muted"}`}>
                      {c.delta > 0 ? "↑" : "↓"} {Math.abs(c.delta)}{c.unit} vs typical
                    </span>
                  )
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="gym-ph">No activity data in this window yet.</p>
      )}
    </section>
  );
}
