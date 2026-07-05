// CalorieArc — a full 360° circular ring (Slice 1a rebuild). Ink stroke on a muted track,
// consumed kcal large Fraunces centre, "of {goal} kcal today" small beneath. Standard SVG
// stroke-dasharray/dashoffset math: dasharray = circumference, dashoffset = C * (1 - frac).
// Props: arc = the F3 calorieArc() result { consumed, goal, hasGoal, fraction }.

const SIZE = 140;
const C = SIZE / 2;
const R = 62; // ring radius — stroke centred on this
const CIRC = 2 * Math.PI * R;

const commas = (n) => Math.round(n).toLocaleString("en-US");

export default function CalorieArc({ arc }) {
  const frac = arc?.hasGoal ? Math.max(0, Math.min(1, arc.fraction ?? 0)) : 0;

  return (
    <div className="ca">
      <svg className="ca-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="calories versus goal">
        {/* Track (full circle, muted) */}
        <circle className="ca-track" cx={C} cy={C} r={R} />
        {/* Value (filled portion, rotated so it starts at 12 o'clock) */}
        <circle
          className="ca-value"
          cx={C} cy={C} r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          transform={`rotate(-90 ${C} ${C})`}
        />
        <text className="ca-num" x={C} y={C - 6} textAnchor="middle" dominantBaseline="central">
          {commas(arc?.consumed ?? 0)}
        </text>
        <text className="ca-sub" x={C} y={C + 18} textAnchor="middle" dominantBaseline="central">
          {arc?.hasGoal ? `of ${commas(arc.goal)} kcal today` : "kcal today"}
        </text>
      </svg>
    </div>
  );
}
