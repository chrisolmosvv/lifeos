// MacroRings (Piece 2) — three small rings (protein/carbs/fat), each with its own consumed/goal
// fraction, consumed grams centred in Fraunces, label + "of Xg" beneath. Plus micros line below.
// Props: grams (day total), targets {protein,carbs,fat}|nulls, micros {fibre,sugar,sodium}.
import { fmtNum, fmtFull } from "./foodFormat";

const SIZE = 100;
const C = SIZE / 2;
const R = 42;
const CIRC = 2 * Math.PI * R;

const MACROS = [
  { key: "protein", label: "PROTEIN" },
  { key: "carbs", label: "CARBS" },
  { key: "fat", label: "FAT" },
];

function MacroRing({ macro, consumed, goal }) {
  const frac = goal != null && goal > 0 ? Math.max(0, Math.min(1, consumed / goal)) : 0;
  return (
    <div className="mr-item">
      <svg className="mr-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${macro.label} ring`}>
        <circle className="mr-track" cx={C} cy={C} r={R} />
        <circle
          className="mr-value"
          cx={C} cy={C} r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          transform={`rotate(-90 ${C} ${C})`}
        />
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

export default function MacroRings({ grams, targets, micros }) {
  return (
    <div className="mr">
      <div className="mr-row">
        {MACROS.map((m) => (
          <MacroRing key={m.key} macro={m} consumed={grams?.[m.key] ?? 0} goal={targets?.[m.key] ?? null} />
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
