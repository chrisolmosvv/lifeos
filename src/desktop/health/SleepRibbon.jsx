import { clockTime } from "../../spine/logic/healthFormat";

// SleepRibbon — a flowing hypnogram for the Hub's sleep section. NOT the detail page's
// lane-per-stage timeline: this threads ONE ribbon between four stage lanes (Awake top →
// Deep bottom) across the night, left = bedtime, right = wake. Each stage run is a
// rounded capsule at its lane, coloured by stage; thin connectors bridge the level
// changes so the night reads as a continuous descent-and-rise. Driven by parseSegments
// blocks. When a night has NO segments (older rows) we fall back to `band` — a plain
// proportional stacked bar — rather than faking an ordered sequence.

const LANE_Y = { awake: 12, rem: 30, core: 48, deep: 66 }; // top → bottom
const STAGE_FILL = { awake: "#C9BEA6", rem: "#8C7C64", core: "#4A3F34", deep: "#1E1A16" };
const W = 600;
const H = 80;
const PAD = 6;
const CAP_H = 9; // capsule thickness

export default function SleepRibbon({ blocks, band, inBedAt, wokeAt }) {
  // Fallback: no ordered segments → a proportional stacked band (honest, not sequenced).
  if ((!blocks || blocks.length === 0) && band && band.length) {
    return (
      <div className="hslp-ribbon hslp-ribbon--band">
        <div className="hslp-band" role="img" aria-label="Estimated sleep-stage split (no timeline for this night)">
          {band.map((p) => (
            <span key={p.stage} className="hslp-band-seg" style={{ width: `${p.pct}%`, background: STAGE_FILL[p.stage] || "#8C7C64" }} />
          ))}
        </div>
        <div className="hslp-ribbon-ends">
          <span>{clockTime(inBedAt)}</span>
          <span className="hslp-band-note">estimated split · no timeline</span>
          <span>{clockTime(wokeAt)}</span>
        </div>
      </div>
    );
  }
  if (!blocks || blocks.length === 0) return null;

  const start = blocks[0].startMs;
  const end = blocks[blocks.length - 1].endMs;
  const span = Math.max(1, end - start);
  const x = (ms) => PAD + ((ms - start) / span) * (W - 2 * PAD);
  const laneY = (cls) => (LANE_Y[cls] ?? LANE_Y.core);

  // Thin connectors bridging consecutive stage runs at the boundary x.
  const connectors = [];
  for (let i = 0; i < blocks.length - 1; i++) {
    const bx = x(blocks[i].endMs);
    connectors.push({ x: bx, y1: laneY(blocks[i].cls) + CAP_H / 2, y2: laneY(blocks[i + 1].cls) + CAP_H / 2 });
  }

  return (
    <div className="hslp-ribbon">
      <svg className="hslp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Sleep stages across the night, bedtime to wake">
        {connectors.map((c, i) => (
          <line key={`c${i}`} x1={c.x} y1={c.y1} x2={c.x} y2={c.y2} stroke="rgba(28,25,22,0.28)" strokeWidth="1.4" />
        ))}
        {blocks.map((b, i) => {
          const x0 = x(b.startMs);
          const w = Math.max(2, x(b.endMs) - x0);
          return (
            <rect key={i} x={x0} y={laneY(b.cls)} width={w} height={CAP_H} rx={CAP_H / 2}
              fill={STAGE_FILL[b.cls] || "#8C7C64"} />
          );
        })}
      </svg>
      <div className="hslp-ribbon-ends">
        <span>{clockTime(inBedAt)}</span>
        <span>{clockTime(wokeAt)}</span>
      </div>
    </div>
  );
}
