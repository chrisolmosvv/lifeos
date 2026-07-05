// MacroBar (Slice 1a rebuild) — a thin stacked bar (P/C/F by calorie contribution) spanning
// available width, with three sentence-case lines beneath: "Protein — {consumed} of {goal}g".
// Fibre/sugar/sodium shown below in muted italic. Props: split {protein,carbs,fat} fractions,
// grams (the day total), targets {protein,carbs,fat}|nulls, micros {fibre,sugar,sodium}.
import { fmtNum, fmtFull } from "./foodFormat";

const MACROS = [
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
];

export default function MacroBar({ split, grams, targets, micros }) {
  const total = (split?.protein ?? 0) + (split?.carbs ?? 0) + (split?.fat ?? 0);
  return (
    <div className="mb">
      <div className="mb-bar" role="img" aria-label="macro split">
        {total > 0 ? (
          MACROS.map((m) => (
            <span key={m.key} className={`mb-seg mb-${m.key}`} style={{ width: `${(split[m.key] * 100).toFixed(1)}%` }} />
          ))
        ) : (
          <span className="mb-seg mb-empty" style={{ width: "100%" }} />
        )}
      </div>
      <div className="mb-lines">
        {MACROS.map((m) => (
          <p key={m.key} className="mb-line">
            <span className="mb-name">{m.label}</span>
            <span className="mb-sep"> — </span>
            <span className="mb-val">{fmtNum(m.key, grams?.[m.key] ?? 0)}</span>
            {targets?.[m.key] != null ? (
              <span className="mb-goal"> of {fmtNum(m.key, targets[m.key])}g</span>
            ) : (
              <span className="mb-goal">g</span>
            )}
          </p>
        ))}
      </div>
      {micros && (
        <p className="mb-micros">
          fibre {fmtFull("fibre", micros.fibre)} · sugar {fmtFull("sugar", micros.sugar)} · sodium {fmtFull("sodium", micros.sodium)}
        </p>
      )}
    </div>
  );
}
