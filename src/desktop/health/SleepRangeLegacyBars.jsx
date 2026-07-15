import { useState } from "react";
import { shiftYMD, humanDayShort } from "../../spine/logic/gymDates";
import { hm } from "../../spine/logic/healthFormat";

// SleepRangeLegacyBars — the 90-day stacked WEEKLY-AVERAGE bar chart. Lifted VERBATIM out of
// SleepRange in Piece 5, when Week and Month moved to the clock columns. 90-day still renders
// this, unchanged, until Piece 6 reworks it — extracting it here means "90-day is untouched"
// is structural (a different component) rather than a promise.
//
// The NIGHTLY-bar variant that Week/Month used to share this loop with was NOT carried over:
// the clock columns replaced it and nothing else referenced it (prove-dead, Piece 5). So this
// file is weekly-only — one bar per week, each the average night of that week.

const STAGES = [
  { key: "deep", col: "deep_minutes", label: "Deep" },
  { key: "core", col: "core_minutes", label: "Core" },
  { key: "rem", col: "rem_minutes", label: "REM" },
  { key: "awake", col: "awake_minutes", label: "Awake" },
];
const total4 = (s) => STAGES.reduce((a, st) => a + (s[st.key] ?? s[st.col] ?? 0), 0);

export default function SleepRangeLegacyBars({ days, rows, end, goalTarget, onWeekDrill }) {
  const [active, setActive] = useState(null);

  const bars = [];
  for (let w = Math.ceil(days / 7) - 1; w >= 0; w--) {
    const wEnd = shiftYMD(end, -7 * w);
    const wStart = shiftYMD(wEnd, -6);
    const nights = (rows || []).filter(
      (r) => r?.night_date && r.night_date >= wStart && r.night_date <= wEnd && Number.isFinite(r.asleep_minutes),
    );
    const n = nights.length;
    const avgStage = (col) => (n ? nights.reduce((a, r) => a + (r[col] || 0), 0) / n : 0);
    bars.push({
      id: wStart,
      weekStart: wStart,
      label: humanDayShort(wStart),
      n,
      deep: avgStage("deep_minutes"),
      core: avgStage("core_minutes"),
      rem: avgStage("rem_minutes"),
      awake: avgStage("awake_minutes"),
      asleep: n ? nights.reduce((a, r) => a + r.asleep_minutes, 0) / n : null,
    });
  }
  const maxTotal = Math.max(1, ...bars.filter((b) => b.n).map(total4), goalTarget || 0);
  const start = shiftYMD(end, -(days - 1));

  const act = active ? bars.find((b) => b.id === active) : null;
  const readout =
    act && act.n ? `week of ${act.label} · avg ${hm(act.asleep)} · ${act.n} ${act.n === 1 ? "night" : "nights"}` : null;

  return (
    <div className="agg-chart">
      <div className="agg-legend">
        {STAGES.map((st) => (
          <span className="agg-legend-key" key={st.key}>
            <span className={`hyp-dot hyp-${st.key}`} />
            {st.label}
          </span>
        ))}
      </div>

      <div className="agg-bars">
        {Number.isFinite(goalTarget) && (
          <span className="agg-goal-line" style={{ bottom: `${(goalTarget / maxTotal) * 100}%` }}>
            <span className="agg-goal-label">goal {hm(goalTarget)}</span>
          </span>
        )}
        {bars.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`agg-col ${active === b.id ? "is-active" : ""}`}
            disabled={!b.n}
            onMouseEnter={() => setActive(b.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(b.id)}
            onBlur={() => setActive(null)}
            onClick={() => b.n && onWeekDrill?.(b.weekStart)}
            title={b.n ? `${b.label} · ${hm(b.asleep)}` : `${b.label} · no data`}
          >
            <span className="agg-bar">
              {STAGES.map((st) =>
                b[st.key] > 0 ? (
                  <span key={st.key} className={`agg-seg hyp-${st.key}`} style={{ height: `${(b[st.key] / maxTotal) * 100}%` }} />
                ) : null,
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="agg-axis">
        <span>{humanDayShort(start)}</span>
        <span className="agg-readout">{readout || "weekly averages · hover a bar"}</span>
        <span>{humanDayShort(end)}</span>
      </div>
    </div>
  );
}
