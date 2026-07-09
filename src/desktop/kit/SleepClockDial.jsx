import { clockFromMin } from "../../spine/logic/healthFormat";

// LifeOS — Sleep rhythm: a 12-hour clock DIAL for bed or wake (V2 P1 2nd refinement,
// replacing the "±116 · variable" text). A thin hairline circle, 4 cardinal ticks only
// (12/3/6/9, no numerals). A faint terracotta arc BAND draws the full earliest→latest
// envelope of the range's nights (wide = variable, tight = consistent). Markers: avg =
// terracotta radial tick, median = hollow ink dot on the rim. The avg time prints in
// Fraunces below, under a small uppercase label. All values are clock minutes; the
// caller has already noon-anchored the envelope (clockExtent) so the spread is honest.
//
// Geometry: 0° at 12 o'clock, clockwise; a clock minute folds to a 12h face via t%720.

const CX = 50, CY = 50, R = 38;
const TICK_IN = 5;
const clockAngle = (t) => ((t % 720) / 720) * 360; // 0 at top, clockwise
const pt = (deg, r) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};

function arcPath(fromDeg, toDeg) {
  const sweep = ((toDeg - fromDeg) % 360 + 360) % 360; // clockwise span
  const [x1, y1] = pt(fromDeg, R);
  const [x2, y2] = pt(toDeg, R);
  const large = sweep > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export default function SleepClockDial({ label, min, max, avg, median }) {
  const hasBand = Number.isFinite(min) && Number.isFinite(max);
  const ticks = [0, 90, 180, 270];
  return (
    <div className="dial">
      <svg viewBox="0 0 100 100" className="dial-face" role="img" aria-label={`${label} clock`}>
        <circle cx={CX} cy={CY} r={R} className="dial-ring" />
        {ticks.map((d) => {
          const [x1, y1] = pt(d, R);
          const [x2, y2] = pt(d, R - TICK_IN);
          return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} className="dial-tick" />;
        })}
        {hasBand && <path d={arcPath(clockAngle(min), clockAngle(max))} className="dial-band" />}
        {Number.isFinite(avg) && (() => {
          const [x1, y1] = pt(clockAngle(avg), R);
          const [x2, y2] = pt(clockAngle(avg), R - 9);
          return <line x1={x1} y1={y1} x2={x2} y2={y2} className="dial-avg" />;
        })()}
        {Number.isFinite(median) && (() => {
          const [x, y] = pt(clockAngle(median), R);
          return <circle cx={x} cy={y} r={2.4} className="dial-median" />;
        })()}
      </svg>
      <div className="dial-avg-time">{clockFromMin(avg)}</div>
      <div className="dial-label">{label}</div>
    </div>
  );
}
