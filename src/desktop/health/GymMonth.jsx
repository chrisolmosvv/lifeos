// LifeOS — Gym V2 (Piece 10): one calendar month, Sun→Sat. Full size (Today view, with a
// weekday header) or a compact TILE (3/6/12-month views, with a short label + a terracotta
// session-count badge). Three-state cells: 'on' = the selected routine trained that day (full
// terracotta), 'other' = a different routine trained (light tint), 'none' = no session (grey);
// 'blank' = padding outside the month. Today's cell is ringed. Pure presentation.

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function cellClass(c) {
  let cls = "gym-cal-cell";
  if (c.state === "blank") cls += " gym-cal-cell--blank";
  else if (c.state === "on") cls += " gym-cal-cell--on";
  else if (c.state === "other") cls += " gym-cal-cell--other";
  if (c.isToday) cls += " gym-cal-cell--today";
  return cls;
}

export default function GymMonth({ month, tile = false, showBadge = false }) {
  const label = tile ? month.label.split(" ")[0].slice(0, 3) : month.label;
  return (
    <div className={tile ? "gym-cal gym-cal--tile" : "gym-cal"}>
      <span className="gym-cal-label">{label}</span>
      {!tile && (
        <div className="gym-cal-dow">{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
      )}
      <div className="gym-cal-grid">
        {month.weeks.flat().map((c, i) => <span key={i} className={cellClass(c)} />)}
      </div>
      {showBadge && <span className="gym-cal-badge">{month.count}</span>}
    </div>
  );
}
