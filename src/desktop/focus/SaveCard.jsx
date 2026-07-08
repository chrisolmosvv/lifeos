import { useState } from "react";
import { formatDuration } from "./focusFormat.js";

// Save card (spec §5) — a centred mini pop-up over a scrim (global overlay; the same
// scrim/dialog pattern as the shared form). Confirm/adjust the duration (editable for
// a plain count-up/down; read-only when interval segments define it), a 1–5 star
// quality rating, a "mark this task done?" toggle (task-linked only, via the existing
// status path), free-form notes, then Save or Discard. Also serves EDIT of a saved
// session (mode='edit' → the secondary button is Cancel, not Discard).
//
// Props: title, taskId, mode ('save'|'edit'), durationEditable, initialDurationSeconds,
//        initialRating, initialNote, busy, error,
//        onSubmit({ durationSeconds, rating, note, markDone }), onSecondary().
export default function SaveCard({
  title, taskId, mode = "save", durationEditable, initialDurationSeconds,
  initialRating, initialNote, busy, error, onSubmit, onSecondary,
}) {
  const [minutes, setMinutes] = useState(Math.max(0, Math.round((initialDurationSeconds || 0) / 60)));
  const [rating, setRating] = useState(initialRating || 0);
  const [note, setNote] = useState(initialNote || "");
  const [markDone, setMarkDone] = useState(false);

  function submit() {
    onSubmit({
      durationSeconds: durationEditable ? Math.round(Number(minutes) * 60) : initialDurationSeconds,
      rating: rating || null,
      note,
      markDone,
    });
  }

  return (
    <div className="focus-scrim" onMouseDown={busy ? undefined : onSecondary}>
      <div className="focus-card" role="dialog" aria-modal="true" aria-label={mode === "edit" ? "Edit session" : "Save session"} onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="focus-card-title">{mode === "edit" ? "Edit session" : "Save this session"}</h3>
        <p className="focus-card-subject">{title}</p>

        <div className="focus-card-field">
          <span className="focus-label">Focused time</span>
          {durationEditable ? (
            <div className="focus-mins">
              <input type="number" min="0" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <span>minutes</span>
            </div>
          ) : (
            <span className="focus-card-fixed">{formatDuration(initialDurationSeconds)}</span>
          )}
        </div>

        <div className="focus-card-field">
          <span className="focus-label">Quality</span>
          <div className="focus-stars" role="radiogroup" aria-label="Session quality">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n}
                className={"focus-star" + (n <= rating ? " is-on" : "")}
                onClick={() => setRating(n === rating ? 0 : n)}>★</button>
            ))}
          </div>
        </div>

        {taskId && (
          <label className="focus-done-toggle">
            <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
            <span>Mark this task done</span>
          </label>
        )}

        <div className="focus-card-field">
          <span className="focus-label">Notes</span>
          <textarea className="focus-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — how did it go?" />
        </div>

        {error && <p className="focus-err">{error}</p>}

        <div className="focus-card-actions">
          <button className="focus-btn-ghost focus-btn-danger" onClick={onSecondary} disabled={busy}>
            {mode === "edit" ? "Cancel" : "Discard"}
          </button>
          <button className="focus-btn-start" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
