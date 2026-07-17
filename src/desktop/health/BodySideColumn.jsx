import BodyChart from "./BodyChart";
import { Movement } from "./BodyCells";
import { smoothedSeries } from "../../spine/logic/bodyComposition";
import { goalProgress, baselineBand } from "../../spine/logic/healthBodyRange";
import { fmtFull, fmtDelta, fmtNum } from "../../spine/logic/bodyFormat";
import "../kit/bodySide.css";

// LifeOS — Body V3 (Piece 7): the RIGHT column. Three stacked sections with equal breathing
// room, running alongside the full-width chart:
//   WEIGHT      — full hero number + "7-day avg" caption + the "X kg to goal" text beneath.
//   BODY FAT %  — full hero number + "7-day avg" caption (no goal text).
//   VITALS      — Resting HR (value + trend + sparkline + range) and a quiet Respiratory line.
// The heroes ALWAYS show today's values — they no longer follow the chart hover (Piece 7
// decoupled that; the chart now has its own tooltip). Reuses smoothedSeries / goalProgress /
// baselineBand / Movement / the BodyChart spark — no new calc.

// today's latest daily value + its 7-day smoothed average, for a hero.
function heroFrom(series) {
  const last = series.length ? series[series.length - 1] : null;
  return last ? { raw: last.raw, smoothed: last.smoothed } : null;
}
function rangeText(band, metric) {
  return band?.hasEnoughData ? `${fmtNum(metric, band.lo)}–${fmtNum(metric, band.hi)}` : null;
}

export default function BodySideColumn({ weightRows, bodyFatRows, weightGoal, body, rowsByMetric, today }) {
  const w = heroFrom(smoothedSeries(weightRows, { smooth: 7 }));
  const f = heroFrom(smoothedSeries(bodyFatRows, { smooth: 7, withBand: false }));

  const goalProg = goalProgress(weightRows, weightGoal, { end: today });
  const goalText = goalProg
    ? goalProg.met
      ? `goal met (${fmtFull("weight", goalProg.target)})`
      : `${fmtDelta("weight", goalProg.remaining)} to ${fmtFull("weight", goalProg.target)}`
    : null;

  const rhr = body?.resting_heart_rate;
  const resp = body?.respiratory_rate;
  const rhrAvg = rhr?.rolling?.[7]?.avg ?? null;
  const respAvg = resp?.rolling?.[7]?.avg ?? null;
  const rhrRange = rangeText(baselineBand(rowsByMetric?.resting_heart_rate, { end: today }), "resting_heart_rate");
  const respRange = rangeText(baselineBand(rowsByMetric?.respiratory_rate, { end: today }), "respiratory_rate");

  return (
    <aside className="bside">
      {/* WEIGHT hero + goal text */}
      <section className="bside-hero">
        <span className="bside-hero-num">{Number.isFinite(w?.raw) ? fmtFull("weight", w.raw) : "—"}</span>
        <span className="bside-hero-cap"><b>weight</b> · {Number.isFinite(w?.smoothed) ? `7-day avg ${fmtFull("weight", w.smoothed)}` : "no data yet"}</span>
        {goalText && <span className="bside-goal">{goalText}</span>}
      </section>

      {/* BODY FAT hero */}
      <section className="bside-hero">
        <span className="bside-hero-num">{Number.isFinite(f?.raw) ? fmtFull("body_fat", f.raw) : "—"}</span>
        <span className="bside-hero-cap"><b>body fat</b> · {Number.isFinite(f?.smoothed) ? `7-day avg ${fmtFull("body_fat", f.smoothed)}` : "no data yet"}</span>
      </section>

      {/* VITALS */}
      <section className="bside-vitals">
        <div className="vitals-eyebrow">Vitals</div>
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
        <p className="vital-resp">
          Respiratory {Number.isFinite(respAvg) ? fmtFull("respiratory_rate", respAvg) : "—"}
          {respRange ? ` · steady in your ${respRange} range` : ""}
        </p>
      </section>
    </aside>
  );
}
