import { useCallback, useEffect, useState } from "react";
import { humanDayShort } from "../gym/gymDates.js";
import { fetchTaskSessions } from "../focus/focusLoad.js";
import { perTaskTotal, taskSessions } from "../focus/focusCalc.js";
import { finalizeSession, archiveSession, unarchiveSession, markTaskDone } from "../focus/focusWrite.js";
import { formatDuration, stars } from "../focus/focusFormat.js";
import { requestFocus } from "../focus/focusNav.js";
import { useFocusSessionCtx } from "../focus/focusSessionContext.jsx";
import SaveCard from "../focus/SaveCard";
import Toast from "./Toast";
import "../focus/focusSection.css";

// FocusSection (spec §10) — the task form's Focus block: this task's all-time total +
// a session list (date · duration · ★ · note), a "see all" into the full ledger
// filtered to the task, inline edit + delete (with undo), and ▶ / "add past" that
// route to the Focus pillar prefilled with this task. Mounts in ItemForm on TASK
// EDITS only. No subtree roll-up — only this task's own focus (perTaskTotal/taskSessions).
//
// Props: taskId, taskTitle, categoryId, categorySnapshot, onClose (closes the form).
const CAP = 5;

export default function FocusSection({ taskId, taskTitle, categoryId, categorySnapshot, onClose }) {
  const [raw, setRaw] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState(null);

  const refresh = useCallback(async () => {
    try { setRaw(await fetchTaskSessions(taskId)); } catch { /* keep last */ }
  }, [taskId]);
  useEffect(() => { refresh(); }, [refresh]);

  const total = perTaskTotal(raw, taskId);
  const list = taskSessions(raw, taskId);
  const prefill = { task_id: taskId, task_title_snapshot: taskTitle, category_id: categoryId, category_snapshot: categorySnapshot };

  const fs = useFocusSessionCtx();
  const running = fs && (fs.status === "running" || fs.status === "paused");
  const go = (mode) => {
    // ▶ Start a live session is BLOCKED while one runs (spec §2 — no silent switching).
    // "add past" / "see all" are read/back-fill, never blocked.
    if (mode === "setup" && running) {
      setToast({ text: "A session's already running — stop it first" });
      return;
    }
    requestFocus({ mode, prefill, taskId });
    onClose?.();
  };

  async function onEditSave(form) {
    const r = raw.find((x) => x.id === editing.id);
    const simple = r && r.mode !== "intervals" && (!r.segments || r.segments.length === 0);
    setBusy(true); setErr("");
    try {
      const patch = { rating: form.rating ?? null, note: form.note?.trim() || null };
      if (simple) patch.ended_at = new Date(new Date(r.started_at).getTime() + form.durationSeconds * 1000).toISOString();
      if (form.markDone && taskId) await markTaskDone(taskId);
      await finalizeSession(editing.id, patch); setEditing(null); await refresh();
    } catch (e) { setErr(e.message || "Couldn't save."); } finally { setBusy(false); }
  }
  async function onDelete(row) {
    setBusy(true);
    try {
      await archiveSession(row.id); await refresh();
      setToast({ text: "Session deleted", onUndo: async () => { await unarchiveSession(row.id); setToast(null); await refresh(); } });
    } finally { setBusy(false); }
  }

  const editRaw = editing && raw.find((x) => x.id === editing.id);

  return (
    <div className="tk-focus">
      <div className="tk-focus-head">
        <span className="tk-focus-label">Focus{total > 0 && <span className="tk-focus-total"> · {formatDuration(total)} all-time</span>}</span>
        <span className="tk-focus-acts">
          <button type="button" className="tk-focus-start" onClick={() => go("setup")}>▶ Start</button>
          <button type="button" className="focus-linkbtn" onClick={() => go("manual")}>add past</button>
        </span>
      </div>

      {list.length === 0 ? (
        <p className="tk-focus-empty">No focus on this task yet.</p>
      ) : (
        <>
          <div className="tk-focus-list">
            {list.slice(0, CAP).map((s) => (
              <div key={s.id} className="tk-focus-row">
                <span className="tk-focus-date tnum">{humanDayShort(s.ymd)}</span>
                <span className="tk-focus-dur tnum">{formatDuration(s.focusSeconds)}</span>
                <span className="tk-focus-stars">{stars(s.rating)}</span>
                {s.note ? <span className="tk-focus-note" title={s.note}>✎</span> : <span className="tk-focus-note" />}
                <span className="tk-focus-rowacts">
                  <button type="button" className="focus-linkbtn" onClick={() => setEditing(s)} disabled={busy}>Edit</button>
                  <button type="button" className="focus-linkbtn" onClick={() => onDelete(s)} disabled={busy}>Delete</button>
                </span>
              </div>
            ))}
          </div>
          {list.length > CAP && (
            <button type="button" className="focus-linkbtn tk-focus-seeall" onClick={() => go("full")}>see all {list.length} ›</button>
          )}
        </>
      )}

      {editing && (
        <SaveCard title={taskTitle} taskId={taskId} mode="edit"
          durationEditable={editRaw && editRaw.mode !== "intervals" && (!editRaw.segments || editRaw.segments.length === 0)}
          initialDurationSeconds={editing.focusSeconds} initialRating={editing.rating} initialNote={editing.note}
          busy={busy} error={err} onSubmit={onEditSave} onSecondary={() => { setEditing(null); setErr(""); }} />
      )}
      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  );
}
