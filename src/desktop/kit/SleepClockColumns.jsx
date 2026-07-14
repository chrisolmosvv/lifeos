import { useState } from "react";
import { amsClockMinutes, humanDayShort } from "../../spine/logic/gymDates";
import { clockFromMin, hm } from "../../spine/logic/healthFormat";
import { GRID, WINDOW_MIN, buildSlots, blockFor, topOf } from "./sleepClockChart";

// LifeOS — Sleep rhythm: the CLOCK COLUMNS. A 22:00 (top) → 12:00 (bottom) vertical window,
// cropping the dead midday hours so each night's block is big and readable. One column per
// night, each block at its TRUE clock position (later bedtime → lower, earlier wake →
// higher); stages stack within it. Hover a column → that night's bed · wake · total asleep.
//
// GENERALISED in Piece 4 (it was hardcoded to "7 nights back from today"):
//   days + end   — any range, not just 7. Piece 5 (Week/Month) and Piece 6 (90-day, which
//                  collapses to ~13 weekly columns) plug in here; see buildSlots.
//   goalMinutes  — a night that hit its sleep goal gets the terracotta goal mark.
//   averages     — { bedAvgMin, wakeAvgMin } from rangeBedWakeAverages → two hairline marks.
//   onDrill(ymd) — click a column. Piece 5 wires it; nothing calls it yet.
// The maths (window, crop rules, slot building) lives in sleepClockChart.js.

export default function SleepClockColumns({
  rows,
  end,
  days = 7,
  goalMinutes = null,
  averages = null,
  onDrill = null,
}) {
  const [active, setActive] = useState(null);
  const slots = buildSlots(rows, end, days);
  const act = active ? slots.find((s) => s.ymd === active)?.row : null;

  // Average bed/wake marks — no new calc: rangeBedWakeAverages already returns these, and
  // topOf() already turns a clock-minute into a Y position.
  const marks = [
    { key: "bed", min: averages?.bedAvgMin, label: "avg bed" },
    { key: "wake", min: averages?.wakeAvgMin, label: "avg wake" },
  ]
    .map((m) => ({ ...m, pct: topOf(m.min) }))
    .filter((m) => m.pct != null);

  return (
    <div className="scc">
      <div className="bw-readout scc-hint">
        {act ? (
          <span>
            {humanDayShort(active)} · bed {clockFromMin(amsClockMinutes(act.in_bed_at))} · wake{" "}
            {clockFromMin(amsClockMinutes(act.woke_at))} · {hm(act.asleep_minutes)} asleep
          </span>
        ) : (
          <span className="sleep-muted">hover a night for bed · wake · asleep</span>
        )}
      </div>

      <div className="scc-chart">
        <div className="scc-grid" aria-hidden="true">
          {GRID.map((g, i) => (
            <span className="scc-gridline" key={i} style={{ top: `${(g.off / WINDOW_MIN) * 100}%` }}>
              <em>{g.label}</em>
            </span>
          ))}
        </div>

        {/* Average bed/wake: hairline marks ACROSS the columns. Ink, not terracotta —
            terracotta is spoken for by the goal mark. */}
        <div className="scc-marks" aria-hidden="true">
          {marks.map((m) => (
            <span className={`scc-mark scc-mark--${m.key}`} key={m.key} style={{ top: `${m.pct}%` }}>
              <em>{m.label}</em>
            </span>
          ))}
        </div>

        <div className="scc-cols">
          {slots.map((s) => {
            const b = blockFor(s.row, goalMinutes);
            const label = s.row
              ? `${humanDayShort(s.ymd)} ${clockFromMin(amsClockMinutes(s.row.in_bed_at))} to ${clockFromMin(
                  amsClockMinutes(s.row.woke_at),
                )}${b?.metGoal ? " — goal met" : ""}`
              : `${humanDayShort(s.ymd)} no data`;
            return (
              <button
                type="button"
                className={`scc-col ${active === s.ymd ? "is-active" : ""}`}
                key={s.ymd}
                disabled={!s.row}
                onMouseEnter={() => setActive(s.ymd)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.ymd)}
                onBlur={() => setActive(null)}
                onClick={() => s.row && onDrill?.(s.ymd)}
                aria-label={label}
              >
                {b && (
                  <span
                    className={[
                      "scc-block",
                      b.metGoal ? "scc-block--goal" : "",
                      b.cropTop ? "scc-block--crop-top" : "",
                      b.cropBottom ? "scc-block--crop-bottom" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ top: `${b.topPct}%`, height: `${b.heightPct}%` }}
                  >
                    {b.stages.map((p) => (
                      <i key={p.key} className={`hyp-${p.key}`} style={{ height: `${p.pct}%` }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scc-axis">
        <span>{humanDayShort(slots[0].ymd)}</span>
        <span>{humanDayShort(slots[slots.length - 1].ymd)}</span>
      </div>
    </div>
  );
}
