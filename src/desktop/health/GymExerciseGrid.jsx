// LifeOS — Gym V2 (Piece 12; Piece 14: header lifted out), Screen 2: the top-6 exercise grid.
// Ranked by the Volume/Reps toggle that now lives in Training's consolidated two-zone header. Each
// card: exercise name, current best weight + delta (the established terracotta-for-gain convention,
// reused from the lift table), and a secondary line — reps this window · avg weight PER REP
// (volume ÷ reps) · sets. Clicking a card drills into that exercise's own combo chart (Screen 3).
// Pure presentation — gymProgress.exerciseRanking owns the maths.

const kg = (n) => (n == null ? "—" : `${Number(n.toFixed(1))}`);
function deltaText(row) {
  if (row.bodyweight) return { text: "", cls: "gym-lt-delta gym-lt-delta--none" };
  if (row.isNew) return { text: "new", cls: "gym-lt-delta gym-lt-delta--gain" };
  if (row.delta == null) return { text: "", cls: "gym-lt-delta gym-lt-delta--none" };
  const d = Number(row.delta.toFixed(1));
  if (d === 0) return { text: "±0", cls: "gym-lt-delta gym-lt-delta--flat" };
  if (d > 0) return { text: `+${d} kg`, cls: "gym-lt-delta gym-lt-delta--gain" };
  return { text: `−${Math.abs(d)} kg`, cls: "gym-lt-delta gym-lt-delta--down" };
}
const nfmt = (n) => Math.round(n).toLocaleString("en-GB");

export default function GymExerciseGrid({ rows, onPick }) {
  return (
    <div className="gym-grid-zone">
      {!rows || rows.length === 0 ? (
        <p className="gym-ph">No exercises logged for this routine in this window.</p>
      ) : (
        <div className="gym-grid">
          {rows.map((r) => {
            const d = deltaText(r);
            return (
              <button type="button" className="gym-card" key={r.key} onClick={() => onPick(r)}>
                <span className="gym-card-name">{r.name}</span>
                <span className="gym-card-best">
                  <span className="gym-card-best-w">{r.bodyweight ? "—" : `${kg(r.best)} kg`}</span>
                  {d.text && <span className={d.cls}>{d.text}</span>}
                </span>
                <span className="gym-card-sub">
                  <span>{nfmt(r.reps)} reps</span>
                  <span className="gym-card-dot">·</span>
                  <span>{r.avgWeightPerRep != null ? `${kg(r.avgWeightPerRep)} kg/rep` : "—"}</span>
                  <span className="gym-card-dot">·</span>
                  <span>{r.sets} set{r.sets === 1 ? "" : "s"}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
