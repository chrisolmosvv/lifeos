import { useState } from "react";
import CategoryPicker from "../kit/CategoryPicker";
import CategoryTag from "../CategoryTag";

// ManualEntry (spec §11) — "add a past session": a subject (prefilled task, or a
// category via the drill-in picker, or no-label), start + end times, an optional
// rating + note. Saved as source='manual' with a snapshotted subject, so it places on
// the dial like any other session. Zero-scroll centred column, mirroring Setup.
//
// Props: prefill? {task_id, task_title_snapshot, category_id, category_snapshot},
//        cats, inboxColor, busy, onSubmit(fields), onCancel().
const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function ManualEntry({ prefill, cats, inboxColor, busy, onSubmit, onCancel }) {
  const now = new Date();
  const [taskId, setTaskId] = useState(prefill?.task_id ?? null);
  const [taskTitle] = useState(prefill?.task_title_snapshot ?? null);
  const [categoryId, setCategoryId] = useState(prefill?.category_id ?? null);
  const [start, setStart] = useState(toLocalInput(new Date(now.getTime() - 3600000)));
  const [end, setEnd] = useState(toLocalInput(now));
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [showPick, setShowPick] = useState(false);
  const [err, setErr] = useState("");

  const selectedCat = categoryId ? cats.find((c) => c.id === categoryId) : null;

  function submit() {
    if (!start || !end) return setErr("Set a start and an end time.");
    const s = new Date(start), e = new Date(end);
    if (!(e > s)) return setErr("The end time must be after the start.");
    const snap = taskId
      ? prefill?.category_snapshot ?? null
      : selectedCat ? { id: selectedCat.id, name: selectedCat.name, color: selectedCat.color ?? null } : null;
    onSubmit({
      started_at: s.toISOString(), ended_at: e.toISOString(),
      mode: "count_up", target_seconds: null, break_seconds: null,
      task_id: taskId, task_title_snapshot: taskId ? taskTitle : null,
      category_id: taskId ? (prefill?.category_id ?? categoryId) : categoryId,
      category_snapshot: snap,
      rating: rating || null, note: note.trim() || null,
    });
  }

  if (showPick) {
    return (
      <div className="focus-setup">
        <button className="focus-back" onClick={() => setShowPick(false)}>‹ Back</button>
        <CategoryPicker cats={cats} value={categoryId} inboxColor={inboxColor}
          onPick={(id) => { setCategoryId(id); setShowPick(false); }} />
      </div>
    );
  }

  return (
    <div className="focus-setup">
      <h2 className="focus-setup-title">Add a past session</h2>

      <div className="focus-field">
        <span className="focus-label">Focusing on</span>
        {taskId ? (
          <div className="focus-subject-chip">
            <span className="focus-subject-task">{taskTitle}</span>
            <button className="focus-chip-x" onClick={() => setTaskId(null)} aria-label="Clear task">×</button>
          </div>
        ) : (
          <button className="focus-catbtn" onClick={() => setShowPick(true)}>
            {selectedCat ? <CategoryTag name={selectedCat.name} color={selectedCat.color} />
              : <span className="focus-nolabel">No label — pick a category (optional)</span>}
            <span className="focus-chev">›</span>
          </button>
        )}
      </div>

      <div className="focus-field">
        <span className="focus-label">Started</span>
        <input className="focus-dt" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="focus-field">
        <span className="focus-label">Ended</span>
        <input className="focus-dt" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      <div className="focus-field">
        <span className="focus-label">Quality</span>
        <div className="focus-stars" role="radiogroup" aria-label="Session quality">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n}
              className={"focus-star" + (n <= rating ? " is-on" : "")} onClick={() => setRating(n === rating ? 0 : n)}>★</button>
          ))}
        </div>
      </div>

      <div className="focus-field">
        <span className="focus-label">Notes</span>
        <textarea className="focus-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </div>

      {err && <p className="focus-err">{err}</p>}
      <div className="focus-setup-actions">
        <button className="focus-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="focus-btn-start" onClick={submit} disabled={busy}>Add session</button>
      </div>
    </div>
  );
}
