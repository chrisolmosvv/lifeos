import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { INBOX_COLOR } from "../palette";
import { amsTodayYMD } from "../gym/gymDates.js";
import { fetchSessions } from "./focusLoad.js";
import { dayLedger } from "./focusCalc.js";
import { finalizeSession, archiveSession, unarchiveSession, markTaskDone } from "./focusWrite.js";
import { useFocusSession } from "./useFocusSession.js";
import Setup from "./Setup";
import InFocus from "./InFocus";
import SaveCard from "./SaveCard";
import SessionList from "./SessionList";
import Toast from "../kit/Toast";
import "./focus.css";

// FocusPage — the Focus pillar shell (piece 2). Hosts the write loop: the home
// scaffold (Start a session + today's list) → Setup → In-focus → the save card.
// The real Overview dial + ledger arrive in piece 3 and replace the home scaffold.
const isInbox = (c) => c.parent_id == null && c.name === "Inbox";

export default function FocusPage() {
  const fs = useFocusSession();
  const [cats, setCats] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [view, setView] = useState("home"); // 'home' | 'setup' (only while idle)
  const [editing, setEditing] = useState(null); // a today-row being edited
  const [busy, setBusy] = useState(false);
  const [cardError, setCardError] = useState("");
  const [toast, setToast] = useState(null);

  const today = amsTodayYMD();
  const inboxColor = cats.find(isInbox)?.color || INBOX_COLOR;
  const rows = dayLedger(rawRows, today);

  const refresh = useCallback(async () => {
    const now = Date.now();
    const data = await fetchSessions(new Date(now - 2 * 86400000).toISOString(), new Date(now + 86400000).toISOString());
    setRawRows(data);
  }, []);

  useEffect(() => {
    supabase.from("categories").select("id, name, parent_id, color, sort_order").is("archived_at", null)
      .then(({ data }) => setCats(data || []));
    refresh();
  }, [refresh]);

  const subjectLabel = (s) => s?.task_title_snapshot || s?.category_snapshot?.name || "No label";

  async function onStart(fields) {
    setBusy(true); setCardError("");
    try { await fs.start(fields); setView("home"); }
    catch (e) { setCardError(e.message || "Couldn't start."); }
    finally { setBusy(false); }
  }

  async function onSave(form) {
    setBusy(true); setCardError("");
    try { await fs.save(form); await refresh(); }
    catch (e) { setCardError(e.message || "Couldn't save — check your connection and try again."); }
    finally { setBusy(false); }
  }

  async function onDiscard() {
    setBusy(true);
    try { await fs.discard(); await refresh(); } finally { setBusy(false); }
  }

  async function onEditSave(form) {
    const raw = rawRows.find((r) => r.id === editing.id);
    const simple = raw && raw.mode !== "intervals" && (!raw.segments || raw.segments.length === 0);
    setBusy(true); setCardError("");
    try {
      const patch = { rating: form.rating ?? null, note: form.note?.trim() || null };
      if (simple) patch.ended_at = new Date(new Date(raw.started_at).getTime() + form.durationSeconds * 1000).toISOString();
      if (form.markDone && raw?.task_id) await markTaskDone(raw.task_id);
      await finalizeSession(editing.id, patch);
      setEditing(null); await refresh();
    } catch (e) { setCardError(e.message || "Couldn't save."); }
    finally { setBusy(false); }
  }

  async function onDelete(row) {
    setBusy(true);
    try {
      await archiveSession(row.id); await refresh();
      setToast({ text: "Session deleted", onUndo: async () => { await unarchiveSession(row.id); setToast(null); await refresh(); } });
    } finally { setBusy(false); }
  }

  // ── Render by status ──────────────────────────────────────────────────────────
  let body;
  if (fs.status === "loading") {
    body = <p className="focus-empty">Loading…</p>;
  } else if (fs.status === "stale") {
    body = (
      <div className="focus-card focus-card--inline">
        <h3 className="focus-card-title">A session's still running</h3>
        <p className="focus-card-subject">Started {new Date(fs.staleRow.started_at).toLocaleString()} — finish it or discard it.</p>
        <div className="focus-card-actions">
          <button className="focus-btn-ghost focus-btn-danger" onClick={() => fs.resolveStale("discard")}>Discard</button>
          <button className="focus-btn-start" onClick={() => fs.resolveStale("finalise")}>Finish &amp; save</button>
        </div>
      </div>
    );
  } else if (fs.status === "running" || fs.status === "paused" || (fs.status === "saving" && fs.session)) {
    body = (
      <InFocus live={fs.live} subjectLabel={subjectLabel(fs.session)} paused={fs.status === "paused"}
        onPause={fs.pause} onResume={fs.resume} onStop={fs.stop} />
    );
  } else if (view === "setup") {
    body = <Setup cats={cats} inboxColor={inboxColor} busy={busy} onStart={onStart} onCancel={() => setView("home")} />;
  } else {
    body = (
      <div className="focus-home">
        <div className="focus-home-head">
          <h2 className="focus-home-title">Focus</h2>
          <button className="focus-btn-start" onClick={() => setView("setup")}>Start a session</button>
        </div>
        <SessionList rows={rows} busy={busy} onEdit={setEditing} onDelete={onDelete} />
      </div>
    );
  }

  const editRaw = editing && rawRows.find((r) => r.id === editing.id);

  return (
    <div className="focus-page">
      {body}

      {fs.status === "saving" && fs.pending && (
        <SaveCard
          title={subjectLabel(fs.pending.session)}
          taskId={fs.pending.session?.task_id}
          mode="save"
          durationEditable={fs.pending.simple}
          initialDurationSeconds={fs.pending.focusSeconds}
          busy={busy} error={cardError}
          onSubmit={onSave} onSecondary={onDiscard}
        />
      )}

      {editing && (
        <SaveCard
          title={editing.taskTitle || editing.categorySnapshot?.name || "No label"}
          taskId={editRaw?.task_id}
          mode="edit"
          durationEditable={editRaw && editRaw.mode !== "intervals" && (!editRaw.segments || editRaw.segments.length === 0)}
          initialDurationSeconds={editing.focusSeconds}
          initialRating={editing.rating} initialNote={editing.note}
          busy={busy} error={cardError}
          onSubmit={onEditSave} onSecondary={() => { setEditing(null); setCardError(""); }}
        />
      )}

      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  );
}
