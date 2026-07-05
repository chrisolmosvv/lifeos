// MacroRings (Piece 4) — three rings (protein/carbs/fat), each with per-meal segments in ink
// shades. Same segment math as CalorieArc. Props: grams, targets, micros, mealTotals.
import { fmtNum, fmtFull } from "./foodFormat";
import { MEAL_SHADES, MEALS } from "./CalorieArc";

const SIZE = 120;
const C = SIZE / 2;
const R = 50;
const CIRC = 2 * Math.PI * R;

const MACROS = [
  { key: "protein", label: "PROTEIN" },
  { key: "carbs", label: "CARBS" },
  { key: "fat", label: "FAT" },
];

function MacroRing({ macro, consumed, goal, mealTotals }) {
  const hasGoal = goal != null && goal > 0;
  const segments = [];
  if (hasGoal) {
    let offset = 0;
    for (let i = 0; i < MEALS.length; i++) {
      const val = mealTotals?.[MEALS[i]]?.[macro.key] ?? 0;
      if (val <= 0) continue;
      const frac = Math.min(val / goal, 1 - offset);
      if (frac > 0) segments.push({ shade: MEAL_SHADES[i], offset, frac });
      offset += frac;
      if (offset >= 1) break;
    }
  }

  return (
    <div className="mr-item">
      <svg className="mr-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${macro.label} ring`}>
        <circle className="mr-track" cx={C} cy={C} r={R} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={C} cy={C} r={R}
            fill="none"
            stroke={seg.shade}
            strokeWidth="5"
            strokeLinecap={i === segments.length - 1 ? "round" : "butt"}
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - seg.frac)}
            transform={`rotate(${-90 + seg.offset * 360} ${C} ${C})`}
            style={{ transition: "stroke-dashoffset 650ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        ))}
        <text className="mr-num" x={C} y={C} textAnchor="middle" dominantBaseline="central">
          {fmtNum(macro.key, consumed)}
        </text>
      </svg>
      <span className="mr-label">{macro.label}</span>
      {goal != null ? (
        <span className="mr-goal">of {fmtNum(macro.key, goal)}g</span>
      ) : (
        <span className="mr-goal">g</span>
      )}
    </div>
  );
}

const LEGEND = [
  { label: "BKFST", idx: 0 },
  { label: "LUNCH", idx: 1 },
  { label: "DINNER", idx: 2 },
  { label: "SNACK", idx: 3 },
];

export default function MacroRings({ grams, targets, micros, mealTotals }) {
  return (
    <div className="mr">
      <div className="mr-row">
        {MACROS.map((m) => (
          <MacroRing key={m.key} macro={m} consumed={grams?.[m.key] ?? 0} goal={targets?.[m.key] ?? null} mealTotals={mealTotals} />
        ))}
      </div>
      <div className="mr-legend">
        {LEGEND.map((l) => (
          <span key={l.idx} className="mr-legend-item">
            <span className="mr-legend-swatch" style={{ background: MEAL_SHADES[l.idx] }} />
            <span className="mr-legend-label">{l.label}</span>
          </span>
        ))}
      </div>
      {micros && (
        <p className="mr-micros">
          fibre {fmtFull("fibre", micros.fibre)} · sugar {fmtFull("sugar", micros.sugar)} · sodium {fmtFull("sodium", micros.sodium)}
        </p>
      )}
    </div>
  );
}
