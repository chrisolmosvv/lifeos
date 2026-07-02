import { useState } from "react";
import CategoryPicker from "../kit/CategoryPicker";
import CategoryTag from "../CategoryTag";
import { loadPrefs, savePrefs } from "./focusPrefs.js";

// Setup (surface 2, spec §3/§L) — a centred, zero-scroll column: the subject, the
// mode toggle (count-up / count-down / intervals), the relevant length fields, then
// Start. Remembers the last mode + durations. The SUBJECT is a task (only when
// arrived via ▶ prefill — piece 5), an optional category (drill-in picker), or
// no-label; there is no in-Setup task browser (spec §2: ▶ lives in the task form).
//
// Props: prefill? { task_id, task_title_snapshot, category_id, category_snapshot },
//        cats, inboxColor, busy, onStart(fields), onCancel().
const MODES = [
  { id: "count_up", label: "Count up" },
  { id: "count_down", label: "Count down" },
  { id: "intervals", label: "Intervals" },
];

export default function Setup({ prefill, cats, inboxColor, busy, onStart, onCancel }) {
  const prefs = loadPrefs();
  const [mode, setMode] = useState(prefs.mode);
  const [downMin, setDownMin] = useState(prefs.downMinutes);
  const [focusMin, setFocusMin] = useState(prefs.focusMinutes);
  const [breakMin, setBreakMin] = useState(prefs.breakMinutes);
  const [taskId, setTaskId] = useState(prefill?.task_id ?? null);
  const [taskTitle] = useState(prefill?.task_title_snapshot ?? null);
  const [categoryId, setCategoryId] = useState(prefill?.category_id ?? null);
  const [showPick, setShowPick] = useState(false);
  const [err, setErr] = useState("");

  const selectedCat = categoryId ? cats.find((c) => c.id === categoryId) : null;

  function start() {
    let target_seconds = null, break_seconds = null;
    if (mode === "count_down") {
      const s = Math.round(Number(downMin) * 60);
      if (!(s > 0)) return setErr("Set how long to count down.");
      target_seconds = s;
    } else if (mode === "intervals") {
      const f = Math.round(Number(focusMin) * 60);
      const b = Math.round(Number(breakMin) * 60);
      if (!(f > 0) || !(b > 0)) return setErr("Set both a focus and a break length.");
      target_seconds = f; break_seconds = b;
    }
    savePrefs({ mode, downMinutes: Number(downMin), focusMinutes: Number(focusMin), breakMinutes: Number(breakMin) });
    const snap = selectedCat ? { id: selectedCat.id, name: selectedCat.name, color: selectedCat.color ?? null } : (taskId ? prefill?.category_snapshot ?? null : null);
    onStart({
      mode, target_seconds, break_seconds,
      task_id: taskId, task_title_snapshot: taskId ? taskTitle : null,
      category_id: taskId ? (prefill?.category_id ?? categoryId) : categoryId,
      category_snapshot: snap,
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
      <h2 className="focus-setup-title">Set up your session</h2>

      <div className="focus-field">
        <span className="focus-label">Focusing on</span>
        {taskId ? (
          <div className="focus-subject-chip">
            <span className="focus-subject-task">{taskTitle}</span>
            <button className="focus-chip-x" onClick={() => setTaskId(null)} aria-label="Clear task">×</button>
          </div>
        ) : (
          <button className="focus-catbtn" onClick={() => setShowPick(true)}>
            {selectedCat
              ? <CategoryTag name={selectedCat.name} color={selectedCat.color} />
              : <span className="focus-nolabel">No label — pick a category (optional)</span>}
            <span className="focus-chev">›</span>
          </button>
        )}
      </div>

      <div className="focus-field">
        <span className="focus-label">Mode</span>
        <div className="focus-modes" role="tablist" aria-label="Timer mode">
          {MODES.map((mo) => (
            <button key={mo.id} role="tab" aria-selected={mode === mo.id}
              className={"focus-mode" + (mode === mo.id ? " is-on" : "")} onClick={() => setMode(mo.id)}>
              {mo.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "count_down" && (
        <div className="focus-field">
          <span className="focus-label">Length</span>
          <div className="focus-mins"><input type="number" min="1" inputMode="numeric" value={downMin}
            onChange={(e) => setDownMin(e.target.value)} /><span>minutes</span></div>
        </div>
      )}
      {mode === "intervals" && (
        <div className="focus-field">
          <span className="focus-label">Intervals</span>
          <div className="focus-mins"><input type="number" min="1" inputMode="numeric" value={focusMin}
            onChange={(e) => setFocusMin(e.target.value)} /><span>min focus</span></div>
          <div className="focus-mins"><input type="number" min="1" inputMode="numeric" value={breakMin}
            onChange={(e) => setBreakMin(e.target.value)} /><span>min break</span></div>
        </div>
      )}

      {err && <p className="focus-err">{err}</p>}

      <div className="focus-setup-actions">
        <button className="focus-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="focus-btn-start" onClick={start} disabled={busy}>Start</button>
      </div>
    </div>
  );
}
