import { useMemo, useState } from "react";
import { humanDayLong } from "../../spine/logic/gymDates";
import { clockRange, formatDuration, stars } from "./focusFormat.js";

// FullLedgerPage (spec §7) — the dedicated, flat, filterable session history reached
// via "see all". This is the ONE focus surface allowed to scroll (it's inventory, not
// the overview). Newest first, grouped by day, with a category filter; each row keeps
// Edit + Delete (so that capability survives the piece-3 removal of the scaffold list).
//
// Props: rows (ledgerAll output), colorFor(id), busy, initialTaskFilter (taskId|null,
//   from the form's "see all"), onBack, onEdit(row), onDelete(row).
export default function FullLedgerPage({ rows, colorFor, busy, initialTaskFilter, onBack, onEdit, onDelete }) {
  const [filter, setFilter] = useState(null); // categoryId | null (all)
  const [taskFilter, setTaskFilter] = useState(initialTaskFilter || null);

  // Distinct categories present, for the filter chips (name from the snapshot).
  const cats = useMemo(() => {
    const m = new Map();
    for (const r of rows) if (r.categoryId && !m.has(r.categoryId)) m.set(r.categoryId, r.categorySnapshot?.name || "—");
    return [...m.entries()];
  }, [rows]);

  const taskTitle = taskFilter ? rows.find((r) => r.taskId === taskFilter)?.taskTitle : null;
  let shown = taskFilter ? rows.filter((r) => r.taskId === taskFilter) : rows;
  if (filter) shown = shown.filter((r) => r.categoryId === filter);

  // Group consecutively by ymd (rows are already newest-first).
  const groups = [];
  for (const r of shown) {
    const g = groups[groups.length - 1];
    if (g && g.ymd === r.ymd) g.rows.push(r);
    else groups.push({ ymd: r.ymd, rows: [r] });
  }

  return (
    <div className="focus-full">
      <div className="focus-full-head">
        <button className="focus-linkbtn" onClick={onBack}>‹ Back</button>
        <span className="focus-full-title">All focus sessions</span>
      </div>

      <div className="focus-full-filters">
        {taskFilter && (
          <button className="focus-chip is-on" onClick={() => setTaskFilter(null)}>{taskTitle || "This task"} ✕</button>
        )}
        <button className={"focus-chip" + (filter == null ? " is-on" : "")} onClick={() => setFilter(null)}>All categories</button>
        {cats.map(([id, name]) => (
          <button key={id} className={"focus-chip" + (filter === id ? " is-on" : "")} onClick={() => setFilter(id)}>
            <span className="focus-dot" style={{ background: colorFor(id) }} />{name}
          </button>
        ))}
      </div>

      <div className="focus-full-list">
        {shown.length === 0 && <p className="focus-empty">No sessions.</p>}
        {groups.map((g) => (
          <div key={g.ymd} className="focus-full-group">
            <div className="focus-full-daylabel">{humanDayLong(g.ymd)}</div>
            {g.rows.map((r) => (
              <div key={r.id} className="focus-full-row">
                <span className="focus-ledger-time tnum">{clockRange(r.startMin, r.endMin)}</span>
                <span className="focus-dot" style={{ background: colorFor(r.categoryId) }} />
                <span className="focus-ledger-label">{r.taskTitle || r.categorySnapshot?.name || "No label"}</span>
                <span className="focus-ledger-dur tnum">{formatDuration(r.focusSeconds)}</span>
                <span className="focus-ledger-stars">{stars(r.rating)}</span>
                {r.note && <span className="focus-ledger-note" title={r.note}>✎</span>}
                <span className="focus-list-actions">
                  <button className="focus-linkbtn" onClick={() => onEdit(r)} disabled={busy}>Edit</button>
                  <button className="focus-linkbtn" onClick={() => onDelete(r)} disabled={busy}>Delete</button>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
