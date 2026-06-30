import BodyChart from "./BodyChart";
import { fmtDelta, fmtFull, fmtNum } from "./bodyFormat";

// LifeOS — Body (V2 P2): the table's per-cell treatments, shared by all three groups.
//   Movement  — the trend arrow + delta (terracotta on real movement; ink when steady).
//   Trace     — the 90-day sparkline (reuses BodyChart's spark variant).
//   JourneyBar— a compact goal-progress bar (weight/body_fat), tappable to edit; or a
//               "set a goal" prompt when none exists.
//   Band      — a soft band region + a tick at the current value + a verdict. Fixed-
//               clinical (BMI/SpO2, terracotta tint) and personal (RHR/resp, neutral) use
//               the SAME visual; only the bounds' source differs (the locked band rule).

export function Movement({ metric, trend }) {
  if (!trend || trend.dir == null) return <span className="bt-move-none">—</span>;
  if (trend.dir === "flat") return <span className="bt-move-flat">→ steady</span>;
  return (
    <span className="bt-move-on">
      {trend.dir === "down" ? "↓" : "↑"} {fmtDelta(metric, trend.diff)}
    </span>
  );
}

export function Trace({ metric, series }) {
  return <BodyChart series={series} variant="spark" metric={metric} />;
}

// goalProg = goalProgress() output (or null). onEdit(el) opens the goal editor.
export function JourneyBar({ metric, goalProg, onEdit, promptText }) {
  if (!goalProg) {
    return (
      <button type="button" className="bt-target-btn bt-target-prompt" onClick={(e) => onEdit?.(e.currentTarget)}>
        {promptText || "set a goal"}
      </button>
    );
  }
  return (
    <button type="button" className="bt-target-btn bt-journey" onClick={(e) => onEdit?.(e.currentTarget)}>
      <span className="bt-journey-track">
        <span className="bt-journey-fill" style={{ width: `${(goalProg.fraction * 100).toFixed(0)}%` }} />
        <span className="bt-journey-mark" />
      </span>
      <span className="bt-journey-cap">
        {goalProg.met
          ? `goal met (${fmtFull(metric, goalProg.target)})`
          : `${fmtDelta(metric, goalProg.remaining)} to ${fmtFull(metric, goalProg.target)}`}
      </span>
    </button>
  );
}

// band = { lo, hi, value, verdict?, personal? }. Verdict computed if absent. null → "—".
export function Band({ metric, band }) {
  if (!band || band.value == null || band.lo == null || band.hi == null) {
    return <span className="bt-target-none">—</span>;
  }
  const span = band.hi - band.lo || 1;
  const pos = Math.max(0, Math.min(100, ((band.value - band.lo) / span) * 100));
  const verdict = band.verdict ?? (band.value < band.lo ? "below" : band.value > band.hi ? "above" : "in");
  return (
    <span className="bt-bandcell">
      <span className={`bt-band-track ${band.personal ? "bt-band-track--personal" : "bt-band-track--fixed"}`}>
        <span className="bt-band-tick" style={{ left: `${pos}%` }} />
      </span>
      <span className="bt-band-cap">
        {verdict === "in" ? "in range" : verdict} · {fmtNum(metric, band.lo)}–{fmtNum(metric, band.hi)}
      </span>
    </span>
  );
}
