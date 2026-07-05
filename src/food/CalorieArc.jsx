// CalorieArc — a full 360° ring, ~180px, 7px stroke. Ink on a muted track. Consumed kcal
// large Fraunces centre (~44px), "of {goal} kcal today" small Inter beneath. Standard SVG
// stroke-dasharray/dashoffset: dasharray = circumference, dashoffset = C * (1 - fraction).
// Props: arc = the F3 calorieArc() result { consumed, goal, hasGoal, fraction }.

const SIZE = 180;
const C = SIZE / 2;
const R = 80; // ring radius — stroke centred on this
const CIRC = 2 * Math.PI * R;

const commas = (n) => Math.round(n).toLocaleString("en-US");

export default function CalorieArc({ arc }) {
  const frac = arc?.hasGoal ? Math.max(0, Math.min(1, arc.fraction ?? 0)) : 0;

  return (
    <div className="ca">
      <svg className="ca-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="calories versus goal">
        <circle className="ca-track" cx={C} cy={C} r={R} />
        <circle
          className="ca-value"
          cx={C} cy={C} r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          transform={`rotate(-90 ${C} ${C})`}
        />
        <text className="ca-num" x={C} y={C - 8} textAnchor="middle" dominantBaseline="central">
          {commas(arc?.consumed ?? 0)}
        </text>
        <text className="ca-sub" x={C} y={C + 20} textAnchor="middle" dominantBaseline="central">
          {arc?.hasGoal ? `of ${commas(arc.goal)} kcal today` : "kcal today"}
        </text>
      </svg>
    </div>
  );
}
