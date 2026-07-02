import { clockRange, formatDuration, stars } from "./focusFormat.js";

// SessionList — a PLAIN list of today's saved sessions (newest first), with Edit +
// Delete per row. This is a TEMPORARY P2 scaffold so the write loop is verifiable
// end-to-end (see the row land, reload, edit, delete+undo) BEFORE the real Overview
// dial + ledger arrive in piece 3, which replaces it. Reads the piece-1 dayLedger
// getter; no maths of its own.
//
// Props: rows (dayLedger output), busy, onEdit(row), onDelete(row).
export default function SessionList({ rows, busy, onEdit, onDelete }) {
  if (!rows.length) return <p className="focus-empty">No focus logged today yet.</p>;
  return (
    <ul className="focus-list">
      {rows.map((r) => {
        const subject = r.taskTitle || r.categorySnapshot?.name || "No label";
        return (
          <li key={r.id} className="focus-list-row">
            <span className="focus-list-time tnum">{clockRange(r.startMin, r.endMin)}</span>
            <span className="focus-list-subject">{subject}</span>
            <span className="focus-list-dur tnum">{formatDuration(r.focusSeconds)}</span>
            <span className="focus-list-stars">{stars(r.rating)}</span>
            {r.note && <span className="focus-list-note" title={r.note}>✎</span>}
            <span className="focus-list-actions">
              <button className="focus-linkbtn" onClick={() => onEdit(r)} disabled={busy}>Edit</button>
              <button className="focus-linkbtn" onClick={() => onDelete(r)} disabled={busy}>Delete</button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
