import { fmtClock } from "./cookTimers";

// KanbanBoard (V2 P7) — the hybrid board across the top of the cook page: a waiting → active → done
// status flow FUSED with start-now timeline cues from the schedule. A card MANUALLY cycles
// waiting→active→done on tap (NEVER auto-advances). Waiting cards show their scheduled start cue
// ("start now" at offset 0, else "start at +M:SS"). Pure display — the consumer holds board state.
const COLS = [["waiting", "Waiting"], ["active", "Active"], ["done", "Done"]];

export default function KanbanBoard({ steps, schedule, board, onCycle }) {
  const stateOf = (i) => board[i] || "waiting";
  const byCol = { waiting: [], active: [], done: [] };
  steps.forEach((_, i) => byCol[stateOf(i)].push(i));

  return (
    <div className="kb">
      {COLS.map(([col, label]) => (
        <div key={col} className={`kb-col kb-col--${col}`}>
          <span className="kb-col-head">{label} · {byCol[col].length}</span>
          {byCol[col].length === 0 ? (
            <span className="kb-empty">—</span>
          ) : (
            byCol[col].map((i) => {
              const sch = schedule[i];
              return (
                <button key={i} type="button" className="kb-card" onClick={() => onCycle(i)}>
                  <span className="kb-card-n">Step {i + 1}</span>
                  <span className="kb-card-text">{steps[i].text}</span>
                  {col === "waiting" && sch && (
                    <span className={sch.startOffset > 0 ? "kb-card-cue" : "kb-card-cue kb-now"}>
                      {sch.startOffset > 0 ? `start at +${fmtClock(sch.startOffset)}` : "start now"}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
