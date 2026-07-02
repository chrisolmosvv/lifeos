import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { resolveColor } from "../colorModel";
import { colorHex, INBOX_COLOR } from "../palette";
import { amsTodayYMD } from "../gym/gymDates.js";
import { fetchSessions } from "./focusLoad.js";
import { ledgerAll } from "./focusCalc.js";
import { rangeBars, weekVsTrailingAvg } from "./focusTrend.js";
import { finalizeSession, archiveSession, unarchiveSession, markTaskDone, addManualSession } from "./focusWrite.js";
import { takePendingFocus } from "./focusNav.js";
import { fetchGoals } from "../health/healthLoad.js";
import { resolveGoals } from "../health/healthGoals.js";
import { setGoal, clearGoal } from "../health/healthGoalsWrite.js";
import { useFocusSession } from "./useFocusSession.js";
import Setup from "./Setup";
import ManualEntry from "./ManualEntry";
import InFocus from "./InFocus";
import SaveCard from "./SaveCard";
import FocusOverview from "./FocusOverview";
import RangeView from "./RangeView";
import FullLedgerPage from "./FullLedgerPage";
import FocusGoalsEditor from "./FocusGoalsEditor";
import RangeSwitcher from "../kit/RangeSwitcher";
import Popover from "../kit/Popover";
import Toast from "../kit/Toast";
import "./focus.css";
import "./focusOverview.css";

// FocusPage — the Focus pillar shell (pieces 2+3). Hosts the write loop (Setup →
// In-focus → save card) AND the read Overview (dial + ledger + week strip + range).
const isInbox = (c) => c.parent_id == null && c.name === "Inbox";
const RANGES = [
  { id: "today", label: "Today" }, { id: "week", label: "Week" },
  { id: "month", label: "Month" }, { id: "ninety", label: "90d" },
];

export default function FocusPage() {
  const fs = useFocusSession();
  const [cats, setCats] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [goals, setGoals] = useState(new Map());
  const [view, setView] = useState("overview"); // 'overview' | 'setup' | 'manual' | 'full'
  const [range, setRange] = useState("today");
  const [filterCat, setFilterCat] = useState(null);
  const [prefill, setPrefill] = useState(null); // task prefill for Setup / manual (from ▶)
  const [fullTaskFilter, setFullTaskFilter] = useState(null); // see-all filtered to a task
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cardError, setCardError] = useState("");
  const [toast, setToast] = useState(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const goalsRef = useRef(null);

  const today = amsTodayYMD();
  const now = Date.now();
  const byId = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const colorFor = useCallback((id) => {
    if (!id) return "var(--ink-muted)";
    const c = byId.get(id);
    return c ? resolveColor(c, byId) : (colorHex(INBOX_COLOR) || "#9A9384");
  }, [byId]);
  const dailySeconds = goals.get("focus_daily")?.target_value ?? null;
  const weeklySeconds = goals.get("focus_weekly")?.target_value ?? null;

  const refresh = useCallback(async () => {
    const t = Date.now();
    setRawRows(await fetchSessions(new Date(t - 100 * 86400000).toISOString(), new Date(t + 86400000).toISOString()));
  }, []);
  const refreshGoals = useCallback(async () => setGoals(resolveGoals(await fetchGoals())), []);

  useEffect(() => {
    supabase.from("categories").select("id, name, parent_id, color, sort_order").is("archived_at", null)
      .then(({ data }) => setCats(data || []));
    refresh(); refreshGoals();
  }, [refresh, refreshGoals]);

  // Consume a parked ▶ / add-past / see-all request (routed from a task form).
  useEffect(() => {
    const apply = (p) => {
      if (!p) return;
      if (p.mode === "manual") { setPrefill(p.prefill || null); setView("manual"); }
      else if (p.mode === "full") { setFullTaskFilter(p.taskId || null); setView("full"); }
      else { setPrefill(p.prefill || null); setView("setup"); }
    };
    apply(takePendingFocus());
    const h = () => apply(takePendingFocus());
    window.addEventListener("lifeos:focus-open", h);
    return () => window.removeEventListener("lifeos:focus-open", h);
  }, []);

  const subjectLabel = (s) => s?.task_title_snapshot || s?.category_snapshot?.name || "No label";

  async function onStart(fields) {
    setBusy(true); setCardError("");
    try { await fs.start(fields); setPrefill(null); setView("overview"); }
    catch (e) { setCardError(e.message || "Couldn't start."); } finally { setBusy(false); }
  }
  async function onManualSubmit(fields) {
    setBusy(true); setCardError("");
    try { await addManualSession(fields); setPrefill(null); setView("overview"); await refresh(); }
    catch (e) { setCardError(e.message || "Couldn't add — check your connection."); } finally { setBusy(false); }
  }
  async function onSave(form) {
    setBusy(true); setCardError("");
    try { await fs.save(form); await refresh(); }
    catch (e) { setCardError(e.message || "Couldn't save — check your connection and try again."); } finally { setBusy(false); }
  }
  async function onDiscard() { setBusy(true); try { await fs.discard(); await refresh(); } finally { setBusy(false); } }

  async function onEditSave(form) {
    const raw = rawRows.find((r) => r.id === editing.id);
    const simple = raw && raw.mode !== "intervals" && (!raw.segments || raw.segments.length === 0);
    setBusy(true); setCardError("");
    try {
      const patch = { rating: form.rating ?? null, note: form.note?.trim() || null };
      if (simple) patch.ended_at = new Date(new Date(raw.started_at).getTime() + form.durationSeconds * 1000).toISOString();
      if (form.markDone && raw?.task_id) await markTaskDone(raw.task_id);
      await finalizeSession(editing.id, patch); setEditing(null); await refresh();
    } catch (e) { setCardError(e.message || "Couldn't save."); } finally { setBusy(false); }
  }
  async function onDelete(row) {
    setBusy(true);
    try {
      await archiveSession(row.id); await refresh();
      setToast({ text: "Session deleted", onUndo: async () => { await unarchiveSession(row.id); setToast(null); await refresh(); } });
    } finally { setBusy(false); }
  }
  async function onSaveGoals(list) { for (const g of list) await setGoal(g); setGoalsOpen(false); await refreshGoals(); }
  async function onClearGoals() { await clearGoal("focus_daily"); await clearGoal("focus_weekly"); setGoalsOpen(false); await refreshGoals(); }

  const pickCat = (id) => setFilterCat((cur) => (cur === id ? null : id));
  const editRaw = editing && rawRows.find((r) => r.id === editing.id);

  // ── Body by status/view ─────────────────────────────────────────────────────
  let body;
  if (fs.status === "loading") body = <p className="focus-empty">Loading…</p>;
  else if (fs.status === "stale")
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
  else if (fs.status === "running" || fs.status === "paused" || (fs.status === "saving" && fs.session))
    body = <InFocus live={fs.live} subjectLabel={subjectLabel(fs.session)} paused={fs.status === "paused"} onPause={fs.pause} onResume={fs.resume} onStop={fs.stop} />;
  else if (view === "setup")
    body = <Setup prefill={prefill} cats={cats} inboxColor={cats.find(isInbox)?.color || INBOX_COLOR} busy={busy}
      onStart={onStart} onCancel={() => { setPrefill(null); setView("overview"); }} />;
  else if (view === "manual")
    body = <ManualEntry prefill={prefill} cats={cats} inboxColor={cats.find(isInbox)?.color || INBOX_COLOR} busy={busy}
      onSubmit={onManualSubmit} onCancel={() => { setPrefill(null); setView("overview"); }} />;
  else if (view === "full")
    body = <FullLedgerPage rows={ledgerAll(rawRows)} colorFor={colorFor} busy={busy} initialTaskFilter={fullTaskFilter}
      onBack={() => { setFullTaskFilter(null); setView("overview"); }} onEdit={setEditing} onDelete={onDelete} />;
  else
    body = (
      <div className="focus-overview">
        <div className="focus-ovw-top">
          <div className="focus-ovw-actions">
            <button className="focus-btn-start" onClick={() => { setPrefill(null); setView("setup"); }}>Start a session</button>
            <button className="focus-linkbtn" onClick={() => { setPrefill(null); setView("manual"); }}>Add past</button>
            <button ref={goalsRef} className="focus-linkbtn" onClick={() => setGoalsOpen(true)}>Targets</button>
          </div>
          <RangeSwitcher ranges={RANGES} value={range} onChange={setRange} ariaLabel="Focus range" />
        </div>
        {range === "today" ? (
          <FocusOverview rawRows={rawRows} today={today} now={now} colorFor={colorFor}
            filterCat={filterCat} onPickCategory={pickCat} onClear={() => setFilterCat(null)}
            onSeeAll={() => setView("full")} dailySeconds={dailySeconds} weeklySeconds={weeklySeconds}
            onSetTarget={() => setGoalsOpen(true)} />
        ) : (
          <RangeView data={rangeBars(rawRows, { range, now })} trend={weekVsTrailingAvg(rawRows, { now })}
            colorFor={colorFor} range={range} filterCat={filterCat} onPickCategory={pickCat} />
        )}
      </div>
    );

  return (
    <div className="focus-page">
      {body}

      {fs.status === "saving" && fs.pending && (
        <SaveCard title={subjectLabel(fs.pending.session)} taskId={fs.pending.session?.task_id} mode="save"
          durationEditable={fs.pending.simple} initialDurationSeconds={fs.pending.focusSeconds}
          busy={busy} error={cardError} onSubmit={onSave} onSecondary={onDiscard} />
      )}
      {editing && (
        <SaveCard title={editing.taskTitle || editing.categorySnapshot?.name || "No label"} taskId={editRaw?.task_id} mode="edit"
          durationEditable={editRaw && editRaw.mode !== "intervals" && (!editRaw.segments || editRaw.segments.length === 0)}
          initialDurationSeconds={editing.focusSeconds} initialRating={editing.rating} initialNote={editing.note}
          busy={busy} error={cardError} onSubmit={onEditSave} onSecondary={() => { setEditing(null); setCardError(""); }} />
      )}
      {goalsOpen && (
        <Popover anchorRef={goalsRef} title="Focus targets" onClose={() => setGoalsOpen(false)}>
          <FocusGoalsEditor dailySeconds={dailySeconds} weeklySeconds={weeklySeconds}
            onSubmit={onSaveGoals} onClearAll={onClearGoals} onClose={() => setGoalsOpen(false)} />
        </Popover>
      )}
      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  );
}
