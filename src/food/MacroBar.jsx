// MacroBar — today's calories split into protein/carbs/fat (a PROPORTION, by calories via
// the F3 macroSplit). Beneath each: grams + a faint target ("P 95/120g"). Restrained ink
// tints (no rainbow; terracotta stays reserved for the arc). No math here — split + grams
// come in from the calc layer. Props: split {protein,carbs,fat} fractions, grams (the day
// total), targets {protein,carbs,fat}|nulls (faint, omitted when no goal).
import { fmtNum } from "./foodFormat";

const MACROS = [
  { key: "protein", label: "P" },
  { key: "carbs", label: "C" },
  { key: "fat", label: "F" },
];

export default function MacroBar({ split, grams, targets }) {
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
      <div className="mb-labels">
        {MACROS.map((m) => (
          <span key={m.key} className="mb-label">
            <span className="mb-key">{m.label}</span> {fmtNum(m.key, grams?.[m.key] ?? 0)}
            {targets?.[m.key] != null ? (
              <span className="mb-target">/{fmtNum(m.key, targets[m.key])}g</span>
            ) : (
              <span className="mb-unit">g</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
