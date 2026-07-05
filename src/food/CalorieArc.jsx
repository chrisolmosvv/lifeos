// CalorieArc (Piece 2) — a full 360° ring, ~80% of left column width (~336px), 8px stroke.
// Consumed kcal large Fraunces (~72px), "of {goal} kcal today" small Inter beneath.
// Props: arc = the F3 calorieArc() result { consumed, goal, hasGoal, fraction }.

const SIZE = 336;
const C = SIZE / 2;
const R = 155; // ring radius — stroke centred on this
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
        <text className="ca-num" x={C} y={C - 14} textAnchor="middle" dominantBaseline="central">
          {commas(arc?.consumed ?? 0)}
        </text>
        <text className="ca-sub" x={C} y={C + 26} textAnchor="middle" dominantBaseline="central">
          {arc?.hasGoal ? `of ${commas(arc.goal)} kcal today` : "kcal today"}
        </text>
      </svg>
    </div>
  );
}
