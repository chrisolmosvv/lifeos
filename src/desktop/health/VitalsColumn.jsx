import BodyChart from "./BodyChart";
import { Movement } from "./BodyCells";
import { baselineBand } from "../../spine/logic/healthBodyRange";
import { fmtFull, fmtNum } from "../../spine/logic/bodyFormat";
import "../kit/vitalsColumn.css";

// LifeOS — Body V3 (Piece 6): the Vitals SIDE column. Runs alongside Composition+Energy
// (not stacked below) — which is both the locked "vitals is side info" call AND what frees
// the vertical room for zero-scroll. Two vitals, deliberately UNEQUAL weight:
//   Resting HR  — the one Vital that earns a real look: 7-day value + trend + a real
//                 sparkline + your personal range.
//   Respiratory — deliberately QUIET (a tripwire, not a trend): one muted line with range
//                 context, no chart. Never given equal visual weight to Resting HR.
// Reuses the existing Movement arrow, the BodyChart spark, and baselineBand — no new calc.

function rangeText(band, metric) {
  return band?.hasEnoughData ? `${fmtNum(metric, band.lo)}–${fmtNum(metric, band.hi)}` : null;
}

export default function VitalsColumn({ body, rowsByMetric, today }) {
  const rhr = body?.resting_heart_rate;
  const resp = body?.respiratory_rate;
  const rhrAvg = rhr?.rolling?.[7]?.avg ?? null;
  const respAvg = resp?.rolling?.[7]?.avg ?? null;
  const rhrRange = rangeText(baselineBand(rowsByMetric?.resting_heart_rate, { end: today }), "resting_heart_rate");
  const respRange = rangeText(baselineBand(rowsByMetric?.respiratory_rate, { end: today }), "respiratory_rate");

  return (
    <aside className="vitals">
      <div className="vitals-eyebrow">Vitals</div>

      {/* Resting HR — the real look */}
      <div className="vital-rhr">
        <div className="vital-rhr-top">
          <span className="vital-rhr-num">{Number.isFinite(rhrAvg) ? fmtFull("resting_heart_rate", rhrAvg) : "—"}</span>
          <span className="vital-rhr-trend"><Movement metric="resting_heart_rate" trend={rhr?.trend} /></span>
        </div>
        <span className="vital-label">Resting HR · 7-day avg</span>
        <div className="vital-spark">
          <BodyChart series={rhr?.rolling?.[90]?.values || []} variant="spark" metric="resting_heart_rate" />
        </div>
        {rhrRange && <span className="vital-range">your range {rhrRange} bpm</span>}
      </div>

      {/* Respiratory — deliberately quiet */}
      <p className="vital-resp">
        Respiratory {Number.isFinite(respAvg) ? fmtFull("respiratory_rate", respAvg) : "—"}
        {respRange ? ` · steady in your ${respRange} range` : ""}
      </p>
    </aside>
  );
}
