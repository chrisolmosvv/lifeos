import { stepsChart } from "../../spine/logic/gymSteps";

// LifeOS — Gym V2 (Piece 4): the vertical steps bar chart in the Activity side column. One
// row per day (or per week above the collapse threshold), MOST RECENT AT THE TOP, stepping
// backward down the column — a reverse-chronological list, NOT a left-to-right time series.
// Bar length ∝ that day's/week's steps. PAGES with the time switcher. A day/week with no data
// shows an honest "–" row (never a fake 0). Bars are INK (informational — terracotta stays
// reserved). The calc (gymSteps) owns the maths incl. the daily→weekly collapse.

export default function GymStepsChart({ rows, windowStart, windowEnd, windowDays }) {
  const chart = stepsChart(rows, { start: windowStart, end: windowEnd, windowDays });
  const hasAny = chart.rows.some((r) => r.value != null);

  return (
    <section className="gym-zone gym-steps">
      <span className="gym-kicker">Steps · {chart.mode === "weekly" ? "weekly avg" : "daily"}</span>
      {!hasAny ? (
        <p className="gym-ph">No step data in this window yet.</p>
      ) : (
        <div className="gym-steps-list">
          {chart.rows.map((r) => {
            const pct = chart.max > 0 && r.value > 0 ? Math.max(2, (r.value / chart.max) * 100) : 0;
            return (
              <div className="gym-steps-row" key={r.key}>
                <span className="gym-steps-day">{r.label}</span>
                <span className="gym-steps-track" aria-hidden="true">
                  {pct > 0 ? <span className="gym-steps-bar" style={{ width: `${pct}%` }} /> : null}
                </span>
                <span className={r.value != null ? "gym-steps-val" : "gym-steps-val gym-steps-val--gap"}>
                  {r.value != null ? r.value.toLocaleString("en-GB") : "–"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
