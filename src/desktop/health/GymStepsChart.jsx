import { stepsChart } from "../../spine/logic/gymSteps";

// LifeOS — Gym V2 (Piece 11 revert): the steps list in the Activity side column. One row per day
// (or per week above the collapse threshold), MOST RECENT AT THE TOP, stepping backward — a
// reverse-chronological list, NOT a left-to-right time series. Pages with the switcher.
//
// SCALING IS NOW TRUE-TO-VALUE (linear, value ÷ max) — Piece 11 reverts Piece 6's √ compression.
// The owner chose honest proportion: a 30-step day SHOULD look tiny next to a 974-step day. No
// "√ scale" note (no compression left to explain), no minimum-width floor. Each row is a number
// CELL — the day label sits in a fixed left gutter (always on bare paper), a solid terracotta fill
// grows left-to-right across the bar area proportional to the day's steps, and the number sits at a
// FIXED RIGHT position that never rides the fill's edge (so it's equally readable at 3% or 100%).
// When the fill reaches under the number (a near-max day), a paper-coloured copy of the number —
// clipped to exactly the fill's width — shows through, so the number stays legible on the terracotta.
// A no-data day is an honest "–"; a real 0-step day shows "0" (both fill-less, told apart by the text).

export default function GymStepsChart({ rows, windowStart, windowEnd, windowDays }) {
  const chart = stepsChart(rows, { start: windowStart, end: windowEnd, windowDays });
  const hasAny = chart.rows.some((r) => r.value != null);
  const max = chart.max || 0;

  return (
    <section className="gym-zone gym-steps">
      <span className="gym-kicker">Steps · {chart.mode === "weekly" ? "weekly avg" : "daily"}</span>
      {!hasAny ? (
        <p className="gym-ph">No step data in this window yet.</p>
      ) : (
        <div className="gym-steps-list">
          {chart.rows.map((r) => {
            const gap = r.value == null;
            const pct = !gap && max > 0 && r.value > 0 ? (r.value / max) * 100 : 0;
            const num = gap ? "–" : r.value.toLocaleString("en-GB");
            return (
              <div className={gap ? "gym-steps-row gym-steps-row--gap" : "gym-steps-row"} key={r.key}>
                <span className="gym-steps-day">{r.label}</span>
                <span className="gym-steps-bararea">
                  {pct > 0 && <span className="gym-steps-fill" style={{ width: `${pct}%` }} aria-hidden="true" />}
                  <span className={gap ? "gym-steps-val gym-steps-val--gap" : "gym-steps-val"}>{num}</span>
                  {pct > 0 && (
                    <span className="gym-steps-val gym-steps-val--on" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }} aria-hidden="true">
                      {num}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
