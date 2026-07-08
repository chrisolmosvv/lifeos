import { fmtNum } from "./foodFormat";

// SummaryStrip (V2 P4) — the Week/Month numeric summary: avg cal · avg P · avg C · avg F (from
// rangeTotals, averaged over LOGGED days) + the on-target day count (rangeAdherence, e.g. 5/7).
// Pure display. "—" when there's nothing to average / no calorie goal to judge against.
const STATS = [["kcal", "Avg cal"], ["protein", "Avg P"], ["carbs", "Avg C"], ["fat", "Avg F"]];

export default function SummaryStrip({ perNutrient, adherence }) {
  return (
    <div className="fwm-strip">
      {STATS.map(([k, label]) => (
        <div key={k} className="fwm-stat">
          <span className="fwm-stat-val">{perNutrient[k]?.avg != null ? fmtNum(k, perNutrient[k].avg) : "—"}</span>
          <span className="fwm-stat-label">{label}</span>
        </div>
      ))}
      <div className="fwm-stat fwm-stat--target">
        <span className="fwm-stat-val">{adherence.total > 0 ? `${adherence.onTarget}/${adherence.total}` : "—"}</span>
        <span className="fwm-stat-label">On target</span>
      </div>
    </div>
  );
}
