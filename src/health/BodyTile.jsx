import BodyChart from "./BodyChart";
import { metaFor, fmtNum, fmtDelta } from "./bodyFormat";

// BodyTile — one metric tile, shared by both groups. Same format everywhere:
//   label · big value (+ unit) · a small sub-line · trend mark · 90-day sparkline.
// The CALLER decides which value to pass (Composition → latest reading; Vitals →
// 7-day average) and the sub-line text (an age, or "7-day average"). Optional extras:
//   `extra` — a node under the value (body-fat passes its fat-mass kg here)
//   `band`  — a vitals personal-range band; shown ONLY when it has enough data.
// No data at all (no value AND no series) → a quiet "no data yet".

// The trend arrow + delta. Shown only when both 7-day windows had data (calc returns
// dir=null otherwise → a plain "—", never a faked zero). Any real movement is
// terracotta (the house rule: terracotta = movement); flat/steady stays ink.
function Trend({ metric, trend }) {
  if (!trend || trend.dir == null) return <span className="body-trend body-trend--none">—</span>;
  if (trend.dir === "flat") return <span className="body-trend body-trend--flat">→ steady</span>;
  const arrow = trend.dir === "down" ? "↓" : "↑";
  return (
    <span className="body-trend body-trend--move">
      {arrow} {fmtDelta(metric, trend.diff)}
    </span>
  );
}

export default function BodyTile({
  metric, value, subLabel, extra, trend, series, band,
  chartVariant = "spark", windowStart, windowEnd, goalValue,
}) {
  const meta = metaFor(metric);
  const hasValue = Number.isFinite(value);
  const hasSeries = (series || []).some((p) => Number.isFinite(p?.value));

  if (!hasValue && !hasSeries) {
    return (
      <div className="body-tile">
        <span className="body-tile-label">{meta.label}</span>
        <span className="body-tile-nodata">no data yet</span>
      </div>
    );
  }

  const showBand = band && band.hasEnoughData;

  return (
    <div className="body-tile">
      <span className="body-tile-label">{meta.label}</span>
      <div className="body-tile-value">
        {fmtNum(metric, value)}
        {hasValue && <span className="body-tile-unit">{meta.tight ? meta.unit : ` ${meta.unit}`}</span>}
      </div>
      {subLabel && <span className="body-tile-sub">{subLabel}</span>}
      {extra && <span className="body-tile-extra">{extra}</span>}
      <Trend metric={metric} trend={trend} />
      <BodyChart
        series={series}
        variant={chartVariant}
        metric={metric}
        windowStart={windowStart}
        windowEnd={windowEnd}
        goalValue={goalValue}
        band={band}
      />
      {showBand && (
        <span className="body-tile-band">
          typical {fmtNum(metric, band.lo)}–{fmtNum(metric, band.hi)} {meta.unit}
        </span>
      )}
    </div>
  );
}
