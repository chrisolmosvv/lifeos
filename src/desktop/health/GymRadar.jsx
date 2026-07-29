import { useState } from "react";
import { prettyMuscle } from "../../spine/logic/gymFormat";

// LifeOS — Gym V2 (Piece 8): the Body-Part Balance radar. A hand-rolled SVG spoke chart — one
// axis per group (the top-7 by the active metric), DYNAMIC max scale (always scaled to the
// current top group), the data polygon grows outward from centre on load. ≥3 groups → filled
// polygon; 1–2 groups → spokes + points only (a minimal gauge, never a broken shape).
// Piece 18: hovering a spoke now floats a rich bordered CARD (title · hero number · % of total ·
// trend arrow) that repositions per point — replacing the old SVG label that overlapped the axis
// text. The card is an absolutely-positioned HTML overlay; its edge-aware transform keeps it off
// the labels and inside view. Pure presentation.

const CX = 120, CY = 108, R = 66;
const VBW = 240, VBH = 216; // viewBox — the card maps SVG point coords to % of this box
const RINGS = [0.5, 1];

// Share pp-change → arrow (same thresholds as GymBalance's list: ±1pp is steady).
function trendArrow(pp) {
  if (pp == null) return null;
  if (pp >= 1) return "↑";
  if (pp <= -1) return "↓";
  return "→";
}

export default function GymRadar({ radar, radarMax, metric }) {
  const [hover, setHover] = useState(null);
  const n = radar.length;
  if (n === 0) return null;

  const max = radarMax || 1;
  const angle = (i) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i, rad) => [CX + rad * Math.cos(angle(i)), CY + rad * Math.sin(angle(i))];
  const dataPts = radar.map((r, i) => pt(i, (r.value / max) * R));
  const poly = dataPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const fmtVal = (v) => (metric === "volume" ? `${Math.round(v).toLocaleString("en-GB")} kg` : `${v} set${v === 1 ? "" : "s"}`);

  // Floating-card placement: anchor at the hovered point (as % of the viewBox), then offset with an
  // edge-aware transform — card sits BELOW points in the upper half / ABOVE in the lower half, and
  // hugs left/right when the point is near an edge, so it never rides the axis labels or clips out.
  const hp = hover == null ? null : radar[hover];
  const cardStyle = (() => {
    if (hover == null) return null;
    const [px, py] = dataPts[hover];
    const leftPct = (px / VBW) * 100, topPct = (py / VBH) * 100;
    const tx = leftPct < 28 ? "0%" : leftPct > 72 ? "-100%" : "-50%";
    const ty = py < CY ? "10px" : "calc(-100% - 10px)";
    return { left: `${leftPct}%`, top: `${topPct}%`, transform: `translate(${tx}, ${ty})` };
  })();

  return (
    <div className="gym-radar-wrap">
      <svg className="gym-radar" viewBox="0 0 240 216" role="img" aria-label="Body-part balance radar">
        {/* frame rings + axis spokes */}
        {RINGS.map((f, k) => (
          <circle key={k} className="gym-radar-ring" cx={CX} cy={CY} r={R * f} />
        ))}
        {radar.map((r, i) => {
          const [ex, ey] = pt(i, R);
          return <line key={i} className="gym-radar-axis" x1={CX} y1={CY} x2={ex} y2={ey} />;
        })}

        {/* data polygon (≥3) or a connecting line (2); grows from centre on load */}
        {n >= 3 && <polygon className="gym-radar-poly" points={poly} style={{ transformOrigin: `${CX}px ${CY}px` }} />}
        {n === 2 && <polyline className="gym-radar-line" points={poly} />}

        {/* vertices + labels + hover hit-targets */}
        {radar.map((r, i) => {
          const [px, py] = dataPts[i];
          const [lx, ly] = pt(i, R + 12);
          const anchor = Math.abs(lx - CX) < 6 ? "middle" : lx > CX ? "start" : "end";
          const on = hover === i;
          return (
            <g key={r.muscle}>
              <circle className={on ? "gym-radar-dot is-on" : "gym-radar-dot"} cx={px} cy={py} r={on ? 3.4 : 2.4} />
              <text className="gym-radar-label" x={lx} y={ly + 3} textAnchor={anchor}>{prettyMuscle(r.muscle)}</text>
              <circle className="gym-radar-hit" cx={px} cy={py} r={11}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          );
        })}
      </svg>

      {hp && (
        <div className="gym-radar-card" style={cardStyle}>
          <span className="gym-radar-card-title">{prettyMuscle(hp.muscle)}</span>
          <span className="gym-radar-card-hero">{fmtVal(hp.value)}</span>
          <span className="gym-radar-card-meta">
            {Math.round(hp.pct)}% of total
            {trendArrow(hp.trend) && <span className="gym-radar-card-trend">{trendArrow(hp.trend)}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
