// CalorieArc — the editorial calorie ring (F5's new SVG primitive; nothing like it existed).
// A 270° open arc with the gap at the foot: a faint full-arc TRACK + an ink VALUE arc filled
// via stroke-dasharray/dashoffset, so a SINGLE CSS transition on dashoffset animates the
// sweep. Over goal → a faint concentric TERRACOTTA over-arc shows the overflow (accent used
// sparingly). Centre: consumed kcal big in Fraunces, "of {goal}" small beneath. Hairline
// strokes, not a chunky app ring. Geometry only — every number comes from the F3 calorieArc().
//
// Props: arc = the F3 calorieArc() result { consumed, goal, hasGoal, fraction, over, overBy }.

const SIZE = 200;
const C = SIZE / 2;
const R = 78; //        main arc radius
const OVER_R = R + 9; // the over-goal arc sits just outside the ring
const SWEEP = 270; //   degrees of arc (the 90° gap sits at the foot)
const START = 225; //   start angle, clockwise from the top → the bottom-left foot

// A point on the circle at `angle` degrees measured CLOCKWISE FROM THE TOP (0 = 12 o'clock).
function pt(r, angle) {
  const a = ((angle - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

// The 270° arc path at radius r, START → START+SWEEP, drawn clockwise.
function arcPath(r) {
  const [x1, y1] = pt(r, START);
  const [x2, y2] = pt(r, START + SWEEP);
  const largeArc = SWEEP > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

const commas = (n) => Math.round(n).toLocaleString("en-US");

export default function CalorieArc({ arc }) {
  const frac = arc?.hasGoal ? Math.max(0, Math.min(1, arc.fraction ?? 0)) : 0;
  const overFrac = arc?.over && arc.goal ? Math.max(0, Math.min(1, arc.overBy / arc.goal)) : 0;
  const track = arcPath(R);

  return (
    <div className="ca">
      <svg className="ca-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="calories versus goal">
        {/* pathLength=1 normalises the geometry, so dasharray 1 = the whole arc and
            dashoffset = (1 − fraction) reveals exactly that fraction from the start. */}
        <path className="ca-track" d={track} pathLength="1" />
        <path className="ca-value" d={track} pathLength="1" style={{ strokeDashoffset: 1 - frac }} />
        {overFrac > 0 && (
          <path className="ca-over" d={arcPath(OVER_R)} pathLength="1" style={{ strokeDashoffset: 1 - overFrac }} />
        )}
        <text className="ca-num" x={C} y={C} textAnchor="middle">{commas(arc?.consumed ?? 0)}</text>
        <text className="ca-sub" x={C} y={C + 26} textAnchor="middle">
          {arc?.hasGoal ? `of ${commas(arc.goal)}` : "kcal"}
        </text>
      </svg>
    </div>
  );
}
