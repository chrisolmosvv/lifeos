import { clockRange, formatDuration, stars } from "./focusFormat.js";

// FocusLedger (spec §7/§L) — the session ledger beside the dial: newest first, one
// tight line each (time · category-dot · task/label · duration · ★ · note-glyph).
// It FILLS the available height and caps via overflow (never a long internal scroll);
// "see all" opens the full ledger page. Tapping a row's category dot filters (parent
// dims the dial + this list); a note-glyph reveals the note on tap.
//
// Props: rows (dayLedger output, already category-filtered if active), colorFor(id),
//   onPickCategory(id), onSeeAll, filterActive, onClear.
export default function FocusLedger({ rows, colorFor, onPickCategory, onSeeAll, filterActive, onClear }) {
  return (
    <div className="focus-ledger">
      <div className="focus-ledger-head">
        <span className="focus-ledger-title">Today</span>
        {filterActive
          ? <button className="focus-linkbtn" onClick={onClear}>clear</button>
          : <button className="focus-linkbtn" onClick={onSeeAll}>see all ›</button>}
      </div>

      <div className="focus-ledger-list">
        {rows.length === 0 && <p className="focus-empty">Nothing logged yet.</p>}
        {rows.map((r) => {
          const label = r.taskTitle || r.categorySnapshot?.name || "No label";
          return (
            <div key={r.id} className="focus-ledger-row">
              <span className="focus-ledger-time tnum">{clockRange(r.startMin, r.endMin)}</span>
              <button className="focus-ledger-dotbtn" onClick={r.categoryId ? () => onPickCategory(r.categoryId) : undefined}
                aria-label={r.categorySnapshot?.name || "No category"}>
                <span className="focus-dot" style={{ background: colorFor(r.categoryId) }} />
              </button>
              <span className="focus-ledger-label">{label}</span>
              <span className="focus-ledger-dur tnum">{formatDuration(r.focusSeconds)}</span>
              <span className="focus-ledger-stars">{stars(r.rating)}</span>
              {r.note ? <span className="focus-ledger-note" title={r.note}>✎</span> : <span className="focus-ledger-note" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
