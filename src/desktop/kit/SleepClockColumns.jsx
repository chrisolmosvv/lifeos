import { useState } from "react";
import { amsClockMinutes, humanDayShort } from "../../spine/logic/gymDates";
import { clockFromMin, hm } from "../../spine/logic/healthFormat";
import { GRID, WINDOW_MIN, buildSlots, blockFor, topOf } from "./sleepClockChart";

// LifeOS — Sleep rhythm: the CLOCK COLUMNS. A 22:00 (top) → 12:00 (bottom) vertical window,
// cropping the dead midday hours so each block is big and readable. Each block sits at its
// TRUE clock position (later bed → lower, earlier wake → higher). Hover a column → its
// bed · wake readout.
//
// TWO WAYS IN (a column is a column; the source differs):
//   rows + end + days + goalMinutes — the per-NIGHT view (Last night / Week / Month). Each
//     column is one night with its stage stack and terracotta goal-met mark.
//   columns — PRE-BUILT columns (90-day, Piece 6): one per WEEK, a flat stage-less average
//     bed→wake span. Bypasses the night machinery entirely; see weeklyColumns().
// Either way it renders ONE normalised `cols` array, so hover/drill/axis are shared code.
//   averages     — { bedAvgMin, wakeAvgMin } → two hairline marks across the columns.
//   onDrill(key) — click a column → fires with that column's drill key (a night ymd, or a
//                  week-start ymd for the weekly view).
// The maths (window, crop rules, slot + weekly building) lives in sleepClockChart.js.

// One night slot → the normalised column the render consumes.
function nightColumn(s, goalMinutes) {
  const b = blockFor(s.row, goalMinutes);
  const bed = s.row ? clockFromMin(amsClockMinutes(s.row.in_bed_at)) : null;
  const wake = s.row ? clockFromMin(amsClockMinutes(s.row.woke_at)) : null;
  return {
    key: s.ymd,
    drillKey: s.ymd,
    disabled: !s.row,
    block: b,
    label: s.row ? `${humanDayShort(s.ymd)} ${bed} to ${wake}${b?.metGoal ? " — goal met" : ""}` : `${humanDayShort(s.ymd)} no data`,
    readout: s.row ? `${humanDayShort(s.ymd)} · bed ${bed} · wake ${wake} · ${hm(s.row.asleep_minutes)} asleep` : null,
  };
}

export default function SleepClockColumns({
  rows,
  end,
  days = 7,
  goalMinutes = null,
  averages = null,
  onDrill = null,
  columns = null,
}) {
  const [active, setActive] = useState(null);
  const cols = columns ?? buildSlots(rows, end, days).map((s) => nightColumn(s, goalMinutes));
  const act = active ? cols.find((c) => c.key === active) : null;

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
        {act?.readout ? (
          <span>{act.readout}</span>
        ) : (
          <span className="sleep-muted">
            {columns ? "hover a week for its average bed · wake" : "hover a night for bed · wake · asleep"}
          </span>
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
          {cols.map((c) => (
            <button
              type="button"
              className={`scc-col ${active === c.key ? "is-active" : ""}`}
              key={c.key}
              disabled={c.disabled}
              onMouseEnter={() => setActive(c.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(c.key)}
              onBlur={() => setActive(null)}
              onClick={() => !c.disabled && onDrill?.(c.drillKey)}
              aria-label={c.label}
            >
              {c.block && (
                <span
                  className={[
                    "scc-block",
                    c.block.flat ? "scc-block--flat" : "",
                    c.block.metGoal ? "scc-block--goal" : "",
                    c.block.cropTop ? "scc-block--crop-top" : "",
                    c.block.cropBottom ? "scc-block--crop-bottom" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ top: `${c.block.topPct}%`, height: `${c.block.heightPct}%` }}
                >
                  {(c.block.stages || []).map((p) => (
                    <i key={p.key} className={`hyp-${p.key}`} style={{ height: `${p.pct}%` }} />
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Per-week goal-hit rate (90-day only): "X/N nights hit goal" under each column, a
          dedicated row BELOW the chart so it never crowds the bed/wake span or crosses the
          avg-mark hairlines. Ink tabular numerals; a week with no logged nights shows nothing.
          Rendered only when a column carries a rate (weekly view + a sleep-duration goal). The
          numbers are already in each column's aria-label, so this row is aria-hidden. */}
      {cols.some((c) => c.goalRate) && (
        <div className="scc-rates" aria-hidden="true">
          {cols.map((c) => (
            <span className="scc-rate" key={c.key}>
              {c.goalRate ? `${c.goalRate.hit}/${c.goalRate.withData}` : ""}
            </span>
          ))}
        </div>
      )}

      <div className="scc-axis">
        <span>{humanDayShort(cols[0].key)}</span>
        <span>{humanDayShort(cols[cols.length - 1].key)}</span>
      </div>
    </div>
  );
}
