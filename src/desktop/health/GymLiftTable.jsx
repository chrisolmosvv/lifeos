// LifeOS — Gym V2 (Piece 3): the per-routine lift table. Each row = a lift trained in the
// selected routine + time window: name, current best (heaviest working weight in-window),
// and the delta vs the best BEFORE the window. Bodyweight/duration lifts show "—" for both
// (never a fake 0). Movement reads in INK (state ≠ accent — terracotta stays reserved for
// PR dots + the streak badge). Pure presentation — gymRoutine.liftTable owns the maths.

// Trim a weight to at most 1 decimal, no trailing ".0" (28.5 → "28.5", 90.0 → "90").
const kg = (n) => (n == null ? "—" : `${Number(n.toFixed(1))}`);
function deltaText(row) {
  if (row.bodyweight) return { text: "", cls: "gym-lt-delta gym-lt-delta--none" };
  if (row.isNew) return { text: "new", cls: "gym-lt-delta gym-lt-delta--new" };
  if (row.delta == null) return { text: "", cls: "gym-lt-delta gym-lt-delta--none" };
  const d = Number(row.delta.toFixed(1));
  if (d === 0) return { text: "±0", cls: "gym-lt-delta gym-lt-delta--flat" };
  const sign = d > 0 ? "+" : "−";
  return { text: `${sign}${Math.abs(d)} kg`, cls: "gym-lt-delta gym-lt-delta--move" };
}

export default function GymLiftTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <p className="gym-ph">No lifts logged for this routine in this window.</p>;
  }
  return (
    <div className="gym-lift-table">
      {rows.map((r) => {
        const d = deltaText(r);
        return (
          <div className="gym-lt-row" key={r.key}>
            <span className="gym-lt-name">{r.name}</span>
            <span className="gym-lt-best">{r.bodyweight ? "—" : `${kg(r.best)} kg`}</span>
            <span className={d.cls}>{d.text}</span>
          </div>
        );
      })}
    </div>
  );
}
