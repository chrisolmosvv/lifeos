// CalorieArc (Piece 4) — a full 360° ring with PER-MEAL SEGMENTS. Each meal's contribution
// is a consecutive arc in a shade of ink (darkest=breakfast → lightest=snacks). The remaining
// arc toward the goal is the muted track. Props: arc (calorieArc result), mealTotals (per-slot
// kcal values), nutrient (key to read from mealTotals — 'kcal' for this ring).

const SIZE = 280;
const C = SIZE / 2;
const R = 126;
const CIRC = 2 * Math.PI * R;

// Four shades of the SAME ink — never different hues. Darkest to lightest.
const MEAL_SHADES = [
  "rgba(28, 25, 22, 0.95)", // breakfast — near-full ink
  "rgba(28, 25, 22, 0.68)", // lunch
  "rgba(28, 25, 22, 0.44)", // dinner
  "rgba(28, 25, 22, 0.25)", // snacks — lightest
];
const MEALS = ["breakfast", "lunch", "dinner", "snacks"];

const commas = (n) => Math.round(n).toLocaleString("en-US");

export default function CalorieArc({ arc, mealTotals, nutrient = "kcal" }) {
  const goal = arc?.goal ?? 0;
  const hasGoal = arc?.hasGoal && goal > 0;

  // Build per-meal fractions (of the goal). Each segment starts where the last ended.
  const segments = [];
  if (hasGoal) {
    let offset = 0;
    for (let i = 0; i < MEALS.length; i++) {
      const val = mealTotals?.[MEALS[i]]?.[nutrient] ?? 0;
      if (val <= 0) continue;
      const frac = Math.min(val / goal, 1 - offset); // clamp so total never exceeds 1
      if (frac > 0) segments.push({ shade: MEAL_SHADES[i], offset, frac });
      offset += frac;
      if (offset >= 1) break;
    }
  }

  return (
    <div className="ca">
      <svg className="ca-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="calories versus goal">
        <circle className="ca-track" cx={C} cy={C} r={R} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={C} cy={C} r={R}
            fill="none"
            stroke={seg.shade}
            strokeWidth="8"
            strokeLinecap={i === segments.length - 1 ? "round" : "butt"}
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - seg.frac)}
            transform={`rotate(${-90 + seg.offset * 360} ${C} ${C})`}
            style={{ transition: "stroke-dashoffset 650ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        ))}
        <text className="ca-num" x={C} y={C - 12} textAnchor="middle" dominantBaseline="central">
          {commas(arc?.consumed ?? 0)}
        </text>
        <text className="ca-sub" x={C} y={C + 24} textAnchor="middle" dominantBaseline="central">
          {hasGoal ? `of ${commas(goal)} kcal today` : "kcal today"}
        </text>
      </svg>
    </div>
  );
}

export { MEAL_SHADES, MEALS };
