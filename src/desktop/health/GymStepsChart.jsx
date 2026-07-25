import { stepsChart } from "../../spine/logic/gymSteps";

// LifeOS — Gym V2 (Piece 4 + Piece 6): the vertical steps bar chart in the Activity side
// column. One row per day (or per week above the collapse threshold), MOST RECENT AT THE TOP,
// stepping backward — a reverse-chronological list, NOT a left-to-right time series. Pages with
// the switcher. Piece 6: bar length is a SQUARE-ROOT scale of the step count — at wide windows
// values span single digits to 20,000+, and a linear scale renders the small real values as
// invisible slivers; √ keeps them visibly present. A "√ scale · max N" note makes the
// compression legible. A no-data day is an honest "–" with NO track (visually distinct from a
// real 0-step day, which keeps its empty track). Bars are INK — terracotta stays reserved.

export default function GymStepsChart({ rows, windowStart, windowEnd, windowDays }) {
  const chart = stepsChart(rows, { start: windowStart, end: windowEnd, windowDays });
  const hasAny = chart.rows.some((r) => r.value != null);
  const rootMax = Math.sqrt(chart.max || 0);

  return (
    <section className="gym-zone gym-steps">
      <span className="gym-kicker">Steps · {chart.mode === "weekly" ? "weekly avg" : "daily"}</span>
      {!hasAny ? (
        <p className="gym-ph">No step data in this window yet.</p>
      ) : (
        <>
          <span className="gym-steps-scale">√ scale · max {chart.max.toLocaleString("en-GB")}</span>
          <div className="gym-steps-list">
            {chart.rows.map((r) => {
              const gap = r.value == null;
              const pct = !gap && rootMax > 0 && r.value > 0 ? Math.max(3, (Math.sqrt(r.value) / rootMax) * 100) : 0;
              return (
                <div className={gap ? "gym-steps-row gym-steps-row--gap" : "gym-steps-row"} key={r.key}>
                  <span className="gym-steps-day">{r.label}</span>
                  <span className="gym-steps-track" aria-hidden="true">
                    {pct > 0 ? <span className="gym-steps-bar" style={{ width: `${pct}%` }} /> : null}
                  </span>
                  <span className={gap ? "gym-steps-val gym-steps-val--gap" : "gym-steps-val"}>
                    {gap ? "–" : r.value.toLocaleString("en-GB")}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
