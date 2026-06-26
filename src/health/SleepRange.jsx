import { shiftYMD, humanDayShort } from "../gym/gymDates";
import { rangeBedWakeAverages, nightsHitGoal } from "./healthSleep";
import { hm, clockFromMin } from "./healthFormat";

// SleepRange — the Week (days=7) / Month (days=30) view. One bar per night across the
// range (oldest→newest), each a stacked stage composition from that night's totals
// (no segments needed). Below: a summary (avg duration + avg bedtime/wake), the goal
// streak + nights-hit tally, and a baseline compare vs the 90-day average. Tapping a
// bar drills into that night's Night view. Consumes S5 only.
export default function SleepRange({ days, rows, goal, today, rolling, streak, onDrill }) {
  const start = shiftYMD(today, -(days - 1));
  const slots = [];
  for (let i = days - 1; i >= 0; i--) {
    const ymd = shiftYMD(today, -i);
    slots.push({ ymd, row: (rows || []).find((r) => r.night_date === ymd) || null });
  }

  // Scale bars to the tallest night in the range (time in bed = the four stage mins).
  const total4 = (r) =>
    (r.deep_minutes || 0) + (r.core_minutes || 0) + (r.rem_minutes || 0) + (r.awake_minutes || 0);
  const maxTotal = Math.max(1, ...slots.filter((s) => s.row).map((s) => total4(s.row)));

  const withData = rolling?.[days]?.values?.length || 0;
  const showSummary = withData >= 3; // S5 sparse rule: a rolling average needs ≥3 days
  const bedwake = showSummary ? rangeBedWakeAverages(rows, start, today) : null;

  // Baseline = this range's average vs the 90-day average (meaningfully wider window).
  const rangeAvg = rolling?.[days]?.avg;
  const baseAvg = rolling?.[90]?.avg;
  const baseHasData = (rolling?.[90]?.values?.length || 0) >= 3;
  const showBaseline = showSummary && Number.isFinite(rangeAvg) && Number.isFinite(baseAvg) && baseHasData;
  const baseDelta = showBaseline ? rangeAvg - baseAvg : null;

  const nh = nightsHitGoal(rows, goal, today, days); // null if no sleep_duration goal

  return (
    <div className="sleep-range">
      <div className="sr-bars">
        {slots.map((s) => {
          const r = s.row;
          const parts = r
            ? [
                { key: "deep", min: r.deep_minutes },
                { key: "core", min: r.core_minutes },
                { key: "rem", min: r.rem_minutes },
                { key: "awake", min: r.awake_minutes },
              ].filter((p) => Number.isFinite(p.min) && p.min > 0)
            : [];
          return (
            <button
              key={s.ymd}
              type="button"
              className="sr-col"
              disabled={!r}
              onClick={() => r && onDrill(s.ymd)}
              title={r ? `${humanDayShort(s.ymd)} · ${hm(r.asleep_minutes)}` : `${humanDayShort(s.ymd)} · no data`}
            >
              <div className="sr-bar">
                {parts.map((p) => (
                  <span key={p.key} className={`sr-seg hyp-${p.key}`} style={{ height: `${(p.min / maxTotal) * 100}%` }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <div className="sr-axis">
        <span>{humanDayShort(start)}</span>
        <span>{humanDayShort(today)}</span>
      </div>

      {showSummary ? (
        <div className="sr-summary">
          <span className="sleep-label">average over {days} nights</span>
          <span className="sr-summary-line">
            {hm(rangeAvg)} asleep · bed {clockFromMin(bedwake?.bedAvgMin)} · wake {clockFromMin(bedwake?.wakeAvgMin)}
          </span>
          {showBaseline && (
            <span className="sr-baseline">
              vs your 90-day average:{" "}
              {Math.abs(baseDelta) < 1 ? (
                <span className="sleep-muted">about the same</span>
              ) : (
                <span className="sr-move">
                  {baseDelta < 0 ? "↓" : "↑"} {Math.round(Math.abs(baseDelta))} min {baseDelta < 0 ? "less" : "more"}
                </span>
              )}
            </span>
          )}
        </div>
      ) : (
        <p className="sleep-muted sr-sparse">Not enough nights yet for an average.</p>
      )}

      {nh && (
        <div className="sr-streak">
          <span className="sleep-label">goal</span>
          <span>
            {streak ? `${streak.streak}-night streak` : "—"} · {nh.hit}/{nh.total} nights hit goal
          </span>
        </div>
      )}
    </div>
  );
}
